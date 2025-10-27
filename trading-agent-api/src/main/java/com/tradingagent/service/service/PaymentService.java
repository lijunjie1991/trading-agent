package com.tradingagent.service.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.stripe.exception.StripeException;
import com.stripe.model.Charge;
import com.stripe.model.PaymentIntent;
import com.tradingagent.service.common.PaymentStatus;
import com.tradingagent.service.common.ResultCode;
import com.tradingagent.service.common.TaskPaymentStatus;
import com.tradingagent.service.dto.TaskPaymentInfo;
import com.tradingagent.service.dto.PricingCalculationResult;
import com.tradingagent.service.entity.Payment;
import com.tradingagent.service.entity.PricingStrategy;
import com.tradingagent.service.entity.Task;
import com.tradingagent.service.entity.User;
import com.tradingagent.service.exception.BusinessException;
import com.tradingagent.service.repository.PaymentRepository;
import com.tradingagent.service.repository.PricingStrategyRepository;
import com.tradingagent.service.repository.TaskRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final StripePaymentService stripePaymentService;
    private final PaymentRepository paymentRepository;
    private final TaskRepository taskRepository;
    private final PricingStrategyRepository pricingStrategyRepository;
    private final QuotaService quotaService;
    private final TaskExecutionService taskExecutionService;
    private final ObjectMapper objectMapper;

    @Transactional
    public TaskPaymentInfo initiatePayment(User user,
                                           Task task,
                                           PricingStrategy strategy,
                                           PricingCalculationResult calculation) {
        try {
            Map<String, String> metadata = new HashMap<>();
            metadata.put("taskId", task.getTaskId());
            metadata.put("userId", user.getId().toString());
            metadata.put("strategyCode", strategy.getStrategyCode());
            metadata.put("researchDepth", String.valueOf(calculation.getResearchDepth()));
            metadata.put("analystCount", String.valueOf(calculation.getAnalystCount()));

            PaymentIntent paymentIntent = stripePaymentService.createPaymentIntent(
                    calculation.getFinalAmountCents().longValue(),
                    stripePaymentService.getCurrency(),
                    "Trading Analysis Task " + task.getTaskId(),
                    metadata
            );

            task.setPaymentIntentId(paymentIntent.getId());
            task.setAmountCents(calculation.getFinalAmountCents());
            task.setCurrency(stripePaymentService.getCurrency());
            task.setPaymentStatus(TaskPaymentStatus.WAITING_PAYMENT.value());
            taskRepository.save(task);

            Payment payment = Payment.builder()
                    .paymentIntentId(paymentIntent.getId())
                    .user(user)
                    .task(task)
                    .pricingStrategyCode(strategy.getStrategyCode())
                    .amountCents(calculation.getFinalAmountCents())
                    .currency(stripePaymentService.getCurrency())
                    .status(PaymentStatus.WAITING_PAYMENT.value())
                    .metadata(writeJson(calculation.getPricingSnapshot()))
                    .build();
            paymentRepository.save(payment);

            return TaskPaymentInfo.builder()
                    .required(true)
                    .paymentIntentId(paymentIntent.getId())
                    .clientSecret(paymentIntent.getClientSecret())
                    .amountCents(calculation.getFinalAmountCents())
                    .currency(stripePaymentService.getCurrency())
                    .pricingStrategyCode(strategy.getStrategyCode())
                    .pricingBreakdown(calculation.getPricingSnapshot())
                    .build();
        } catch (StripeException e) {
            log.error("Failed to create Stripe payment intent for task {}: {}", task.getTaskId(), e.getMessage());
            task.setStatus("FAILED");
            task.setPaymentStatus(TaskPaymentStatus.FAILED.value());
            task.setErrorMessage("Failed to create payment intent: " + e.getMessage());
            task.setCompletedAt(LocalDateTime.now());
            taskRepository.save(task);
            throw new BusinessException(ResultCode.PAYMENT_REQUIRED, "Failed to create payment intent: " + e.getMessage());
        }
    }

    @Transactional
    public Task confirmPayment(User currentUser, String paymentIntentId) {
        Payment payment = paymentRepository.findByPaymentIntentId(paymentIntentId)
                .orElseThrow(() -> new BusinessException(ResultCode.PAYMENT_NOT_FOUND, "Payment not found"));

        if (!payment.getUser().getId().equals(currentUser.getId())) {
            throw new BusinessException(ResultCode.ACCESS_DENIED, "Payment does not belong to current user");
        }

        try {
            PaymentIntent paymentIntent = stripePaymentService.retrievePaymentIntent(paymentIntentId);
            return handlePaymentSuccess(payment, paymentIntent);
        } catch (StripeException e) {
            log.error("Stripe exception while confirming payment {}: {}", paymentIntentId, e.getMessage());
            throw new BusinessException(ResultCode.PAYMENT_VERIFICATION_FAILED,
                    "Failed to verify payment: " + e.getMessage());
        }
    }

    @Transactional
    public Task processWebhookPayment(String paymentIntentId) {
        Payment payment = paymentRepository.findByPaymentIntentId(paymentIntentId)
                .orElseThrow(() -> new BusinessException(ResultCode.PAYMENT_NOT_FOUND, "Payment not found"));
        try {
            PaymentIntent paymentIntent = stripePaymentService.retrievePaymentIntent(paymentIntentId);
            return handlePaymentSuccess(payment, paymentIntent);
        } catch (StripeException e) {
            log.error("Stripe exception while processing webhook for {}: {}", paymentIntentId, e.getMessage());
            throw new BusinessException(ResultCode.PAYMENT_VERIFICATION_FAILED,
                    "Failed to verify payment: " + e.getMessage());
        }
    }

    private Task handlePaymentSuccess(Payment payment, PaymentIntent paymentIntent) {
        if (!"succeeded".equalsIgnoreCase(paymentIntent.getStatus())) {
            throw new BusinessException(ResultCode.PAYMENT_STATE_ERROR,
                    "Payment intent not in succeeded state");
        }

        if (PaymentStatus.SUCCEEDED.value().equals(payment.getStatus())) {
            return payment.getTask();
        }

        populateReceiptUrl(payment, paymentIntent);
        payment.setStatus(PaymentStatus.SUCCEEDED.value());
        payment.setPaymentMethod(paymentIntent.getPaymentMethod());
        paymentRepository.save(payment);

        Task task = payment.getTask();
        task.setPaymentStatus(TaskPaymentStatus.PAID.value());
        task.setPaidAt(LocalDateTime.now());
        task.setStatus("PENDING");
        taskRepository.save(task);

        PricingStrategy strategy = pricingStrategyRepository.findByStrategyCode(task.getPricingStrategyCode())
                .orElse(null);
        quotaService.incrementPaidTaskUsage(payment.getUser(), strategy);

        taskExecutionService.submitTaskToPython(
                task,
                task.getTicker(),
                task.getAnalysisDate().toString(),
                readAnalysts(task.getSelectedAnalysts()),
                task.getResearchDepth()
        );
        return task;
    }

    private void populateReceiptUrl(Payment payment, PaymentIntent paymentIntent) {
        try {
            Charge charge = paymentIntent.getLatestChargeObject();
            if (charge == null && paymentIntent.getLatestCharge() != null) {
                charge = Charge.retrieve(paymentIntent.getLatestCharge());
            }
            if (charge != null) {
                payment.setReceiptUrl(charge.getReceiptUrl());
            }
        } catch (StripeException e) {
            log.warn("Unable to fetch receipt url for payment intent {}: {}", payment.getPaymentIntentId(), e.getMessage());
        }
    }

    public String writeJson(Object payload) {
        if (payload == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (Exception e) {
            throw new BusinessException(ResultCode.INTERNAL_SERVER_ERROR, "Failed to serialize payload");
        }
    }

    @SuppressWarnings("unchecked")
    private java.util.List<String> readAnalysts(String json) {
        if (json == null || json.isBlank()) {
            return java.util.Collections.emptyList();
        }
        try {
            return objectMapper.readValue(json, java.util.List.class);
        } catch (Exception e) {
            log.warn("Failed to parse analysts json: {}", json);
            return java.util.Collections.emptyList();
        }
    }
}
