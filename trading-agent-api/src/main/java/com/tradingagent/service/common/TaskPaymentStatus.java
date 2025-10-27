package com.tradingagent.service.common;

public enum TaskPaymentStatus {
    FREE_GRANTED,
    WAITING_PAYMENT,
    PROCESSING,
    PAID,
    FAILED,
    REFUNDED;

    public String value() {
        return name();
    }
}
