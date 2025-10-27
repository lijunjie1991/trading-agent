package com.tradingagent.service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskSubmissionResult {

    private TaskResponse task;
    private TaskPaymentInfo payment;
    private UserQuotaInfo quota;
}
