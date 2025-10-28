package com.tradingagent.service.service;

import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Event;
import com.stripe.model.checkout.Session;
import com.stripe.net.RequestOptions;
import com.stripe.net.Webhook;
import com.stripe.param.checkout.SessionCreateParams;
import com.tradingagent.service.common.ResultCode;
import com.tradingagent.service.config.StripeProperties;
import com.tradingagent.service.dto.PricingQuote;
import com.tradingagent.service.dto.StripeCheckoutSession;
import com.tradingagent.service.entity.Task;
import com.tradingagent.service.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class StripeClient {

  private final StripeProperties stripeProperties;

  public StripeCheckoutSession createCheckoutSession(
      Task task, PricingQuote quote, String successUrl, String cancelUrl) {
    try {
      SessionCreateParams.LineItem.PriceData priceData =
          SessionCreateParams.LineItem.PriceData.builder()
              .setCurrency(quote.getCurrency().toLowerCase())
              .setUnitAmount(convertAmountToMinorUnits(quote.getTotalAmount()))
              .setProductData(
                  SessionCreateParams.LineItem.PriceData.ProductData.builder()
                      .setName(buildProductName(task, quote))
                      .build())
              .build();

      Map<String, String> metadata = new HashMap<>();
      metadata.put("taskId", task.getTaskId());
      metadata.put("userId", task.getUser().getId().toString());
      metadata.put("ticker", task.getTicker());

      SessionCreateParams.PaymentIntentData paymentIntentData =
          SessionCreateParams.PaymentIntentData.builder()
              .putMetadata("taskId", task.getTaskId())
              .putMetadata("userId", task.getUser().getId().toString())
              .build();

      SessionCreateParams params =
          SessionCreateParams.builder()
              .setMode(SessionCreateParams.Mode.PAYMENT)
              .setSuccessUrl(successUrl != null ? successUrl : buildSuccessUrl())
              .setCancelUrl(cancelUrl != null ? cancelUrl : buildCancelUrl())
              .addPaymentMethodType(SessionCreateParams.PaymentMethodType.CARD)
              .addLineItem(
                  SessionCreateParams.LineItem.builder()
                      .setQuantity(1L)
                      .setPriceData(priceData)
                      .build())
              .putAllMetadata(metadata)
              .setClientReferenceId(task.getTaskId())
              .setCustomerEmail(task.getUser().getEmail())
              .setPaymentIntentData(paymentIntentData)
              .build();

      RequestOptions options =
          RequestOptions.builder().setApiKey(stripeProperties.getSecretKey()).build();

      Session session = Session.create(params, options);

      return StripeCheckoutSession.builder()
          .sessionId(session.getId())
          .paymentIntentId(extractPaymentIntentId(session))
          .url(session.getUrl())
          .build();
    } catch (StripeException e) {
      log.error("Failed to create Stripe checkout session: {}", e.getMessage(), e);
      throw new BusinessException(
          ResultCode.PAYMENT_PROVIDER_ERROR,
          "Unable to create checkout session: " + e.getMessage());
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

  private String buildProductName(Task task, PricingQuote quote) {
    return String.format(
        "Analysis for %s (Depth %d, Analysts %d)",
        task.getTicker(), quote.getResearchDepth(), quote.getAnalystCount());
  }

  private String buildSuccessUrl() {
    return appendSessionPlaceholder(stripeProperties.getSuccessUrl());
  }

  private String buildCancelUrl() {
    return appendSessionPlaceholder(stripeProperties.getCancelUrl());
  }

  private String appendSessionPlaceholder(String url) {
    if (url == null || url.isBlank()) {
      throw new BusinessException(
          ResultCode.PAYMENT_PROVIDER_ERROR, "Stripe redirect URL is not configured");
    }
    if (url.contains("{CHECKOUT_SESSION_ID}")) {
      return url;
    }
    String delimiter = url.contains("?") ? "&" : "?";
    return url + delimiter + "session_id={CHECKOUT_SESSION_ID}";
  }

  private long convertAmountToMinorUnits(BigDecimal amount) {
    if (amount == null) {
      return 0L;
    }
    return amount.multiply(BigDecimal.valueOf(100)).setScale(0, RoundingMode.HALF_UP).longValue();
  }

  private String extractPaymentIntentId(Session session) {
    if (session == null) {
      return null;
    }
    Object paymentIntentObj = session.getPaymentIntent();
    return switch (paymentIntentObj) {
      case null -> null;
      case String paymentIntentId -> paymentIntentId;
      default -> paymentIntentObj.toString();
    };
  }
}
