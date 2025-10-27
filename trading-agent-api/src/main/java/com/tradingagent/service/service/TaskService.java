package com.tradingagent.service.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tradingagent.service.common.ChargeType;
import com.tradingagent.service.common.ResultCode;
import com.tradingagent.service.common.TaskPaymentStatus;
import com.tradingagent.service.dto.BillingProfileResponse;
import com.tradingagent.service.dto.PageResponse;
import com.tradingagent.service.dto.PricingCalculationResult;
import com.tradingagent.service.dto.TaskPaymentInfo;
import com.tradingagent.service.dto.TaskPriceQuoteRequest;
import com.tradingagent.service.dto.TaskPriceQuoteResponse;
import com.tradingagent.service.dto.TaskQueryRequest;
import com.tradingagent.service.dto.TaskRequest;
import com.tradingagent.service.dto.TaskResponse;
import com.tradingagent.service.dto.TaskSubmissionResult;
import com.tradingagent.service.dto.UserQuotaInfo;
import com.tradingagent.service.entity.Report;
import com.tradingagent.service.entity.Task;
import com.tradingagent.service.entity.TaskMessage;
import com.tradingagent.service.entity.User;
import com.tradingagent.service.entity.UserQuota;
import com.tradingagent.service.entity.PricingStrategy;
import com.tradingagent.service.exception.BusinessException;
import com.tradingagent.service.exception.ResourceNotFoundException;
import com.tradingagent.service.exception.UnauthorizedException;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;
    private final ReportRepository reportRepository;
    private final TaskMessageRepository taskMessageRepository;
    private final AuthService authService;
    private final ObjectMapper objectMapper;
    private final PricingService pricingService;
    private final QuotaService quotaService;
    private final PaymentService paymentService;
    private final TaskExecutionService taskExecutionService;
    private final StripePaymentService stripePaymentService;
    private final BillingService billingService;

    public TaskSubmissionResult submitTask(TaskRequest request) {
        User currentUser = authService.getCurrentUser();

        TaskRequest sanitizedRequest = sanitizeRequest(request);
        PricingStrategy strategy = pricingService.getActiveStrategy(sanitizedRequest.getPricingStrategyCode());
        PricingCalculationResult calculation = pricingService.calculatePrice(
                strategy,
                sanitizedRequest.getResearchDepth(),
                sanitizedRequest.getSelectedAnalysts()
        );

        boolean consumedFree = quotaService.consumeFreeQuotaIfAvailable(currentUser, strategy);

        Task task = buildAndPersistTask(currentUser, sanitizedRequest, calculation, consumedFree);

        TaskPaymentInfo paymentInfo;

        if (consumedFree) {
            paymentInfo = TaskPaymentInfo.builder()
                    .required(false)
                    .amountCents(0)
                    .currency(task.getCurrency())
                    .pricingStrategyCode(calculation.getStrategyCode())
                    .pricingBreakdown(calculation.getPricingSnapshot())
                    .build();

            taskExecutionService.submitTaskToPython(
                    task,
                    sanitizedRequest.getTicker(),
                    sanitizedRequest.getAnalysisDate(),
                    sanitizedRequest.getSelectedAnalysts(),
                    sanitizedRequest.getResearchDepth()
            );
        } else {
            paymentInfo = paymentService.initiatePayment(
                    currentUser,
                    task,
                    strategy,
                    calculation
            );
        }

        UserQuota quotaSnapshot = quotaService.getQuotaSnapshot(currentUser, strategy);

        Task freshTask = taskRepository.findById(task.getId()).orElse(task);

        return TaskSubmissionResult.builder()
                .task(toTaskResponse(freshTask))
                .payment(paymentInfo)
                .quota(toQuotaInfo(quotaSnapshot, consumedFree))
                .build();
    }

    public TaskPriceQuoteResponse quoteTask(TaskPriceQuoteRequest request) {
        return billingService.quoteTask(request);
    }

    public BillingProfileResponse getBillingProfile() {
        return billingService.getBillingProfile();
    }

    public PageResponse<TaskResponse> getUserTasksWithPagination(TaskQueryRequest queryRequest) {
        User currentUser = authService.getCurrentUser();

        queryRequest.validate();

        Sort sort = Sort.by(
                queryRequest.getSortOrder().equalsIgnoreCase("ASC") ? Sort.Direction.ASC : Sort.Direction.DESC,
                queryRequest.getSortBy()
        );
        Pageable pageable = PageRequest.of(queryRequest.getPage(), queryRequest.getPageSize(), sort);

        LocalDate startDate = parseDateSafely(queryRequest.getStartDate());
        LocalDate endDate = parseDateSafely(queryRequest.getEndDate());

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
                    Map<String, Object> map = new HashMap<>();
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

        List<Object[]> statusCounts = taskRepository.countTasksByStatusGrouped(currentUser.getId());

        Map<String, Long> stats = new HashMap<>();
        stats.put("total", 0L);
        stats.put("pending", 0L);
        stats.put("running", 0L);
        stats.put("completed", 0L);
        stats.put("failed", 0L);
        stats.put("waiting_payment", 0L);

        long total = 0L;
        for (Object[] row : statusCounts) {
            String status = (String) row[0];
            Long count = (Long) row[1];
            total += count;
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
            LocalDateTime timestamp = parseTimestamp(lastTimestamp);
            messages = taskMessageRepository.findByTaskIdAndCreatedAtGreaterThanOrderByCreatedAtDesc(
                    task.getId(), timestamp);
        } else {
            messages = taskMessageRepository.findByTaskIdOrderByCreatedAtDesc(task.getId());
        }

        return messages.stream()
                .map(message -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", message.getId());
                    map.put("messageType", message.getMessageType());
                    map.put("content", message.getContent());
                    map.put("createdAt", message.getCreatedAt());
                    return map;
                })
                .collect(Collectors.toList());
    }

    private Task buildAndPersistTask(User user,
                                     TaskRequest request,
                                     PricingCalculationResult calculation,
                                     boolean consumedFree) {
        String taskId = UUID.randomUUID().toString();
        LocalDate analysisDate = LocalDate.parse(request.getAnalysisDate());

        Task task = Task.builder()
                .taskId(taskId)
                .user(user)
                .ticker(request.getTicker())
                .analysisDate(analysisDate)
                .selectedAnalysts(writeJsonValue(request.getSelectedAnalysts()))
                .researchDepth(request.getResearchDepth())
                .status(consumedFree ? "PENDING" : "WAITING_PAYMENT")
                .paymentStatus(consumedFree ? TaskPaymentStatus.FREE_GRANTED.value() : TaskPaymentStatus.WAITING_PAYMENT.value())
                .chargeType(consumedFree ? ChargeType.FREE.value() : ChargeType.ONE_TIME.value())
                .pricingStrategyCode(calculation.getStrategyCode())
                .pricingSnapshot(writeJsonValue(calculation.getPricingSnapshot()))
                .amountCents(consumedFree ? 0 : calculation.getFinalAmountCents())
                .currency(stripePaymentService.getCurrency())
                .build();

        Task saved = taskRepository.save(task);
        log.info("Task {} created for user {} with status {}", saved.getTaskId(), user.getId(), saved.getStatus());
        return saved;
    }

    private TaskRequest sanitizeRequest(TaskRequest request) {
        request.setTicker(request.getTicker().trim().toUpperCase());
        request.setAnalysisDate(request.getAnalysisDate().trim());
        return request;
    }

    private LocalDate parseDateSafely(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        try {
            return LocalDate.parse(value);
        } catch (Exception e) {
            log.warn("Invalid date format: {}", value);
            return null;
        }
    }

    private LocalDateTime parseTimestamp(String timestamp) {
        try {
            return OffsetDateTime.parse(timestamp, DateTimeFormatter.ISO_OFFSET_DATE_TIME).toLocalDateTime();
        } catch (Exception e) {
            return LocalDateTime.parse(timestamp, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        }
    }

    private TaskResponse toTaskResponse(Task task) {
        return TaskResponse.builder()
                .id(task.getId())
                .taskId(task.getTaskId())
                .ticker(task.getTicker())
                .analysisDate(task.getAnalysisDate().toString())
                .selectedAnalysts(readAnalysts(task.getSelectedAnalysts()))
                .researchDepth(task.getResearchDepth())
                .status(task.getStatus())
                .finalDecision(task.getFinalDecision())
                .errorMessage(task.getErrorMessage())
                .createdAt(task.getCreatedAt())
                .completedAt(task.getCompletedAt())
                .toolCalls(task.getToolCalls())
                .llmCalls(task.getLlmCalls())
                .reports(task.getReports())
                .paymentStatus(task.getPaymentStatus())
                .paymentIntentId(task.getPaymentIntentId())
                .amountCents(task.getAmountCents())
                .currency(task.getCurrency())
                .chargeType(task.getChargeType())
                .pricingStrategyCode(task.getPricingStrategyCode())
                .pricingSnapshot(readPricingSnapshot(task.getPricingSnapshot()))
                .paidAt(task.getPaidAt())
                .queuedAt(task.getQueuedAt())
                .build();
    }

    private UserQuotaInfo toQuotaInfo(UserQuota quota, boolean consumedFree) {
        int remaining = Math.max(quota.getFreeTasksTotal() - quota.getFreeTasksUsed(), 0);
        return UserQuotaInfo.builder()
                .freeTasksTotal(quota.getFreeTasksTotal())
                .freeTasksUsed(quota.getFreeTasksUsed())
                .freeTasksRemaining(remaining)
                .paidTasksTotal(quota.getPaidTasksTotal())
                .totalTasksUsed(quota.getTotalTasksUsed())
                .freeQuotaConsumed(consumedFree)
                .build();
    }

    private String writeJsonValue(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new BusinessException(ResultCode.INTERNAL_SERVER_ERROR, "Failed to serialize data");
        }
    }

    private List<String> readAnalysts(String json) {
        if (json == null || json.isBlank()) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            log.warn("Failed to deserialize analysts list: {}", json);
            return Collections.emptyList();
        }
    }

    private Map<String, Object> readPricingSnapshot(String json) {
        if (json == null || json.isBlank()) {
            return Collections.emptyMap();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            log.warn("Failed to deserialize pricing snapshot: {}", json);
            return Collections.emptyMap();
        }
    }
}
