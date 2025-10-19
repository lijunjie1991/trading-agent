package com.tradingagent.service.exception;

import com.tradingagent.service.common.ResultCode;

/**
 * Validation exception
 */
public class ValidationException extends BusinessException {

    public ValidationException(String message) {
        super(ResultCode.VALIDATION_ERROR, message);
    }

    public ValidationException(ResultCode resultCode) {
        super(resultCode);
    }

    public ValidationException(ResultCode resultCode, String customMessage) {
        super(resultCode, customMessage);
    }
}
