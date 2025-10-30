package com.tradingagent.service.service;

import com.tradingagent.service.common.ResultCode;
import com.tradingagent.service.dto.PricingQuote;
import com.tradingagent.service.entity.TaskPayment;
import com.tradingagent.service.entity.enums.PaymentStatus;
import com.tradingagent.service.exception.BusinessException;
import com.tradingagent.service.repository.TaskPaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Service responsible for task payment lifecycle management.
 *
 * <p>This service handles all payment-related operations including: - Payment initialization and
 * Stripe integration - Payment status transitions (awaiting -> paid/failed/expired) - Payment-task
 * synchronization - Payment history tracking
 *
 * <p>Payment State Machine: AWAITING_PAYMENT -> PAID (success) |-> PAYMENT_FAILED (failure) |->
 * PAYMENT_EXPIRED (timeout/cancellation)
 *
 * @author Trading Agent Team
 * @since 1.0.0
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TaskPaymentService {

  private final TaskPaymentRepository taskPaymentRepository;

  // ==================== Payment Initialization ====================

  /**
   * Initialize or reset payment for a task.
   *
   * <p>This method ONLY manages payment records. The caller (TaskService) is responsible for
   * synchronizing task entity state.
   *
   * @param taskId Database ID of the task
   * @param taskUuid UUID of the task (for logging)
   * @param userId User ID
   * @param quote The pricing quote (must not be null)
   * @param pricingSnapshot JSON snapshot of pricing details
   * @return The initialized payment entity with database ID
   * @throws BusinessException if quote is null
   */
  @Transactional(rollbackFor = Exception.class)
  public TaskPayment initializePayment(
      Long taskId, String taskUuid, Long userId, PricingQuote quote, String pricingSnapshot) {
    if (quote == null) {
      throw new BusinessException(
          ResultCode.INTERNAL_SERVER_ERROR, "Pricing quote is required to initialize payment");
    }

    TaskPayment payment = taskPaymentRepository.findByTaskId(taskId);

    if (payment == null) {
      log.info("Creating new payment record for task {}", taskUuid);
      payment =
          TaskPayment.builder()
              .taskId(taskId)
              .userId(userId)
              .status(PaymentStatus.AWAITING_PAYMENT)
              .isFree(Boolean.FALSE)
              .build();
    } else {
      log.info("Resetting existing payment {} for task {}", payment.getId(), taskUuid);
      payment.setStatus(PaymentStatus.AWAITING_PAYMENT);
      payment.setIsFree(Boolean.FALSE);
    }

    // Clear any previous payment attempt data
    payment.setPaidAt(null);
    payment.setStripePaymentIntentId(null);
    payment.setStripeClientSecret(null);

    // Set current pricing information
    payment.setAmount(quote.getTotalAmount());
    payment.setCurrency(quote.getCurrency());
    payment.setPricingSnapshot(pricingSnapshot);

    payment = taskPaymentRepository.save(payment);

    log.info(
        "Payment {} initialized for task {}: amount={} {}",
        payment.getId(),
        taskUuid,
        quote.getTotalAmount(),
        quote.getCurrency());

    return payment;
  }

  /**
   * Attach Stripe payment intent information to an existing payment.
   *
   * @param payment The payment entity (must not be null)
   * @param paymentIntentId Stripe payment intent ID
   * @param clientSecret Stripe client secret for frontend
   * @throws BusinessException if payment is null
   */
  @Transactional(rollbackFor = Exception.class)
  public void attachStripeIntent(TaskPayment payment, String paymentIntentId, String clientSecret) {
    if (payment == null) {
      throw new BusinessException(ResultCode.PAYMENT_NOT_FOUND, "Payment entity is required");
    }

    updateStripeIntentFields(payment, paymentIntentId, clientSecret);
    taskPaymentRepository.save(payment);

    log.info("Attached Stripe intent {} to payment {}", paymentIntentId, payment.getId());
  }

  /**
   * Update Stripe payment intent information for an existing payment.
   *
   * <p>Similar to attachStripeIntent but allows selective updates.
   *
   * @param payment The payment entity
   * @param paymentIntentId Stripe payment intent ID (null to skip update)
   * @param clientSecret Stripe client secret (null to skip update)
   */
  @Transactional(rollbackFor = Exception.class)
  public void updatePaymentIntent(
      TaskPayment payment, String paymentIntentId, String clientSecret) {
    if (payment == null) {
      log.warn("Attempted to update payment intent on null payment");
      return;
    }

    updateStripeIntentFields(payment, paymentIntentId, clientSecret);
    taskPaymentRepository.save(payment);

    log.debug("Updated Stripe intent for payment {}", payment.getId());
  }

  // ==================== Payment Status Transitions ====================

  /**
   * Mark a payment as successfully paid.
   *
   * <p>This method ONLY updates the payment record. The caller (TaskService) is responsible for
   * updating task status and incrementing paid task counter.
   *
   * <p>Idempotent: Safe to call multiple times (e.g., duplicate webhooks).
   *
   * @param payment The payment to mark as paid
   * @return true if payment was updated, false if already paid (idempotent behavior)
   */
  @Transactional(rollbackFor = Exception.class)
  public boolean markPaid(TaskPayment payment) {
    if (payment == null) {
      log.warn("Attempted to mark null payment as paid");
      return false;
    }

    if (PaymentStatus.PAID.equals(payment.getStatus())) {
      log.info("Payment {} already marked as PAID, ignoring duplicate event", payment.getId());
      return false;
    }

    payment.setStatus(PaymentStatus.PAID);
    payment.setPaidAt(LocalDateTime.now());
    payment.setStripeClientSecret(null); // Clear secret for security
    taskPaymentRepository.save(payment);

    log.info("Payment {} marked as PAID", payment.getId());
    return true;
  }

  /**
   * Mark a payment as failed.
   *
   * <p>This method ONLY updates the payment record. The caller (TaskService) is responsible for
   * updating task status and error message.
   *
   * @param payment The payment to mark as failed
   */
  @Transactional(rollbackFor = Exception.class)
  public void markFailed(TaskPayment payment) {
    if (payment == null) {
      log.warn("Attempted to mark null payment as failed");
      return;
    }

    payment.setStatus(PaymentStatus.PAYMENT_FAILED);
    payment.setPaidAt(null);
    payment.setStripeClientSecret(null);
    taskPaymentRepository.save(payment);

    log.warn("Payment {} marked as FAILED", payment.getId());
  }

  /**
   * Mark a payment as expired (canceled or timed out).
   *
   * <p>This method ONLY updates the payment record. The caller (TaskService) is responsible for
   * updating task status.
   *
   * @param payment The payment to mark as expired
   */
  @Transactional(rollbackFor = Exception.class)
  public void markExpired(TaskPayment payment) {
    if (payment == null) {
      log.warn("Attempted to mark null payment as expired");
      return;
    }

    payment.setStatus(PaymentStatus.PAYMENT_EXPIRED);
    payment.setPaidAt(null);
    payment.setStripeClientSecret(null);
    taskPaymentRepository.save(payment);

    log.info("Payment {} marked as EXPIRED", payment.getId());
  }

  // ==================== Payment Query ====================

  /**
   * Get payment by its database ID.
   *
   * @param paymentId The payment ID
   * @return The payment entity, or null if not found
   */
  @Transactional(readOnly = true)
  public TaskPayment getPaymentById(Long paymentId) {
    return taskPaymentRepository.findById(paymentId).orElse(null);
  }

  /**
   * Get payment by task ID (required - throws exception if not found).
   *
   * @param taskId The task UUID
   * @return The payment entity
   * @throws BusinessException if payment not found
   */
  @Transactional(readOnly = true)
  public TaskPayment getRequiredPaymentByTaskId(String taskId) {
    TaskPayment payment = taskPaymentRepository.findByTaskTaskId(taskId);
    if (payment == null) {
      throw new BusinessException(
          ResultCode.PAYMENT_NOT_FOUND, "Payment not found for task: " + taskId);
    }
    return payment;
  }

  /**
   * Find payment by Stripe payment intent ID.
   *
   * @param paymentIntentId The Stripe payment intent ID
   * @return The payment entity, or null if not found
   */
  @Transactional(readOnly = true)
  public TaskPayment findByPaymentIntentId(String paymentIntentId) {
    if (paymentIntentId == null || paymentIntentId.isBlank()) {
      return null;
    }
    return taskPaymentRepository.findByStripePaymentIntentId(paymentIntentId);
  }

  // ==================== Private Helper Methods ====================

  /** Update Stripe intent fields if values are provided. */
  private void updateStripeIntentFields(
      TaskPayment payment, String paymentIntentId, String clientSecret) {
    if (paymentIntentId != null && !paymentIntentId.isBlank()) {
      payment.setStripePaymentIntentId(paymentIntentId);
    }
    if (clientSecret != null && !clientSecret.isBlank()) {
      payment.setStripeClientSecret(clientSecret);
    }
  }
}
