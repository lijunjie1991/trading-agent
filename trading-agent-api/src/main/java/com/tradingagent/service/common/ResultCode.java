package com.tradingagent.service.common;

import lombok.Getter;

/**
 * Standard result codes for API responses
 */
@Getter
public enum ResultCode {

    // ==================== Success ====================
    SUCCESS(0, "Success"),

    // ==================== Client Errors (4xx) ====================
    BAD_REQUEST(400, "Bad request"),
    UNAUTHORIZED(401, "Unauthorized"),
    FORBIDDEN(403, "Forbidden"),
    NOT_FOUND(404, "Resource not found"),
    METHOD_NOT_ALLOWED(405, "Method not allowed"),
    VALIDATION_ERROR(422, "Validation error"),

    // ==================== Server Errors (5xx) ====================
    INTERNAL_SERVER_ERROR(500, "Internal server error"),
    SERVICE_UNAVAILABLE(503, "Service unavailable"),
    GATEWAY_TIMEOUT(504, "Gateway timeout"),

    // ==================== Business Errors (1xxx) ====================
    // Authentication & Authorization (10xx)
    INVALID_CREDENTIALS(401, "Invalid email or password"),
    EMAIL_ALREADY_EXISTS(1003, "Email is already registered"),
    ACCESS_DENIED(1006, "Access denied"),

    // Task Related (11xx)
    TASK_NOT_FOUND(1101, "Task not found"),

    // Python Service (12xx)
    PYTHON_SERVICE_ERROR(1201, "Python service error"),

    // Validation (14xx)
    MISSING_REQUIRED_FIELD(1401, "Missing required field"),
    INVALID_PARAMETER(1402, "Invalid parameter"),

    // Configuration (15xx)
    CONFIGURATION_ERROR(1501, "Configuration error"),

    // Payment (16xx)
    PAYMENT_REQUIRED(1601, "Payment required"),
    PAYMENT_NOT_FOUND(1602, "Payment not found"),
    PAYMENT_STATE_ERROR(1603, "Invalid payment state"),
    PAYMENT_VERIFICATION_FAILED(1604, "Payment verification failed"),
    ;

    private final Integer code;
    private final String message;

    ResultCode(Integer code, String message) {
        this.code = code;
        this.message = message;
    }
}
