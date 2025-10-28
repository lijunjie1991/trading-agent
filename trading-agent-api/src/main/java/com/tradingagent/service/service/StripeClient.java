package com.tradingagent.service.service;

import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Event;
import com.stripe.model.PaymentIntent;
import com.stripe.net.RequestOptions;
import com.stripe.net.Webhook;
import com.stripe.param.PaymentIntentCancelParams;
import com.stripe.param.PaymentIntentCreateParams;
import com.tradingagent.service.common.ResultCode;
import com.tradingagent.service.config.StripeProperties;
import com.tradingagent.service.dto.PricingQuote;
import com.tradingagent.service.dto.StripePaymentIntent;
import com.tradingagent.service.entity.Task;
import com.tradingagent.service.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Slf4j
@Component
@RequiredArgsConstructor
public class StripeClient {

  private final StripeProperties stripeProperties;

  public StripePaymentIntent createPaymentIntent(Task task, PricingQuote quote) {
    try {
      PaymentIntentCreateParams params =
          PaymentIntentCreateParams.builder()
              .setCurrency(quote.getCurrency().toLowerCase())
              .setAmount(convertAmountToMinorUnits(quote.getTotalAmount()))
              .setDescription(buildProductDescription(task, quote))
              .putMetadata("taskId", task.getTaskId())
              .putMetadata("userId", task.getUser().getId().toString())
              .putMetadata("ticker", task.getTicker())
              .setAutomaticPaymentMethods(
                  PaymentIntentCreateParams.AutomaticPaymentMethods.builder()
                      .setEnabled(true)
                      .build())
              .build();

      RequestOptions options = buildRequestOptions();
      PaymentIntent paymentIntent = PaymentIntent.create(params, options);

      return StripePaymentIntent.builder()
          .paymentIntentId(paymentIntent.getId())
          .clientSecret(paymentIntent.getClientSecret())
          .build();
    } catch (StripeException e) {
      log.error("Failed to create Stripe payment intent: {}", e.getMessage(), e);
      throw new BusinessException(
          ResultCode.PAYMENT_PROVIDER_ERROR,
          "Unable to create payment intent: " + e.getMessage());
    }
  }

  public void cancelPaymentIntent(String paymentIntentId) {
    if (paymentIntentId == null || paymentIntentId.isBlank()) {
      return;
    }
    try {
      PaymentIntent paymentIntent =
          PaymentIntent.retrieve(paymentIntentId, buildRequestOptions());
      if (paymentIntent == null) {
        return;
      }
      switch (paymentIntent.getStatus()) {
        case "succeeded", "canceled" -> {
          // Nothing to cancel
        }
        default -> paymentIntent.cancel(
            PaymentIntentCancelParams.builder().build(), buildRequestOptions());
      }
    } catch (StripeException e) {
      log.warn("Failed to cancel payment intent {}: {}", paymentIntentId, e.getMessage());
    }
  }

  public String refreshClientSecret(String paymentIntentId) {
    if (paymentIntentId == null || paymentIntentId.isBlank()) {
      return null;
    }
    try {
      PaymentIntent paymentIntent =
          PaymentIntent.retrieve(paymentIntentId, buildRequestOptions());
      return paymentIntent != null ? paymentIntent.getClientSecret() : null;
    } catch (StripeException e) {
      log.error("Failed to retrieve payment intent {}: {}", paymentIntentId, e.getMessage());
      return null;
    }
  }

  public Event constructEvent(String payload, String signatureHeader) {
    try {
      return Webhook.constructEvent(payload, signatureHeader, stripeProperties.getWebhookSecret());
    } catch (SignatureVerificationException e) {
      log.error("Stripe webhook signature verification failed: {}", e.getMessage());
      throw new BusinessException(ResultCode.PAYMENT_PROVIDER_ERROR, "Invalid Stripe signature");
    }
  }

  private RequestOptions buildRequestOptions() {
    return RequestOptions.builder().setApiKey(stripeProperties.getSecretKey()).build();
  }

  private String buildProductDescription(Task task, PricingQuote quote) {
    return String.format(
        "Analysis for %s (Depth %d, Analysts %d)",
        task.getTicker(), quote.getResearchDepth(), quote.getAnalystCount());
  }

  private long convertAmountToMinorUnits(BigDecimal amount) {
    if (amount == null) {
      return 0L;
    }
    return amount.multiply(BigDecimal.valueOf(100)).setScale(0, RoundingMode.HALF_UP).longValue();
  }
}
