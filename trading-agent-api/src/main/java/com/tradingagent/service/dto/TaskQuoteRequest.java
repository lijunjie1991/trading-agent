package com.tradingagent.service.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class TaskQuoteRequest {

    @Min(value = 1, message = "Research depth must be at least 1")
    @Max(value = 5, message = "Research depth must be at most 5")
    private Integer researchDepth;

    @NotEmpty(message = "At least one analyst must be selected")
    private List<String> selectedAnalysts;
}
