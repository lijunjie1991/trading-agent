package com.tradingagent.service.controller;

import com.tradingagent.service.common.Result;
import com.tradingagent.service.dto.PaymentConfirmRequest;
import com.tradingagent.service.dto.TaskResponse;
import com.tradingagent.service.entity.Task;
import com.tradingagent.service.service.AuthService;
import com.tradingagent.service.service.PaymentService;
import com.tradingagent.service.service.StripePaymentService;
import com.tradingagent.service.service.TaskService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
@Slf4j
public class PaymentController {

    private final PaymentService paymentService;
    private final TaskService taskService;
    private final AuthService authService;
    private final StripePaymentService stripePaymentService;

    @PostMapping("/confirm")
    public ResponseEntity<Result<TaskResponse>> confirmPayment(@Valid @RequestBody PaymentConfirmRequest request) {
        Task task = paymentService.confirmPayment(authService.getCurrentUser(), request.getPaymentIntentId());
        TaskResponse taskResponse = taskService.getTaskById(task.getTaskId());
        return ResponseEntity.ok(Result.success(taskResponse, "Payment confirmed"));
    }

    @PostMapping("/stripe/webhook")
    public ResponseEntity<String> handleStripeWebhook(@RequestBody String payload,
                                                      @RequestHeader(value = "Stripe-Signature", required = false) String signatureHeader) {
        if (signatureHeader == null || signatureHeader.isBlank()) {
            log.warn("Missing Stripe-Signature header for webhook");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Missing signature header");
        }

        try {
            var event = stripePaymentService.constructEventFromWebhook(payload, signatureHeader);

            if ("payment_intent.succeeded".equals(event.getType())) {
                var paymentIntent = (com.stripe.model.PaymentIntent) event.getData().getObject();
                paymentService.processWebhookPayment(paymentIntent.getId());
            } else if ("payment_intent.payment_failed".equals(event.getType())) {
                var paymentIntent = (com.stripe.model.PaymentIntent) event.getData().getObject();
                log.warn("Received payment failed event for intent {}", paymentIntent.getId());
            }

            return ResponseEntity.ok("success");
        } catch (com.stripe.exception.SignatureVerificationException e) {
            log.error("Invalid Stripe webhook signature: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid signature");
        } catch (Exception e) {
            log.error("Error processing Stripe webhook: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Webhook processing error");
        }
    }
}
