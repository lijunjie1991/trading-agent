package com.tradingagent.service.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
public class PricingQuote {

    private BigDecimal basePrice;
    private BigDecimal totalAmount;
    private BigDecimal researchDepthFactor;
    private BigDecimal analystFactor;
    private Integer researchDepth;
    private Integer analystCount;
    private String currency;
    private Integer freeTasksPerUser;
    private List<String> selectedAnalysts;

    public boolean isFreeEligible(int remainingQuota) {
        return remainingQuota > 0;
    }
}
