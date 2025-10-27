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
public class PricingCalculationResult {

    private String strategyCode;
    private Integer basePriceCents;
    private Integer researchDepth;
    private Double depthMultiplier;
    private Integer analystCount;
    private Double analystMultiplier;
    private Integer finalAmountCents;
    private Map<String, Object> pricingSnapshot;
}
