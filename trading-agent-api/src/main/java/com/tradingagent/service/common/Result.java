package com.tradingagent.service.common;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Unified API response wrapper
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class Result<T> {

    /**
     * Response code (0 = success, non-zero = error)
     */
    private Integer code;

    /**
     * Response message
     */
    private String message;

    /**
     * Response data
     */
    private T data;

    /**
     * Timestamp
     */
    private LocalDateTime timestamp;

    /**
     * Request path (optional, useful for debugging)
     */
    private String path;

    // ==================== Success Response Methods ====================

    /**
     * Success response with data
     */
    public static <T> Result<T> success(T data) {
        return new Result<>(
                ResultCode.SUCCESS.getCode(),
                ResultCode.SUCCESS.getMessage(),
                data,
                LocalDateTime.now(),
                null
        );
    }

    /**
     * Success response with data and custom message
     */
    public static <T> Result<T> success(T data, String message) {
        return new Result<>(
                ResultCode.SUCCESS.getCode(),
                message,
                data,
                LocalDateTime.now(),
                null
        );
    }

    /**
     * Success response without data
     */
    public static <T> Result<T> success() {
        return new Result<>(
                ResultCode.SUCCESS.getCode(),
                ResultCode.SUCCESS.getMessage(),
                null,
                LocalDateTime.now(),
                null
        );
    }

    /**
     * Success response with custom message
     */
    public static <T> Result<T> success(String message) {
        return new Result<>(
                ResultCode.SUCCESS.getCode(),
                message,
                null,
                LocalDateTime.now(),
                null
        );
    }

    // ==================== Error Response Methods ====================

    /**
     * Error response with code and message
     */
    public static <T> Result<T> error(Integer code, String message) {
        return new Result<>(
                code,
                message,
                null,
                LocalDateTime.now(),
                null
        );
    }

    /**
     * Error response with ResultCode enum
     */
    public static <T> Result<T> error(ResultCode resultCode) {
        return new Result<>(
                resultCode.getCode(),
                resultCode.getMessage(),
                null,
                LocalDateTime.now(),
                null
        );
    }

    /**
     * Error response with ResultCode enum and custom message
     */
    public static <T> Result<T> error(ResultCode resultCode, String message) {
        return new Result<>(
                resultCode.getCode(),
                message,
                null,
                LocalDateTime.now(),
                null
        );
    }

    /**
     * Error response with ResultCode enum and custom message
     */
    public static <T> Result<T> error(ResultCode resultCode, String message, String path) {
        return new Result<>(
            resultCode.getCode(),
            message,
            null,
            LocalDateTime.now(),
            null
        );
    }

    /**
     * Error response with code, message, and path
     */
    public static <T> Result<T> error(Integer code, String message, String path) {
        return new Result<>(
                code,
                message,
                null,
                LocalDateTime.now(),
                path
        );
    }

    // ==================== Validation Error Response ====================

    /**
     * Validation error response with field errors
     */
    public static <T> Result<T> validationError(T fieldErrors) {
        return new Result<>(
                ResultCode.VALIDATION_ERROR.getCode(),
                ResultCode.VALIDATION_ERROR.getMessage(),
                fieldErrors,
                LocalDateTime.now(),
                null
        );
    }
}
