package com.tradingagent.service.exception;

import com.tradingagent.service.common.ResultCode;

/**
 * Resource not found exception
 */
public class ResourceNotFoundException extends BusinessException {

    public ResourceNotFoundException(String message) {
        super(ResultCode.NOT_FOUND, message);
    }

    public ResourceNotFoundException(ResultCode resultCode) {
        super(resultCode);
    }

    public ResourceNotFoundException(ResultCode resultCode, String customMessage) {
        super(resultCode, customMessage);
    }
}
