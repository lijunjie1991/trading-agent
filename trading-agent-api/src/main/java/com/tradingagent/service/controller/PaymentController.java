package com.tradingagent.service.controller;

import com.stripe.model.Event;
import com.stripe.model.PaymentIntent;
import com.stripe.model.StripeObject;
import com.stripe.model.checkout.Session;
import com.tradingagent.service.common.Result;
import com.tradingagent.service.dto.TaskResponse;
import com.tradingagent.service.entity.TaskPayment;
import com.tradingagent.service.service.StripeClient;
import com.tradingagent.service.service.TaskPaymentService;
import com.tradingagent.service.service.TaskService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final StripeClient stripeClient;
    private final TaskPaymentService taskPaymentService;
    private final TaskService taskService;

    @PostMapping("/webhook")
    public ResponseEntity<String> handleWebhook(
            @RequestHeader("Stripe-Signature") String signature,
            @RequestBody String payload
    ) {
        Event event = stripeClient.constructEvent(payload, signature);
        log.info("Received Stripe event: {}", event.getType());

        switch (event.getType()) {
            case "checkout.session.completed" -> handleCheckoutCompleted(event);
            case "checkout.session.expired" -> handleCheckoutExpired(event);
            case "payment_intent.payment_failed" -> handlePaymentFailed(event);
            default -> log.debug("Unhandled Stripe event type: {}", event.getType());
        }

        return ResponseEntity.ok("{\"received\":true}");
    }

    @PostMapping("/retry/{taskId}")
    public Result<TaskResponse> retryPayment(@PathVariable String taskId) {
        TaskResponse response = taskService.retryPayment(taskId);
        return Result.success(response, "Checkout session refreshed");
    }

    private void handleCheckoutCompleted(Event event) {
        Session session = deserializeEventData(event, Session.class);
        if (session == null) {
            log.warn("Unable to deserialize checkout session for completed event");
            return;
        }
        try {
            TaskPayment payment = taskPaymentService.getRequiredPaymentBySession(session.getId());
            String paymentIntentId = extractPaymentIntentId(session.getPaymentIntent());
            taskPaymentService.updatePaymentIntentId(payment, paymentIntentId);
            taskPaymentService.markPaid(payment);

            boolean dispatched = taskService.dispatchPaidTask(payment.getTask());
            if (!dispatched) {
                log.error("Failed to dispatch task {} to analysis engine after payment completion",
                        payment.getTask().getTaskId());
            }
        } catch (Exception ex) {
            log.error("Error handling checkout.session.completed event: {}", ex.getMessage());
        }
    }

    private void handleCheckoutExpired(Event event) {
        Session session = deserializeEventData(event, Session.class);
        if (session == null) {
            log.warn("Unable to deserialize checkout session for expired event");
            return;
        }
        try {
            TaskPayment payment = taskPaymentService.getRequiredPaymentBySession(session.getId());
            taskPaymentService.markExpired(payment);
            log.info("Marked payment {} as expired for task {}", payment.getId(), payment.getTask().getTaskId());
        } catch (Exception ex) {
            log.error("Error handling checkout.session.expired event: {}", ex.getMessage());
        }
    }

    private void handlePaymentFailed(Event event) {
        PaymentIntent intent = deserializeEventData(event, PaymentIntent.class);
        if (intent == null) {
            log.warn("Unable to deserialize payment intent for failed event");
            return;
        }
        try {
            TaskPayment payment = taskPaymentService.findByPaymentIntentId(intent.getId());
            if (payment == null) {
                String taskId = intent.getMetadata() != null ? intent.getMetadata().get("taskId") : null;
                if (taskId != null) {
                    payment = taskPaymentService.getRequiredPaymentByTaskId(taskId);
                }
            }
            if (payment == null) {
                log.warn("No payment record found for failing payment intent {}", intent.getId());
                return;
            }

            taskPaymentService.updatePaymentIntentId(payment, intent.getId());
            String reason = intent.getLastPaymentError() != null
                    ? intent.getLastPaymentError().getMessage()
                    : "Payment failed";
            taskPaymentService.markFailed(payment, reason);
            log.info("Marked payment {} as failed for task {}: {}", payment.getId(), payment.getTask().getTaskId(), reason);
        } catch (Exception ex) {
            log.error("Error handling payment_intent.payment_failed event: {}", ex.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    private <T extends StripeObject> T deserializeEventData(Event event, Class<T> clazz) {
        try {
            var dataObjectDeserializer = event.getDataObjectDeserializer();
            if (dataObjectDeserializer == null) {
                return null;
            }
            return dataObjectDeserializer.getObject()
                    .filter(clazz::isInstance)
                    .map(obj -> (T) obj)
                    .orElse(null);
        } catch (Exception ex) {
            log.error("Failed to deserialize Stripe event {} data: {}", event.getType(), ex.getMessage());
            return null;
        }
    }

    private String extractPaymentIntentId(Object paymentIntentObj) {
        if (paymentIntentObj == null) {
            return null;
        }
        if (paymentIntentObj instanceof String paymentIntentId) {
            return paymentIntentId;
        }
        if (paymentIntentObj instanceof PaymentIntent paymentIntent) {
            return paymentIntent.getId();
        }
        if (paymentIntentObj instanceof com.stripe.model.ExpandableField<?> expandableField) {
            return expandableField.getId();
        }
        return paymentIntentObj.toString();
    }
}
