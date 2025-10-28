package com.tradingagent.service.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class BillingSummaryResponse {
    private Integer freeQuotaTotal;
    private Integer freeQuotaUsed;
    private Integer freeQuotaRemaining;
    private Integer paidTaskCount;
    private BigDecimal basePrice;
    private BigDecimal researchDepthMultiplier;
    private BigDecimal analystMultiplier;
    private String currency;
    private Integer freeTasksPerUser;
}
