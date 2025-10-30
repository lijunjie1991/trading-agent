package com.tradingagent.service.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
public class TaskQuoteResponse {
    // Final pricing
    private BigDecimal totalAmount;
    private String currency;

    // Configuration
    private Integer researchDepth;
    private Integer analystCount;
    private List<String> selectedAnalysts;

    // Pricing breakdown - detailed calculation for transparency
    private BigDecimal basePrice;
    private BigDecimal researchDepthFactor;  // e.g., 1.5 (means 1 + 0.5 multiplier)
    private BigDecimal analystFactor;        // e.g., 1.2 (means 1 + 0.2 multiplier)

    // Free quota information
    private Integer freeQuotaRemaining;
    private Integer freeQuotaTotal;
    private Boolean eligibleForFreeQuota;

    // Calculation explanation (optional, for UI display)
    private String calculationFormula;  // e.g., "$10.00 × 1.5 (depth) × 1.2 (analysts) = $18.00"
}
