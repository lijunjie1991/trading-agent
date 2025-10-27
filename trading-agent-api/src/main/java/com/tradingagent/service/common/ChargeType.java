package com.tradingagent.service.common;

public enum ChargeType {
    FREE,
    ONE_TIME;

    public String value() {
        return name();
    }
}
