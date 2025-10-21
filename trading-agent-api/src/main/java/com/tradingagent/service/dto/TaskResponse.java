package com.tradingagent.service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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
}
