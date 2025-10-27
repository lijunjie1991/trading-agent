package com.tradingagent.service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class TaskRequest {

    @NotBlank(message = "Ticker is required")
    private String ticker;

    @NotBlank(message = "Analysis date is required")
    private String analysisDate; // Format: YYYY-MM-DD

    @NotEmpty(message = "At least one analyst must be selected")
    private List<String> selectedAnalysts; // ["market", "social", "news", "fundamentals"]

    @NotNull(message = "Research depth is required")
    private Integer researchDepth; // 1-5

    @Size(max = 50, message = "Strategy code cannot exceed 50 characters")
    private String pricingStrategyCode;

    @Size(max = 50, message = "Coupon code cannot exceed 50 characters")
    private String couponCode;

    @Size(max = 100, message = "Client reference cannot exceed 100 characters")
    private String clientReferenceId;

    private Boolean riskDisclosureAccepted;
}
