package com.tradingagent.service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskResponse {

    private Long id;
    private String taskId;
    private String ticker;
    private String analysisDate;
    private List<String> selectedAnalysts;
    private Integer researchDepth;
    private String status;
    private String finalDecision;
    private String errorMessage;
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;

    // Statistics fields
    private Integer toolCalls;
    private Integer llmCalls;
    private Integer reports;

    // Billing fields
    private String paymentStatus;
    private BigDecimal billingAmount;
    private String billingCurrency;
    private Boolean freeTask;
    private Boolean paymentRequired;
    private String paymentIntentId;
    private String paymentClientSecret;
    private Integer freeQuotaTotal;
    private Integer freeQuotaRemaining;
    private Integer paidTaskCount;

    // Pricing breakdown - parsed from pricingSnapshot if available
    private PricingBreakdown pricingBreakdown;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PricingBreakdown {
        private BigDecimal basePrice;
        private BigDecimal researchDepthFactor;
        private BigDecimal analystFactor;
        private BigDecimal researchDepthMultiplier;
        private BigDecimal analystMultiplier;
        private String calculationFormula;
    }
}
