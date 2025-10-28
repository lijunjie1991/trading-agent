package com.tradingagent.service.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class StripePaymentIntent {
    private String paymentIntentId;
    private String clientSecret;
}
