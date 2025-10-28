package com.tradingagent.service.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class StripeCheckoutSession {
    private String sessionId;
    private String paymentIntentId;
    private String url;
}
