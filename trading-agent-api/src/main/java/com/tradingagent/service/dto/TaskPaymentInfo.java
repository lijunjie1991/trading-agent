package com.tradingagent.service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskPaymentInfo {

    private boolean required;
    private String paymentIntentId;
    private String clientSecret;
    private Integer amountCents;
    private String currency;
    private String pricingStrategyCode;
    private Map<String, Object> pricingBreakdown;
}
