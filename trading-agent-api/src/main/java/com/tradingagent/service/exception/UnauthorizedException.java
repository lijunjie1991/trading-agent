package com.tradingagent.service.exception;

import com.tradingagent.service.common.ResultCode;

/**
 * Unauthorized exception (401)
 */
public class UnauthorizedException extends BusinessException {

    public UnauthorizedException(String message) {
        super(ResultCode.UNAUTHORIZED, message);
    }

    public UnauthorizedException(ResultCode resultCode) {
        super(resultCode);
    }

    public UnauthorizedException() {
        super(ResultCode.UNAUTHORIZED);
    }
}
