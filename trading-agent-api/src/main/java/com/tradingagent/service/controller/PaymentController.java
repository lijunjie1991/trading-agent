package com.tradingagent.service.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.stripe.model.Event;
import com.stripe.model.PaymentIntent;
import com.stripe.model.StripeObject;
import com.tradingagent.service.common.Result;
import com.tradingagent.service.common.ResultCode;
import com.tradingagent.service.dto.TaskResponse;
import com.tradingagent.service.entity.Task;
import com.tradingagent.service.entity.TaskPayment;
import com.tradingagent.service.exception.BusinessException;
import com.tradingagent.service.repository.TaskRepository;
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
  private final TaskRepository taskRepository;
  private final TaskService taskService;
  private final ObjectMapper objectMapper;

  @PostMapping("/webhook")
  public ResponseEntity<String> handleWebhook(
      @RequestHeader("Stripe-Signature") String signature,
      @RequestBody String payload
  ) {
    Event event = stripeClient.constructEvent(payload, signature);
    log.info("Received Stripe event: {}", event.getType());

    switch (event.getType()) {
      case "payment_intent.succeeded" -> handlePaymentSucceeded(event);
      case "payment_intent.payment_failed" -> handlePaymentFailed(event);
      case "payment_intent.canceled" -> handlePaymentCanceled(event);
      default -> log.debug("Unhandled Stripe event type: {}", event.getType());
    }

    return ResponseEntity.ok("{\"received\":true}");
  }

  @PostMapping("/retry/{taskId}")
  public Result<TaskResponse> retryPayment(@PathVariable String taskId) {
    TaskResponse response = taskService.retryPayment(taskId);
    return Result.success(response, "Payment intent refreshed");
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

      taskPaymentService.updatePaymentIntent(payment, intent.getId(), intent.getClientSecret());
      String reason = intent.getLastPaymentError() != null
          ? intent.getLastPaymentError().getMessage()
          : "Payment failed";
      taskPaymentService.markFailed(payment, reason);
      Task task = taskRepository.findById(payment.getTaskId())
              .orElseThrow(() -> new BusinessException(ResultCode.TASK_NOT_FOUND, "Task not found"));
      log.info("Marked payment {} as failed for task {}: {}", payment.getId(), task.getTaskId(), reason);
    } catch (Exception ex) {
      log.error("Error handling payment_intent.payment_failed event: {}", ex.getMessage());
      throw ex;
    }
  }

  private void handlePaymentSucceeded(Event event) {
    PaymentIntent intent = deserializeEventData(event, PaymentIntent.class);
    if (intent == null) {
      log.warn("Unable to deserialize payment intent for succeeded event");
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
        log.warn("No payment record found for succeeded payment intent {}", intent.getId());
        return;
      }

      taskPaymentService.updatePaymentIntent(payment, intent.getId(), intent.getClientSecret());
      taskPaymentService.markPaid(payment);

      Task task = taskRepository.findById(payment.getTaskId())
              .orElseThrow(() -> new BusinessException(ResultCode.TASK_NOT_FOUND, "Task not found"));
      boolean dispatched = taskService.dispatchPaidTask(task);
      if (!dispatched) {
        log.error("Failed to dispatch task {} to analysis engine after payment completion",
            task.getTaskId());
      }
    } catch (Exception ex) {
      log.error("Error handling payment_intent.succeeded event: {}", ex.getMessage());
      throw ex;
    }
  }

  private void handlePaymentCanceled(Event event) {
    PaymentIntent intent = deserializeEventData(event, PaymentIntent.class);
    if (intent == null) {
      log.warn("Unable to deserialize payment intent for canceled event");
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
        log.warn("No payment record found for canceled payment intent {}", intent.getId());
        return;
      }

      taskPaymentService.updatePaymentIntent(payment, intent.getId(), intent.getClientSecret());
      taskPaymentService.markExpired(payment);
      Task task = taskRepository.findById(payment.getTaskId())
              .orElseThrow(() -> new BusinessException(ResultCode.TASK_NOT_FOUND, "Task not found"));
      log.info("Marked payment {} as canceled for task {}", payment.getId(), task.getTaskId());
    } catch (Exception ex) {
      log.error("Error handling payment_intent.canceled event: {}", ex.getMessage());
      throw ex;
    }
  }

  @SuppressWarnings("unchecked")
  private <T extends StripeObject> T deserializeEventData(Event event, Class<T> clazz) {
    try {
      var dataObjectDeserializer = event.getDataObjectDeserializer();
      if (dataObjectDeserializer == null) {
        return null;
      }
      var optionalObject = dataObjectDeserializer.getObject();
      if (optionalObject.isPresent() && clazz.isInstance(optionalObject.get())) {
        return (T) optionalObject.get();
      }
      String rawJson = dataObjectDeserializer.getRawJson();
      if (rawJson != null && !rawJson.isBlank()) {
        return objectMapper.readValue(rawJson, clazz);
      }
    } catch (Exception ex) {
      log.error("Failed to deserialize Stripe event {} data: {}", event.getType(), ex.getMessage());
      throw new RuntimeException("Failed to deserialize Stripe event data", ex);
    }
    return null;
  }
}
