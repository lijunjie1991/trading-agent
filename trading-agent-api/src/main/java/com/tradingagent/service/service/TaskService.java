package com.tradingagent.service.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tradingagent.service.common.ResultCode;
import com.tradingagent.service.dto.PageResponse;
import com.tradingagent.service.dto.PricingQuote;
import com.tradingagent.service.dto.StripeCheckoutSession;
import com.tradingagent.service.dto.TaskQueryRequest;
import com.tradingagent.service.dto.TaskRequest;
import com.tradingagent.service.dto.TaskResponse;
import com.tradingagent.service.entity.Report;
import com.tradingagent.service.entity.Task;
import com.tradingagent.service.entity.TaskPayment;
import com.tradingagent.service.entity.User;
import com.tradingagent.service.entity.enums.PaymentStatus;
import com.tradingagent.service.exception.BusinessException;
import com.tradingagent.service.exception.ResourceNotFoundException;
import com.tradingagent.service.exception.UnauthorizedException;
import com.tradingagent.service.entity.TaskMessage;
import com.tradingagent.service.repository.ReportRepository;
import com.tradingagent.service.repository.TaskMessageRepository;
import com.tradingagent.service.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;
    private final ReportRepository reportRepository;
    private final TaskMessageRepository taskMessageRepository;
    private final PythonServiceClient pythonServiceClient;
    private final AuthService authService;
    private final ObjectMapper objectMapper;
    private final PricingService pricingService;
    private final TaskBillingService taskBillingService;
    private final TaskPaymentService taskPaymentService;
    private final StripeClient stripeClient;

    public TaskResponse submitTask(TaskRequest request) {
        User currentUser = authService.getCurrentUser();

        // Determine pricing and quota information
        var strategy = pricingService.getActiveStrategy();
        PricingQuote pricingQuote = pricingService.calculateQuote(
                strategy,
                request.getResearchDepth(),
                request.getSelectedAnalysts()
        );
        boolean hasFreeQuota = taskBillingService.hasRemainingFreeQuota(currentUser);
        int remainingFreeBefore = taskBillingService.getRemainingFreeQuota(currentUser);
        boolean zeroPriced = pricingQuote.getTotalAmount().compareTo(java.math.BigDecimal.ZERO) <= 0;
        boolean useFreeQuota = hasFreeQuota || zeroPriced;
        String pricingSnapshot = useFreeQuota ? null : taskBillingService.buildPricingSnapshot(pricingQuote);

        // Generate taskId first
        String taskId = java.util.UUID.randomUUID().toString();

        Task task = Task.builder()
                .taskId(taskId)
                .user(currentUser)
                .ticker(request.getTicker())
                .analysisDate(LocalDate.parse(request.getAnalysisDate()))
                .selectedAnalysts(toJson(request.getSelectedAnalysts()))
                .researchDepth(request.getResearchDepth())
                .status("PENDING")
                .paymentStatus(useFreeQuota ? PaymentStatus.FREE : PaymentStatus.AWAITING_PAYMENT)
                .billingAmount(useFreeQuota ? java.math.BigDecimal.ZERO : pricingQuote.getTotalAmount())
                .billingCurrency(strategy.getCurrency())
                .isFreeTask(useFreeQuota)
                .pricingSnapshot(pricingSnapshot)
                .build();

        task = taskRepository.save(task);
        log.info("Task created in database: {}", taskId);

        StripeCheckoutSession checkoutSession = null;

        if (useFreeQuota) {
            if (hasFreeQuota) {
                taskBillingService.consumeFreeQuota(currentUser);
            }
            try {
                submitTaskToEngine(task);
            } catch (BusinessException e) {
                if (hasFreeQuota) {
                    taskBillingService.restoreFreeQuota(currentUser);
                }
                task.setStatus("FAILED");
                task.setErrorMessage(e.getMessage());
                task.setCompletedAt(LocalDateTime.now());
                taskRepository.save(task);
                throw e;
            }
        } else {
            TaskPayment payment = taskPaymentService.initializePayment(task, pricingQuote, pricingSnapshot);
            checkoutSession = stripeClient.createCheckoutSession(task, pricingQuote, null, null);
            taskPaymentService.attachStripeSession(payment, checkoutSession.getSessionId(), checkoutSession.getPaymentIntentId());
            task.setStripeSessionId(checkoutSession.getSessionId());
            taskRepository.save(task);
        }

        TaskResponse response = toTaskResponse(task);
        response.setPaymentRequired(!useFreeQuota);
        response.setCheckoutSessionId(checkoutSession != null ? checkoutSession.getSessionId() : null);
        response.setCheckoutUrl(checkoutSession != null ? checkoutSession.getUrl() : null);
        response.setFreeQuotaTotal(currentUser.getFreeQuotaTotal());
        response.setFreeQuotaRemaining(taskBillingService.getRemainingFreeQuota(currentUser));
        response.setPaidTaskCount(currentUser.getPaidTaskCount());
        response.setPaymentStatus(task.getPaymentStatus().name());
        response.setBillingAmount(task.getBillingAmount());
        response.setBillingCurrency(task.getBillingCurrency());
        response.setFreeTask(task.getIsFreeTask());

        log.info("Task {} submission complete. Free quota before: {}, remaining: {}",
                taskId, remainingFreeBefore, response.getFreeQuotaRemaining());

        return response;
    }

    public TaskResponse retryPayment(String taskId) {
        User currentUser = authService.getCurrentUser();
        Task task = taskRepository.findByTaskId(taskId)
                .orElseThrow(() -> new ResourceNotFoundException(ResultCode.TASK_NOT_FOUND, "Task not found: " + taskId));

        if (!task.getUser().getId().equals(currentUser.getId())) {
            throw new UnauthorizedException(ResultCode.ACCESS_DENIED);
        }
        if (PaymentStatus.PAID.equals(task.getPaymentStatus()) || PaymentStatus.FREE.equals(task.getPaymentStatus())) {
            throw new BusinessException(ResultCode.INVALID_PARAMETER, "Task payment retry is not allowed for current status");
        }

        var strategy = pricingService.getActiveStrategy();
        var quote = pricingService.calculateQuote(
                strategy,
                task.getResearchDepth(),
                fromJson(task.getSelectedAnalysts())
        );
        String snapshot = taskBillingService.buildPricingSnapshot(quote);

        TaskPayment payment = taskPaymentService.initializePayment(task, quote, snapshot);
        StripeCheckoutSession checkoutSession = stripeClient.createCheckoutSession(task, quote, null, null);
        taskPaymentService.attachStripeSession(payment, checkoutSession.getSessionId(), checkoutSession.getPaymentIntentId());
        task.setStripeSessionId(checkoutSession.getSessionId());
        task.setErrorMessage(null);
        taskRepository.save(task);

        TaskResponse response = toTaskResponse(task);
        response.setPaymentRequired(true);
        response.setCheckoutSessionId(checkoutSession.getSessionId());
        response.setCheckoutUrl(checkoutSession.getUrl());
        response.setFreeQuotaTotal(currentUser.getFreeQuotaTotal());
        response.setFreeQuotaRemaining(taskBillingService.getRemainingFreeQuota(currentUser));
        response.setPaidTaskCount(currentUser.getPaidTaskCount());
        return response;
    }

    /**
     * Get user tasks with pagination and filtering
     */
    public PageResponse<TaskResponse> getUserTasksWithPagination(TaskQueryRequest queryRequest) {
        User currentUser = authService.getCurrentUser();

        // Validate and set defaults
        queryRequest.validate();

        // Create Pageable with sorting
        Sort sort = Sort.by(
            queryRequest.getSortOrder().equalsIgnoreCase("ASC") ? Sort.Direction.ASC : Sort.Direction.DESC,
            queryRequest.getSortBy()
        );
        Pageable pageable = PageRequest.of(queryRequest.getPage(), queryRequest.getPageSize(), sort);

        // Parse date filters
        LocalDate startDate = null;
        LocalDate endDate = null;
        if (queryRequest.getStartDate() != null && !queryRequest.getStartDate().trim().isEmpty()) {
            try {
                startDate = LocalDate.parse(queryRequest.getStartDate());
            } catch (Exception e) {
                log.warn("Invalid startDate format: {}", queryRequest.getStartDate());
            }
        }
        if (queryRequest.getEndDate() != null && !queryRequest.getEndDate().trim().isEmpty()) {
            try {
                endDate = LocalDate.parse(queryRequest.getEndDate());
            } catch (Exception e) {
                log.warn("Invalid endDate format: {}", queryRequest.getEndDate());
            }
        }

        // Query with filters
        Page<Task> taskPage = taskRepository.findTasksWithFilters(
            currentUser.getId(),
            queryRequest.getStatus(),
            queryRequest.getTicker(),
            queryRequest.getTaskId(),
            startDate,
            endDate,
            queryRequest.getSearchKeyword(),
            pageable
        );

        // Convert to PageResponse
        Page<TaskResponse> responsePage = taskPage.map(this::toTaskResponse);
        return PageResponse.of(responsePage);
    }

    public TaskResponse getTaskById(String taskId) {
        Task task = taskRepository.findByTaskId(taskId)
                .orElseThrow(() -> new ResourceNotFoundException(ResultCode.TASK_NOT_FOUND, "Task not found: " + taskId));

        User currentUser = authService.getCurrentUser();
        if (!task.getUser().getId().equals(currentUser.getId())) {
            throw new UnauthorizedException(ResultCode.ACCESS_DENIED);
        }

        return toTaskResponse(task);
    }

    public List<Map<String, Object>> getTaskReports(String taskId) {
        Task task = taskRepository.findByTaskId(taskId)
                .orElseThrow(() -> new ResourceNotFoundException(ResultCode.TASK_NOT_FOUND, "Task not found: " + taskId));

        User currentUser = authService.getCurrentUser();
        if (!task.getUser().getId().equals(currentUser.getId())) {
            throw new UnauthorizedException(ResultCode.ACCESS_DENIED);
        }

        List<Report> reports = reportRepository.findByTaskIdOrderByCreatedAtAsc(task.getId());
        return reports.stream()
                .map(report -> {
                    Map<String, Object> map = new java.util.HashMap<>();
                    map.put("id", report.getId());
                    map.put("reportType", report.getReportType());
                    map.put("content", report.getContent());
                    map.put("createdAt", report.getCreatedAt());
                    return map;
                })
                .collect(Collectors.toList());
    }

    public Map<String, Long> getTaskStats() {
        User currentUser = authService.getCurrentUser();

        // Use single database query with GROUP BY for better performance
        List<Object[]> statusCounts = taskRepository.countTasksByStatusGrouped(currentUser.getId());

        // Initialize all counters to 0
        Map<String, Long> stats = new java.util.HashMap<>();
        stats.put("total", 0L);
        stats.put("pending", 0L);
        stats.put("running", 0L);
        stats.put("completed", 0L);
        stats.put("failed", 0L);

        // Process results and calculate total
        long total = 0L;
        for (Object[] row : statusCounts) {
            String status = (String) row[0];
            Long count = (Long) row[1];
            total += count;

            // Map status to lowercase for consistency
            if (status != null) {
                stats.put(status.toLowerCase(), count);
            }
        }

        stats.put("total", total);
        return stats;
    }

    public List<Map<String, Object>> getTaskMessages(String taskId, String lastTimestamp) {
        Task task = taskRepository.findByTaskId(taskId)
                .orElseThrow(() -> new ResourceNotFoundException(ResultCode.TASK_NOT_FOUND, "Task not found: " + taskId));

        User currentUser = authService.getCurrentUser();
        if (!task.getUser().getId().equals(currentUser.getId())) {
            throw new UnauthorizedException(ResultCode.ACCESS_DENIED);
        }

        List<TaskMessage> messages;
        if (lastTimestamp != null && !lastTimestamp.isEmpty()) {
            // Incremental query：Get only new messages（Descending order，Latest first）
            // Parse ISO 8601 format (with or without timezone)
            LocalDateTime timestamp;
            try {
                // Try parsing with timezone first (e.g., "2025-10-20T14:14:35.000Z")
                timestamp = OffsetDateTime.parse(lastTimestamp, DateTimeFormatter.ISO_OFFSET_DATE_TIME)
                        .toLocalDateTime();
            } catch (Exception e) {
                // Fall back to parsing without timezone (e.g., "2025-10-20T14:14:35")
                timestamp = LocalDateTime.parse(lastTimestamp, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
            }
            messages = taskMessageRepository.findByTaskIdAndCreatedAtGreaterThanOrderByCreatedAtDesc(
                    task.getId(), timestamp);
        } else {
            // Full query：Get all messages（Descending order，Latest first）
            messages = taskMessageRepository.findByTaskIdOrderByCreatedAtDesc(task.getId());
        }

        return messages.stream()
                .map(message -> {
                    Map<String, Object> map = new java.util.HashMap<>();
                    map.put("id", message.getId());
                    map.put("messageType", message.getMessageType());
                    map.put("content", message.getContent());
                    map.put("createdAt", message.getCreatedAt());
                    return map;
                })
                .collect(Collectors.toList());
    }

    private void submitTaskToEngine(Task task) {
        try {
            Map<String, Object> pythonResponse = pythonServiceClient
                    .submitAnalysisTask(
                            task.getTaskId(),
                            task.getTicker(),
                            task.getAnalysisDate().toString(),
                            fromJson(task.getSelectedAnalysts()),
                            task.getResearchDepth()
                    )
                    .block();

            if (pythonResponse == null) {
                throw new BusinessException(ResultCode.PYTHON_SERVICE_ERROR, "Python service returned empty response");
            }
            log.info("Task {} submitted to Python service", task.getTaskId());
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception e) {
            log.error("Failed to submit task {} to Python service: {}", task.getTaskId(), e.getMessage());
            throw new BusinessException(ResultCode.PYTHON_SERVICE_ERROR,
                    "Failed to submit task to Python service: " + e.getMessage());
        }
    }

    public boolean dispatchPaidTask(Task task) {
        try {
            submitTaskToEngine(task);
            return true;
        } catch (BusinessException e) {
            task.setStatus("FAILED");
            task.setErrorMessage(e.getMessage());
            task.setCompletedAt(LocalDateTime.now());
            taskRepository.save(task);
            return false;
        }
    }

    private TaskResponse toTaskResponse(Task task) {
        List<String> analysts = task.getSelectedAnalysts() != null
                ? fromJson(task.getSelectedAnalysts())
                : java.util.Collections.emptyList();

        boolean requiresPayment = false;
        if (task.getPaymentStatus() != null) {
            requiresPayment = switch (task.getPaymentStatus()) {
                case AWAITING_PAYMENT, PAYMENT_FAILED, PAYMENT_EXPIRED -> true;
                default -> false;
            };
        }

        return TaskResponse.builder()
                .id(task.getId())
                .taskId(task.getTaskId())
                .ticker(task.getTicker())
                .analysisDate(task.getAnalysisDate().toString())
                .selectedAnalysts(analysts)
                .researchDepth(task.getResearchDepth())
                .status(task.getStatus())
                .finalDecision(task.getFinalDecision())
                .errorMessage(task.getErrorMessage())
                .createdAt(task.getCreatedAt())
                .completedAt(task.getCompletedAt())
                .toolCalls(task.getToolCalls())
                .llmCalls(task.getLlmCalls())
                .reports(task.getReports())
                .paymentStatus(task.getPaymentStatus() != null ? task.getPaymentStatus().name() : null)
                .billingAmount(task.getBillingAmount())
                .billingCurrency(task.getBillingCurrency())
                .freeTask(task.getIsFreeTask())
                .paymentRequired(requiresPayment)
                .checkoutSessionId(task.getStripeSessionId())
                .build();
    }

    private String toJson(List<String> list) {
        if (list == null) {
            return "[]";
        }
        try {
            return objectMapper.writeValueAsString(list);
        } catch (JsonProcessingException e) {
            throw new BusinessException(ResultCode.INTERNAL_SERVER_ERROR, "Failed to serialize list");
        }
    }

    @SuppressWarnings("unchecked")
    private List<String> fromJson(String json) {
        if (json == null || json.isBlank()) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(json, List.class);
        } catch (JsonProcessingException e) {
            throw new BusinessException(ResultCode.INTERNAL_SERVER_ERROR, "Failed to deserialize list");
        }
    }
}
