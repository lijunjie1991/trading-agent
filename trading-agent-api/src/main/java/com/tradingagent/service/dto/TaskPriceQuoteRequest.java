package com.tradingagent.service.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class TaskPriceQuoteRequest {

    @NotNull(message = "Research depth is required")
    @Min(value = 1, message = "Research depth must be at least 1")
    @Max(value = 5, message = "Research depth cannot exceed 5")
    private Integer researchDepth;

    @NotEmpty(message = "At least one analyst must be selected")
    private List<String> selectedAnalysts;

    private String pricingStrategyCode;
}
