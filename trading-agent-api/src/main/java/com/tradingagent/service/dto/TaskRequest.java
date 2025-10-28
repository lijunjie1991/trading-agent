package com.tradingagent.service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
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
}
