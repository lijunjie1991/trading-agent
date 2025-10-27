package com.tradingagent.service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserQuotaInfo {

    private Integer freeTasksTotal;
    private Integer freeTasksUsed;
    private Integer freeTasksRemaining;
    private Integer paidTasksTotal;
    private Integer totalTasksUsed;
    private boolean freeQuotaConsumed;
}
