package com.tradingagent.service.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PaymentConfirmRequest {

    @NotBlank(message = "paymentIntentId is required")
    private String paymentIntentId;
}
