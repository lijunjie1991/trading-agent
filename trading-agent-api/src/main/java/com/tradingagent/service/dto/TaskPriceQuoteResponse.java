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
public class TaskPriceQuoteResponse {

    private Integer amountCents;
    private String currency;
    private String pricingStrategyCode;
    private Map<String, Object> pricingBreakdown;
    private boolean freeQuotaAvailable;
    private Integer freeTasksRemaining;
    private Integer freeTasksTotal;
}
