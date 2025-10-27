package com.tradingagent.service.common;

public enum PaymentStatus {
    WAITING_PAYMENT,
    PROCESSING,
    SUCCEEDED,
    FAILED,
    CANCELED,
    REFUNDED;

    public String value() {
        return name();
    }
}
