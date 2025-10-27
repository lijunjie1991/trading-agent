package com.tradingagent.service.service;

import com.stripe.Stripe;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Event;
import com.stripe.model.PaymentIntent;
import com.stripe.param.EventRetrieveParams;
import com.stripe.param.PaymentIntentCreateParams;
import com.stripe.param.PaymentIntentRetrieveParams;
import com.tradingagent.service.config.StripeProperties;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class StripePaymentService {

    private final StripeProperties stripeProperties;

    @PostConstruct
    public void init() {
        Stripe.apiKey = stripeProperties.getSecretKey();
    }

    public PaymentIntent createPaymentIntent(Long amountCents,
                                             String currency,
                                             String description,
                                             Map<String, String> metadata)
            throws StripeException {
        PaymentIntentCreateParams.Builder builder = PaymentIntentCreateParams.builder()
                .setAmount(amountCents.longValue())
                .setCurrency(currency)
                .setDescription(description)
                .setAutomaticPaymentMethods(
                        PaymentIntentCreateParams.AutomaticPaymentMethods.builder()
                                .setEnabled(true)
                                .build()
                );

        if (metadata != null) {
            metadata.forEach(builder::putMetadata);
        }

        return PaymentIntent.create(builder.build());
    }

    public PaymentIntent retrievePaymentIntent(String paymentIntentId) throws StripeException {
        PaymentIntentRetrieveParams params = PaymentIntentRetrieveParams.builder()
                .addExpand("latest_charge")
                .build();
        return PaymentIntent.retrieve(paymentIntentId, params, null);
    }

    public Event constructEventFromWebhook(String payload, String signatureHeader) throws SignatureVerificationException {
        return com.stripe.net.Webhook.constructEvent(
                payload,
                signatureHeader,
                stripeProperties.getWebhookSecret()
        );
    }

    public Event retrieveEvent(String eventId) throws StripeException {
        EventRetrieveParams params = EventRetrieveParams.builder()
                .addExpand("data.object")
                .build();
        return Event.retrieve(eventId, params, null);
    }

    public String getCurrency() {
        return stripeProperties.getCurrency();
    }
}
