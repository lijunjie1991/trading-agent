package com.tradingagent.service.service;

import com.tradingagent.service.common.ResultCode;
import com.tradingagent.service.dto.PricingQuote;
import com.tradingagent.service.entity.Task;
import com.tradingagent.service.entity.TaskPayment;
import com.tradingagent.service.entity.enums.PaymentStatus;
import com.tradingagent.service.exception.BusinessException;
import com.tradingagent.service.repository.TaskPaymentRepository;
import com.tradingagent.service.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class TaskPaymentService {

    private final TaskPaymentRepository taskPaymentRepository;
    private final TaskRepository taskRepository;
    private final TaskBillingService taskBillingService;

    @Transactional
    public TaskPayment initializePayment(Task task, PricingQuote quote, String pricingSnapshot) {
        if (quote == null) {
            throw new BusinessException(ResultCode.INTERNAL_SERVER_ERROR, "Pricing quote is required to initialize payment");
        }
        TaskPayment payment = taskPaymentRepository.findByTaskTaskId(task.getTaskId());
        if (payment == null) {
            payment = TaskPayment.builder()
                    .task(task)
                    .user(task.getUser())
                    .status(PaymentStatus.AWAITING_PAYMENT)
                    .isFree(Boolean.FALSE)
                    .build();
        } else {
            payment.setStatus(PaymentStatus.AWAITING_PAYMENT);
            payment.setIsFree(Boolean.FALSE);
        }
        payment.setPaidAt(null);
        payment.setStripePaymentIntentId(null);
        payment.setStripeClientSecret(null);
        payment.setAmount(quote.getTotalAmount());
        payment.setCurrency(quote.getCurrency());
        payment.setPricingSnapshot(pricingSnapshot);
        payment = taskPaymentRepository.save(payment);
        task.setPayment(payment);
        task.setBillingAmount(quote.getTotalAmount());
        task.setBillingCurrency(quote.getCurrency());
        task.setPricingSnapshot(pricingSnapshot);
        task.setIsFreeTask(Boolean.FALSE);
        task.setPaymentStatus(PaymentStatus.AWAITING_PAYMENT);
        task.setErrorMessage(null);
        taskRepository.save(task);
        return payment;
    }

    @Transactional(readOnly = true)
    public TaskPayment getRequiredPaymentByTaskId(String taskId) {
        TaskPayment payment = taskPaymentRepository.findByTaskTaskId(taskId);
        if (payment == null) {
            throw new BusinessException(ResultCode.PAYMENT_NOT_FOUND, "Payment not found for task: " + taskId);
        }
        return payment;
    }

    @Transactional
    public void attachStripeIntent(TaskPayment payment, String paymentIntentId, String clientSecret) {
        if (payment == null) {
            throw new BusinessException(ResultCode.PAYMENT_NOT_FOUND, "Payment entity is required");
        }
        if (paymentIntentId != null && !paymentIntentId.isBlank()) {
            payment.setStripePaymentIntentId(paymentIntentId);
        }
        if (clientSecret != null && !clientSecret.isBlank()) {
            payment.setStripeClientSecret(clientSecret);
        }
        taskPaymentRepository.save(payment);
    }

    @Transactional
    public void markPaid(TaskPayment payment) {
        if (payment == null) {
            return;
        }
        if (PaymentStatus.PAID.equals(payment.getStatus())) {
            log.info("Payment {} already marked as PAID, ignoring duplicate event", payment.getId());
            return;
        }
        payment.setStatus(PaymentStatus.PAID);
        payment.setPaidAt(LocalDateTime.now());
        payment.setStripeClientSecret(null);
        taskPaymentRepository.save(payment);

        Task task = payment.getTask();
        task.setPaymentStatus(PaymentStatus.PAID);
        task.setErrorMessage(null);
        taskRepository.save(task);

        taskBillingService.incrementPaidTaskCount(task.getUser());
    }

    @Transactional
    public void markFailed(TaskPayment payment, String reason) {
        if (payment == null) {
            return;
        }
        payment.setStatus(PaymentStatus.PAYMENT_FAILED);
        payment.setPaidAt(null);
        payment.setStripeClientSecret(null);
        taskPaymentRepository.save(payment);

        Task task = payment.getTask();
        task.setPaymentStatus(PaymentStatus.PAYMENT_FAILED);
        if (reason != null && !reason.isBlank()) {
            task.setErrorMessage(reason);
        }
        taskRepository.save(task);
    }

    @Transactional
    public void markExpired(TaskPayment payment) {
        if (payment == null) {
            return;
        }
        payment.setStatus(PaymentStatus.PAYMENT_EXPIRED);
        payment.setPaidAt(null);
        payment.setStripeClientSecret(null);
        taskPaymentRepository.save(payment);

        Task task = payment.getTask();
        task.setPaymentStatus(PaymentStatus.PAYMENT_EXPIRED);
        task.setErrorMessage("Payment intent canceled before completion");
        taskRepository.save(task);
    }

    @Transactional(readOnly = true)
    public TaskPayment findByPaymentIntentId(String paymentIntentId) {
        if (paymentIntentId == null || paymentIntentId.isBlank()) {
            return null;
        }
        return taskPaymentRepository.findByStripePaymentIntentId(paymentIntentId);
    }

    @Transactional
    public void updatePaymentIntent(TaskPayment payment, String paymentIntentId, String clientSecret) {
        if (payment == null) {
            return;
        }
        if (paymentIntentId != null && !paymentIntentId.isBlank()) {
            payment.setStripePaymentIntentId(paymentIntentId);
        }
        if (clientSecret != null && !clientSecret.isBlank()) {
            payment.setStripeClientSecret(clientSecret);
        }
        taskPaymentRepository.save(payment);
    }
}
