package com.tradingagent.service.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
public class TaskQuoteResponse {
    private BigDecimal totalAmount;
    private String currency;
    private Integer researchDepth;
    private Integer analystCount;
    private Integer freeQuotaRemaining;
    private Integer freeQuotaTotal;
    private Boolean eligibleForFreeQuota;
    private List<String> selectedAnalysts;
}
