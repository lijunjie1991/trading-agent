package com.tradingagent.service.service;

import com.tradingagent.service.common.ResultCode;
import com.tradingagent.service.dto.PageResponse;
import com.tradingagent.service.dto.PricingQuote;
import com.tradingagent.service.dto.StripePaymentIntent;
import com.tradingagent.service.dto.TaskQueryRequest;
import com.tradingagent.service.dto.TaskRequest;
import com.tradingagent.service.dto.TaskResponse;
import com.tradingagent.service.dto.TaskSubmissionContext;
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
import jakarta.annotation.Resource;
import lombok.NonNull;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.tradingagent.service.util.JsonUtil;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Service responsible for core task lifecycle orchestration.
 *
 * <p>This service coordinates all task-related operations including: - Task creation and submission
 * - Task retry logic - Task status queries - Task report and message retrieval - Integration with
 * billing, payment, and engine services
 *
 * <p>Architecture Pattern: This service uses the orchestrator pattern - it delegates specialized
 * concerns to domain services (TaskBillingService, TaskPaymentService, PythonServiceClient) while
 * maintaining overall workflow control.
 *
 * <p>Transaction Strategy: Methods are split into small transactional units to prevent transaction
 * overlap issues with the Python analysis engine. See REFACTORING_PLAN.md for details.
 *
 * @author Trading Agent Team
 * @since 1.0.0
 */
@Slf4j
@Service
public class TaskService {

  @Resource private TaskRepository taskRepository;
  @Resource private ReportRepository reportRepository;
  @Resource private TaskMessageRepository taskMessageRepository;
  @Resource private PythonServiceClient pythonServiceClient;
  @Resource private AuthService authService;
  @Resource private PricingService pricingService;
  @Resource private TaskBillingService taskBillingService;
  @Resource private TaskPaymentService taskPaymentService;
  @Resource private StripeClient stripeClient;
  @Resource @Lazy private TaskService self;

  // ==================== Public API Methods ====================

  /**
   * Submit a new analysis task.
   *
   * <p>This is the primary entry point for task creation. It handles both free and paid tasks,
   * managing the complete submission workflow including quota consumption and payment processing.
   *
   * <p>Transaction Strategy: 1. Single transaction: Prepare all database state (task, quota,
   * payment) 2. No transaction: Submit to Python engine 3. Compensating transaction (if submission
   * fails): Rollback quota, mark task failed
   *
   * @param request Task submission request
   * @return Task response with submission details
   */
  public TaskResponse submitTask(TaskRequest request) {
    User currentUser = authService.getCurrentUser();

    // Step 1: Prepare all database state in ONE transaction
    TaskSubmissionContext taskSubmissionContext = self.prepareTaskSubmission(request, currentUser);

    log.info(
        "Task {} prepared: useFreeQuota={}, shouldSubmit={}",
        taskSubmissionContext.getTask().getTaskId(),
        taskSubmissionContext.isUseFreeQuota(),
        taskSubmissionContext.isShouldSubmitToEngine());

    // Step 2: Submit to Python engine (NO TRANSACTION)
    if (taskSubmissionContext.isShouldSubmitToEngine()) {
      this.dispatchTaskToEngine(taskSubmissionContext.getTask());
    }

    // Build response from context
    return this.buildSubmissionResponse(taskSubmissionContext, currentUser);
  }

  /**
   * Retry a failed task.
   *
   * <p>Allows users to resubmit a failed task to the analysis engine. Only tasks in FAILED status
   * can be retried. For paid tasks, payment must already be completed.
   *
   * <p>Transaction Strategy: 1. Single transaction: Reset task state 2. No transaction: Submit to
   * engine (if applicable) 3. Compensating transaction (if fails): Mark as failed again
   *
   * @param taskId The task UUID to retry
   * @return Updated task response
   */
  public TaskResponse retryTask(String taskId) {
    User currentUser = authService.getCurrentUser();
    Task task = taskRepository.findByTaskId(taskId);

    if (task == null) {
      throw new ResourceNotFoundException(ResultCode.TASK_NOT_FOUND, "Task not found: " + taskId);
    }
    if (!task.getUserId().equals(currentUser.getId())) {
      throw new UnauthorizedException(ResultCode.ACCESS_DENIED);
    }
    if (!"FAILED".equals(task.getStatus())) {
      throw new BusinessException(ResultCode.INVALID_PARAMETER, "Only failed tasks can be retried");
    }

    // Step 1: Reset task in single transaction
    task = this.resetTaskForRetry(task);
    log.info("Task {} reset for retry", taskId);

    // Step 2: Submit to engine if applicable (NO TRANSACTION)
    boolean shouldSubmit =
        task.getIsFreeTask() || PaymentStatus.PAID.equals(task.getPaymentStatus());

    if (shouldSubmit) {
      this.dispatchTaskToEngine(task);
    }

    return toTaskResponse(task);
  }

  /**
   * Retry payment for a task with failed/expired payment.
   *
   * <p>Creates a new Stripe payment intent for tasks that failed payment or had payment expire.
   * Cancels any existing payment intent and generates a new one with current pricing.
   *
   * @param taskId The task UUID to retry payment for
   * @return Task response with new payment intent details
   */
  @Transactional(rollbackFor = Exception.class)
  public TaskResponse retryPayment(String taskId) {
    User currentUser = authService.getCurrentUser();
    Task task = getTaskAndValidateAccess(taskId);
    if (PaymentStatus.PAID.equals(task.getPaymentStatus())
        || PaymentStatus.FREE.equals(task.getPaymentStatus())) {
      throw new BusinessException(
          ResultCode.INVALID_PARAMETER, "Task payment retry is not allowed for current status");
    }

    var strategy = pricingService.getActiveStrategy();
    var quote =
        pricingService.calculateQuote(
            strategy, task.getResearchDepth(), fromJson(task.getSelectedAnalysts()));
    String snapshot = taskBillingService.buildPricingSnapshot(quote);

    TaskPayment existingPayment =
        task.getPaymentId() != null ? taskPaymentService.getPaymentById(task.getPaymentId()) : null;
    if (existingPayment != null && existingPayment.getStripePaymentIntentId() != null) {
      stripeClient.cancelPaymentIntent(existingPayment.getStripePaymentIntentId());
    }

    TaskPayment payment =
        taskPaymentService.initializePayment(
            task.getId(), task.getTaskId(), task.getUserId(), quote, snapshot);
    StripePaymentIntent paymentIntent = stripeClient.createPaymentIntent(task, quote);
    taskPaymentService.attachStripeIntent(
        payment, paymentIntent.getPaymentIntentId(), paymentIntent.getClientSecret());

    // Synchronize task with payment
    task.setPaymentId(payment.getId());
    task.setBillingAmount(quote.getTotalAmount());
    task.setBillingCurrency(quote.getCurrency());
    task.setPricingSnapshot(snapshot);
    task.setPaymentStatus(PaymentStatus.AWAITING_PAYMENT);
    task.setErrorMessage(null);
    taskRepository.save(task);

    TaskResponse response = toTaskResponse(task);
    response.setPaymentRequired(true);
    response.setPaymentIntentId(paymentIntent.getPaymentIntentId());
    response.setPaymentClientSecret(paymentIntent.getClientSecret());
    response.setFreeQuotaTotal(currentUser.getFreeQuotaTotal());
    response.setFreeQuotaRemaining(taskBillingService.getRemainingFreeQuota(currentUser));
    response.setPaidTaskCount(currentUser.getPaidTaskCount());
    return response;
  }

  /**
   * Get paginated list of user's tasks with optional filtering.
   *
   * <p>Supports filtering by status, ticker, date range, and keyword search. Results are sorted and
   * paginated according to the query parameters.
   *
   * @param queryRequest Query parameters including filters, pagination, and sorting
   * @return Paginated list of task responses
   */
  public PageResponse<TaskResponse> getUserTasksWithPagination(TaskQueryRequest queryRequest) {
    User currentUser = authService.getCurrentUser();

    // Validate and set defaults
    queryRequest.validate();

    // Create Pageable with sorting
    Sort sort =
        Sort.by(
            queryRequest.getSortOrder().equalsIgnoreCase("ASC")
                ? Sort.Direction.ASC
                : Sort.Direction.DESC,
            queryRequest.getSortBy());
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
    Page<Task> taskPage =
        taskRepository.findTasksWithFilters(
            currentUser.getId(),
            queryRequest.getStatus(),
            queryRequest.getTicker(),
            queryRequest.getTaskId(),
            startDate,
            endDate,
            queryRequest.getSearchKeyword(),
            pageable);

    // Convert to PageResponse
    Page<TaskResponse> responsePage = taskPage.map(this::toTaskResponse);
    return PageResponse.of(responsePage);
  }

  /**
   * Get detailed information for a specific task.
   *
   * @param taskId The task UUID
   * @return Task response with complete details including refreshed payment client secret
   */
  public TaskResponse getTaskById(String taskId) {
    Task task = getTaskAndValidateAccess(taskId);

    // Refresh client secret for single task queries to ensure payment can proceed
    return toTaskResponse(task, true);
  }

  /**
   * Refresh and get payment client secret for a task.
   *
   * <p>This endpoint allows clients to obtain a fresh payment client secret without querying the
   * entire task details. Useful when the client secret has expired or is missing.
   *
   * <p>Only returns client secret for tasks that require payment (AWAITING_PAYMENT, PAYMENT_FAILED,
   * PAYMENT_EXPIRED status).
   *
   * @param taskId The task UUID
   * @return Map containing paymentIntentId and clientSecret
   */
  public Map<String, String> refreshPaymentClientSecret(String taskId) {
    Task task = getTaskAndValidateAccess(taskId);

    // Verify task requires payment
    boolean requiresPayment = false;
    if (task.getPaymentStatus() != null) {
      requiresPayment =
          switch (task.getPaymentStatus()) {
            case AWAITING_PAYMENT, PAYMENT_FAILED, PAYMENT_EXPIRED -> true;
            default -> false;
          };
    }

    if (!requiresPayment) {
      throw new BusinessException(
          ResultCode.INVALID_PARAMETER,
          "Task does not require payment. Current status: " + task.getPaymentStatus());
    }

    // Get payment and refresh client secret
    TaskPayment payment = taskPaymentService.getPaymentById(task.getPaymentId());
    if (payment == null || payment.getStripePaymentIntentId() == null) {
      throw new BusinessException(
          ResultCode.PAYMENT_NOT_FOUND, "Payment information not found for task: " + taskId);
    }

    String paymentIntentId = payment.getStripePaymentIntentId();
    String clientSecret = stripeClient.refreshClientSecret(paymentIntentId);
    taskPaymentService.updatePaymentIntent(payment, paymentIntentId, clientSecret);

    Map<String, String> result = new java.util.HashMap<>();
    result.put("paymentIntentId", paymentIntentId);
    result.put("clientSecret", clientSecret);
    return result;
  }

  /**
   * Get all analysis reports for a task.
   *
   * <p>Returns reports in chronological order (oldest first) as they were generated during the
   * analysis workflow.
   *
   * @param taskId The task UUID
   * @return List of report data maps
   */
  public List<Map<String, Object>> getTaskReports(String taskId) {
    Task task = getTaskAndValidateAccess(taskId);

    List<Report> reports = reportRepository.findByTaskIdOrderByCreatedAtAsc(task.getId());
    return reports.stream()
        .map(
            report -> {
              Map<String, Object> map = new java.util.HashMap<>();
              map.put("id", report.getId());
              map.put("reportType", report.getReportType());
              map.put("content", report.getContent());
              map.put("createdAt", report.getCreatedAt());
              return map;
            })
        .collect(Collectors.toList());
  }

  private @NonNull Task getTaskAndValidateAccess(String taskId) {
    Task task = taskRepository.findByTaskId(taskId);
    if (task == null) {
      throw new ResourceNotFoundException(ResultCode.TASK_NOT_FOUND, "Task not found: " + taskId);
    }

    User currentUser = authService.getCurrentUser();
    if (!task.getUserId().equals(currentUser.getId())) {
      throw new UnauthorizedException(ResultCode.ACCESS_DENIED);
    }
    return task;
  }

  /**
   * Get aggregated task statistics for current user.
   *
   * <p>Returns counts grouped by status (total, pending, running, completed, failed).
   *
   * @return Map of status counts
   */
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

  /**
   * Get real-time messages for a task (streaming logs from analysis engine).
   *
   * <p>Supports incremental updates by providing lastTimestamp parameter. Messages are returned in
   * descending order (newest first).
   *
   * @param taskId The task UUID
   * @param lastTimestamp Optional ISO 8601 timestamp to get only newer messages
   * @return List of message data maps
   */
  public List<Map<String, Object>> getTaskMessages(String taskId, String lastTimestamp) {
    Task task = getTaskAndValidateAccess(taskId);

    List<TaskMessage> messages;
    if (lastTimestamp != null && !lastTimestamp.isEmpty()) {
      // Incremental query：Get only new messages（Descending order，Latest first）
      // Parse ISO 8601 format (with or without timezone)
      LocalDateTime timestamp;
      try {
        // Try parsing with timezone first (e.g., "2025-10-20T14:14:35.000Z")
        timestamp =
            OffsetDateTime.parse(lastTimestamp, DateTimeFormatter.ISO_OFFSET_DATE_TIME)
                .toLocalDateTime();
      } catch (Exception e) {
        // Fall back to parsing without timezone (e.g., "2025-10-20T14:14:35")
        timestamp = LocalDateTime.parse(lastTimestamp, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
      }
      messages =
          taskMessageRepository.findByTaskIdAndCreatedAtGreaterThanOrderByCreatedAtDesc(
              task.getId(), timestamp);
    } else {
      // Full query：Get all messages（Descending order，Latest first）
      messages = taskMessageRepository.findByTaskIdOrderByCreatedAtDesc(task.getId());
    }

    return messages.stream()
        .map(
            message -> {
              Map<String, Object> map = new java.util.HashMap<>();
              map.put("id", message.getId());
              map.put("messageType", message.getMessageType());
              map.put("content", message.getContent());
              map.put("createdAt", message.getCreatedAt());
              return map;
            })
        .collect(Collectors.toList());
  }

  // ==================== Payment Event Coordination ====================

  /**
   * Handle successful payment webhook event from Stripe.
   *
   * <p>This method coordinates the payment success flow across multiple domain services: 1. Update
   * payment status (via TaskPaymentService) 2. Update task payment status 3. Increment paid task
   * counter 4. Dispatch task to analysis engine
   *
   * <p>Called by PaymentController webhook handler. Idempotent for duplicate webhook events.
   *
   * @param paymentId The payment database ID
   * @return true if dispatch succeeded, false otherwise
   */
  @Transactional(rollbackFor = Exception.class)
  public boolean handlePaymentSuccess(Long paymentId) {
    TaskPayment payment = taskPaymentService.getPaymentById(paymentId);
    if (payment == null) {
      log.warn("Payment {} not found for success event", paymentId);
      throw new BusinessException(ResultCode.PAYMENT_NOT_FOUND, "Payment not found: " + paymentId);
    }

    // Update payment status
    boolean wasUpdated = taskPaymentService.markPaid(payment);
    if (!wasUpdated) {
      log.info("Payment {} already processed, skipping", paymentId);
      return true; // Already processed, consider success
    }

    // Update task status
    Task task =
        taskRepository
            .findById(payment.getTaskId())
            .orElseThrow(
                () ->
                    new BusinessException(
                        ResultCode.TASK_NOT_FOUND, "Task not found for payment: " + paymentId));
    task.setPaymentStatus(PaymentStatus.PAID);
    task.setErrorMessage(null);
    taskRepository.save(task);

    // Increment paid task counter
    taskBillingService.incrementPaidTaskCountByUserId(task.getUserId());

    log.info("Payment {} success processed for task {}", paymentId, task.getTaskId());

    // Dispatch to engine (outside this transaction)
    this.dispatchTaskToEngine(task);
    return true;
  }

  /**
   * Handle failed payment webhook event from Stripe.
   *
   * <p>Called by PaymentController when payment processing fails. Updates both payment and task
   * status to reflect the failure.
   *
   * @param paymentId The payment database ID
   * @param reason Failure reason from Stripe
   */
  @Transactional(rollbackFor = Exception.class)
  public void handlePaymentFailure(Long paymentId, String reason) {
    TaskPayment payment = taskPaymentService.getPaymentById(paymentId);
    if (payment == null) {
      log.warn("Payment {} not found for failure event", paymentId);
      return;
    }

    // Update payment status
    taskPaymentService.markFailed(payment);

    // Update task status
    Task task =
        taskRepository
            .findById(payment.getTaskId())
            .orElseThrow(
                () ->
                    new BusinessException(
                        ResultCode.TASK_NOT_FOUND, "Task not found for payment: " + paymentId));
    task.setPaymentStatus(PaymentStatus.PAYMENT_FAILED);
    if (reason != null && !reason.isBlank()) {
      task.setErrorMessage(reason);
    }
    taskRepository.save(task);

    log.warn("Payment {} failure processed for task {}: {}", paymentId, task.getTaskId(), reason);
  }

  /**
   * Handle expired/canceled payment webhook event from Stripe.
   *
   * <p>Called by PaymentController when a payment intent is canceled or times out before
   * completion.
   *
   * @param paymentId The payment database ID
   */
  @Transactional(rollbackFor = Exception.class)
  public void handlePaymentExpired(Long paymentId) {
    TaskPayment payment = taskPaymentService.getPaymentById(paymentId);
    if (payment == null) {
      log.warn("Payment {} not found for expired event", paymentId);
      return;
    }

    // Update payment status
    taskPaymentService.markExpired(payment);

    // Update task status
    Task task =
        taskRepository
            .findById(payment.getTaskId())
            .orElseThrow(
                () ->
                    new BusinessException(
                        ResultCode.TASK_NOT_FOUND, "Task not found for payment: " + paymentId));
    task.setPaymentStatus(PaymentStatus.PAYMENT_EXPIRED);
    task.setErrorMessage("Payment intent canceled before completion");
    taskRepository.save(task);

    log.info("Payment {} expired processed for task {}", paymentId, task.getTaskId());
  }

  // ==================== Transaction Boundary & Orchestration Methods ====================

  /**
   * Prepare task submission in a SINGLE transaction.
   *
   * <p>This method performs ALL database operations needed before submitting to Python: - Create
   * task record - Consume free quota (if applicable) - Initialize payment and create Stripe intent
   * (if paid)
   *
   * <p>All operations are atomic - either all succeed or all rollback. This prevents orphaned
   * records and ensures data consistency.
   *
   * @param request Task request
   * @param currentUser Current user
   * @return Context with all prepared data
   */
  @Transactional(rollbackFor = Exception.class)
  protected TaskSubmissionContext prepareTaskSubmission(TaskRequest request, User currentUser) {
    // Calculate pricing
    var strategy = pricingService.getActiveStrategy();
    PricingQuote pricingQuote =
        pricingService.calculateQuote(
            strategy, request.getResearchDepth(), request.getSelectedAnalysts());

    // Determine billing strategy
    boolean hasFreeQuota = taskBillingService.hasRemainingFreeQuota(currentUser);
    int remainingFreeBefore = taskBillingService.getRemainingFreeQuota(currentUser);
    boolean zeroPriced = pricingQuote.getTotalAmount().compareTo(java.math.BigDecimal.ZERO) <= 0;
    boolean useFreeQuota = hasFreeQuota || zeroPriced;

    // Create task
    String taskId = java.util.UUID.randomUUID().toString();
    String pricingSnapshot =
        useFreeQuota ? null : taskBillingService.buildPricingSnapshot(pricingQuote);

    Task task =
        Task.builder()
            .taskId(taskId)
            .userId(currentUser.getId())
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
    log.info("Task {} created in database", taskId);

    // Handle quota/payment in same transaction
    StripePaymentIntent paymentIntent = null;

    if (useFreeQuota) {
      // Consume free quota
      if (hasFreeQuota) {
        taskBillingService.consumeFreeQuota(currentUser);
        log.info("Consumed free quota for user {}", currentUser.getId());
      }
    } else {
      // Initialize payment and create Stripe intent
      TaskPayment payment =
          taskPaymentService.initializePayment(
              task.getId(), task.getTaskId(), task.getUserId(), pricingQuote, pricingSnapshot);
      paymentIntent = stripeClient.createPaymentIntent(task, pricingQuote);
      taskPaymentService.attachStripeIntent(
          payment, paymentIntent.getPaymentIntentId(), paymentIntent.getClientSecret());

      // Synchronize task with payment
      task.setPaymentId(payment.getId());
      task.setBillingAmount(pricingQuote.getTotalAmount());
      task.setBillingCurrency(strategy.getCurrency());
      task.setPricingSnapshot(pricingSnapshot);
      task.setIsFreeTask(Boolean.FALSE);
      task.setPaymentStatus(PaymentStatus.AWAITING_PAYMENT);
      task.setErrorMessage(null);
      taskRepository.save(task);

      log.info("Payment initialized for task {}", taskId);
    }

    // Build context
    return TaskSubmissionContext.builder()
        .task(task)
        .user(currentUser)
        .analysts(request.getSelectedAnalysts())
        .pricingQuote(pricingQuote)
        .paymentIntent(paymentIntent)
        .useFreeQuota(useFreeQuota)
        .hadFreeQuota(hasFreeQuota)
        .remainingFreeBefore(remainingFreeBefore)
        .shouldSubmitToEngine(useFreeQuota) // Only submit free tasks immediately
        .build();
  }

  /**
   * Submit task to Python analysis engine (NO TRANSACTION).
   *
   * <p>This method MUST be called outside of any transaction to avoid race conditions. The Python
   * service may update task status before Java transaction commits, causing data inconsistency.
   *
   * @param task The task to submit
   * @param analysts List of analysts to use in analysis
   */
  protected void submitToEngine(Task task, List<String> analysts) {
    try {
      Map<String, Object> response =
          pythonServiceClient
              .submitAnalysisTask(
                  task.getTaskId(),
                  task.getTicker(),
                  task.getAnalysisDate().toString(),
                  analysts,
                  task.getResearchDepth())
              .block();

      if (response == null || response.isEmpty()) {
        throw new BusinessException(
            ResultCode.PYTHON_SERVICE_ERROR, "Python service returned empty response");
      }

      log.info("Task {} successfully submitted to Python engine", task.getTaskId());

    } catch (BusinessException ex) {
      throw ex;
    } catch (Exception ex) {
      log.error(
          "Failed to submit task {} to Python engine: {}", task.getTaskId(), ex.getMessage(), ex);
      throw new BusinessException(
          ResultCode.PYTHON_SERVICE_ERROR,
          "Failed to submit task to Python service: " + ex.getMessage());
    }
  }

  /**
   * Build complete task response from submission context.
   *
   * <p>Constructs the API response including payment details, quota information, and billing data.
   *
   * @param ctx Submission context
   * @param currentUser Current user (for fresh quota data)
   * @return Complete task response
   */
  protected TaskResponse buildSubmissionResponse(TaskSubmissionContext ctx, User currentUser) {
    TaskResponse response = toTaskResponse(ctx.getTask());
    response.setPaymentRequired(!ctx.isUseFreeQuota());
    response.setPaymentIntentId(
        ctx.getPaymentIntent() != null ? ctx.getPaymentIntent().getPaymentIntentId() : null);
    response.setPaymentClientSecret(
        ctx.getPaymentIntent() != null ? ctx.getPaymentIntent().getClientSecret() : null);
    response.setFreeQuotaTotal(currentUser.getFreeQuotaTotal());
    response.setFreeQuotaRemaining(taskBillingService.getRemainingFreeQuota(currentUser));
    response.setPaidTaskCount(currentUser.getPaidTaskCount());
    response.setPaymentStatus(ctx.getTask().getPaymentStatus().name());
    response.setBillingAmount(ctx.getTask().getBillingAmount());
    response.setBillingCurrency(ctx.getTask().getBillingCurrency());
    response.setFreeTask(ctx.getTask().getIsFreeTask());

    log.info(
        "Task {} submission complete. Free quota before: {}, remaining: {}",
        ctx.getTask().getTaskId(),
        ctx.getRemainingFreeBefore(),
        response.getFreeQuotaRemaining());

    return response;
  }

  /**
   * Reset task state for retry in a single transaction.
   *
   * <p>Clears all execution-related fields (status, error messages, metrics) to prepare task for
   * resubmission.
   *
   * @param task The task to reset
   * @return The reset task entity
   */
  protected Task resetTaskForRetry(Task task) {
    task.setStatus("PENDING");
    task.setErrorMessage(null);
    task.setRawErrorMessage(null);
    task.setCompletedAt(null);
    task.setFinalDecision(null);
    task.setToolCalls(0);
    task.setLlmCalls(0);
    task.setReports(0);

    taskRepository.save(task);
    log.info("Reset task {} state for retry", task.getTaskId());
    return task;
  }

  /**
   * Mark task as failed in compensating transaction.
   *
   * <p>Used when engine submission fails to ensure task status reflects the failure. Separate from
   * handleSubmissionFailure because it doesn't need to restore quota.
   *
   * @param taskId The task UUID
   * @param errorMessage Error description
   */
  protected void markTaskAsFailed(String taskId, String errorMessage) {
    Task task = taskRepository.findByTaskId(taskId);
    if (task != null) {
      task.setStatus("FAILED");
      task.setErrorMessage(errorMessage);
      task.setCompletedAt(LocalDateTime.now());
      taskRepository.save(task);
    }
  }

  /**
   * Dispatch a paid task to the engine after payment success.
   *
   * <p>Called by payment webhook handler after payment is confirmed. Handles submission failure
   * gracefully by marking task as failed.
   *
   * @param task The task to dispatch
   */
  protected void dispatchTaskToEngine(Task task) {
    try {
      submitToEngine(task, fromJson(task.getSelectedAnalysts()));
    } catch (Exception e) {
      // Mark task as failed in compensating transaction
      markTaskAsFailed(task.getTaskId(), e.getMessage());
      throw e;
    }
  }

  // ==================== Private Helper Methods ====================

  /**
   * Convert Task entity to TaskResponse DTO.
   *
   * @param task The task entity
   * @return Task response DTO
   */
  private TaskResponse toTaskResponse(Task task) {
    return toTaskResponse(task, false);
  }

  /**
   * Convert Task entity to TaskResponse DTO.
   *
   * <p>Handles payment intent refresh if client secret is missing for pending payments.
   *
   * @param task The task entity
   * @param refreshClientSecret Whether to refresh client secret from Stripe if missing
   * @return Task response DTO
   */
  private TaskResponse toTaskResponse(Task task, boolean refreshClientSecret) {
    List<String> analysts =
        task.getSelectedAnalysts() != null
            ? fromJson(task.getSelectedAnalysts())
            : java.util.Collections.emptyList();

    boolean requiresPayment = false;
    if (task.getPaymentStatus() != null) {
      requiresPayment =
          switch (task.getPaymentStatus()) {
            case AWAITING_PAYMENT, PAYMENT_FAILED, PAYMENT_EXPIRED -> true;
            default -> false;
          };
    }

    // Parse pricing breakdown if available
    TaskResponse.PricingBreakdown pricingBreakdown =
        parsePricingBreakdown(
            task.getPricingSnapshot(), task.getBillingAmount(), task.getBillingCurrency());

    TaskResponse taskResponse =
        TaskResponse.builder()
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
            .pricingBreakdown(pricingBreakdown)
            .build();
    if (!requiresPayment) {
      return taskResponse;
    }
    TaskPayment payment =
        task.getPaymentId() != null ? taskPaymentService.getPaymentById(task.getPaymentId()) : null;
    if (payment != null) {
      String paymentIntentId = payment.getStripePaymentIntentId();
      if (paymentIntentId != null) {
        String paymentClientSecret = payment.getStripeClientSecret();
        // Only refresh if explicitly requested and client secret is missing
        if (refreshClientSecret && (paymentClientSecret == null || paymentClientSecret.isBlank())) {
          paymentClientSecret = stripeClient.refreshClientSecret(paymentIntentId);
          taskPaymentService.updatePaymentIntent(payment, paymentIntentId, paymentClientSecret);
        }
        taskResponse.setPaymentIntentId(paymentIntentId);
        taskResponse.setPaymentClientSecret(paymentClientSecret);
      }
    }
    return taskResponse;
  }

  /** Convert list of analysts to JSON string for database storage. */
  private String toJson(List<String> list) {
    return JsonUtil.convertListToJson(list);
  }

  /** Convert JSON string from database to list of analysts. */
  private List<String> fromJson(String json) {
    return JsonUtil.convertJsonToList(json);
  }

  /**
   * Parse pricing snapshot JSON and build PricingBreakdown for TaskResponse.
   *
   * <p>The pricing snapshot contains detailed billing information that was captured at task
   * creation time. This method extracts that data and formats it for client display.
   *
   * @param pricingSnapshot JSON string containing pricing details
   * @param billingAmount The final billing amount
   * @param currency The billing currency
   * @return PricingBreakdown object with detailed pricing information, or null if snapshot is empty
   */
  @SuppressWarnings("rawtypes")
  private TaskResponse.PricingBreakdown parsePricingBreakdown(
      String pricingSnapshot, BigDecimal billingAmount, String currency) {
    if (pricingSnapshot == null || pricingSnapshot.isBlank()) {
      return null;
    }

    try {
      com.fasterxml.jackson.databind.ObjectMapper mapper =
          new com.fasterxml.jackson.databind.ObjectMapper();
      Map snapshot = mapper.readValue(pricingSnapshot, Map.class);

      BigDecimal basePrice = new BigDecimal(snapshot.get("basePrice").toString());
      BigDecimal researchDepthFactor = new BigDecimal(snapshot.get("researchDepthFactor").toString());
      BigDecimal analystFactor = new BigDecimal(snapshot.get("analystFactor").toString());

      // Calculate multipliers from factors (factor = 1 + multiplier * (count - 1))
      BigDecimal researchDepthMultiplier = researchDepthFactor.subtract(BigDecimal.ONE);
      BigDecimal analystMultiplier = analystFactor.subtract(BigDecimal.ONE);

      // Build calculation formula for UI display
      String formula =
          String.format(
              "%s %s × %s (depth) × %s (analysts) = %s %s",
              currency, basePrice, researchDepthFactor, analystFactor, currency, billingAmount);

      return TaskResponse.PricingBreakdown.builder()
          .basePrice(basePrice)
          .researchDepthFactor(researchDepthFactor)
          .analystFactor(analystFactor)
          .researchDepthMultiplier(researchDepthMultiplier)
          .analystMultiplier(analystMultiplier)
          .calculationFormula(formula)
          .build();
    } catch (Exception e) {
      log.warn("Failed to parse pricing snapshot: {}", e.getMessage());
      return null;
    }
  }
}
