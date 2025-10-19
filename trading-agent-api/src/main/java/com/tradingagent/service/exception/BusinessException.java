package com.tradingagent.service.exception;

import com.tradingagent.service.common.ResultCode;
import lombok.Getter;

/**
 * Base business exception
 */
@Getter
public class BusinessException extends RuntimeException {

    private final Integer code;
    private final String message;

    public BusinessException(ResultCode resultCode) {
        super(resultCode.getMessage());
        this.code = resultCode.getCode();
        this.message = resultCode.getMessage();
    }

    public BusinessException(ResultCode resultCode, String customMessage) {
        super(customMessage);
        this.code = resultCode.getCode();
        this.message = customMessage;
    }

    public BusinessException(Integer code, String message) {
        super(message);
        this.code = code;
        this.message = message;
    }

    public BusinessException(String message) {
        super(message);
        this.code = ResultCode.INTERNAL_SERVER_ERROR.getCode();
        this.message = message;
    }
}
