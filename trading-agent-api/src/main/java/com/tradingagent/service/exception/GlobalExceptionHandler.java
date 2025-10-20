package com.tradingagent.service.exception;

import com.tradingagent.service.common.Result;
import com.tradingagent.service.common.ResultCode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.NoHandlerFoundException;

import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Global exception handler for all REST controllers
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    // ==================== Business Exceptions ====================

    /**
     * Handle custom business exceptions
     */
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<Result<Void>> handleBusinessException(BusinessException e, HttpServletRequest request) {
        log.warn("Business exception: {} - {}", e.getCode(), e.getMessage());
        Result<Void> result = Result.error(e.getCode(), e.getMessage(), request.getRequestURI());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(result);
    }

    /**
     * Handle resource not found exceptions
     */
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Result<Void>> handleResourceNotFoundException(ResourceNotFoundException e, HttpServletRequest request) {
        log.warn("Resource not found: {}", e.getMessage());
        Result<Void> result = Result.error(e.getCode(), e.getMessage(), request.getRequestURI());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(result);
    }

    /**
     * Handle unauthorized exceptions
     */
    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<Result<Void>> handleUnauthorizedException(UnauthorizedException e, HttpServletRequest request) {
        log.warn("Unauthorized access: {}", e.getMessage());
        Result<Void> result = Result.error(e.getCode(), e.getMessage(), request.getRequestURI());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(result);
    }

    /**
     * Handle validation exceptions
     */
    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<Result<Void>> handleValidationException(ValidationException e, HttpServletRequest request) {
        log.warn("Validation error: {}", e.getMessage());
        Result<Void> result = Result.error(e.getCode(), e.getMessage(), request.getRequestURI());
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(result);
    }

    // ==================== Security Exceptions ====================

    /**
     * Handle bad credentials (invalid username/password)
     */
    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<Result<Void>> handleBadCredentialsException(BadCredentialsException e, HttpServletRequest request) {
        log.warn("Bad credentials: {}", e.getMessage());
        Result<Void> result = Result.error(ResultCode.INVALID_CREDENTIALS);
        result.setPath(request.getRequestURI());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(result);
    }

    /**
     * Handle access denied (403 Forbidden)
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Result<Void>> handleAccessDeniedException(AccessDeniedException e, HttpServletRequest request) {
        log.warn("Access denied: {}", e.getMessage());
        Result<Void> result = Result.error(ResultCode.FORBIDDEN);
        result.setPath(request.getRequestURI());
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(result);
    }

    /**
     * Handle insufficient authentication
     */
    @ExceptionHandler(InsufficientAuthenticationException.class)
    public ResponseEntity<Result<Void>> handleInsufficientAuthenticationException(
            InsufficientAuthenticationException e, HttpServletRequest request) {
        log.warn("Insufficient authentication: {}", e.getMessage());
        Result<Void> result = Result.error(ResultCode.UNAUTHORIZED);
        result.setPath(request.getRequestURI());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(result);
    }

    // ==================== Validation Exceptions ====================

    /**
     * Handle method argument validation errors (@Valid)
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Result<Map<String, String>>> handleMethodArgumentNotValidException(
            MethodArgumentNotValidException e, HttpServletRequest request) {
        log.warn("Validation failed: {}", e.getMessage());

        Map<String, String> errors = new HashMap<>();
        e.getBindingResult().getAllErrors().forEach(error -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });

        Result<Map<String, String>> result = Result.validationError(errors);
        result.setPath(request.getRequestURI());
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(result);
    }

    /**
     * Handle constraint violation exceptions
     */
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<Result<Map<String, String>>> handleConstraintViolationException(
            ConstraintViolationException e, HttpServletRequest request) {
        log.warn("Constraint violation: {}", e.getMessage());

        Map<String, String> errors = e.getConstraintViolations().stream()
                .collect(Collectors.toMap(
                        violation -> violation.getPropertyPath().toString(),
                        ConstraintViolation::getMessage
                ));

        Result<Map<String, String>> result = Result.validationError(errors);
        result.setPath(request.getRequestURI());
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(result);
    }

    /**
     * Handle missing request parameter
     */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<Result<Void>> handleMissingServletRequestParameterException(
            MissingServletRequestParameterException e, HttpServletRequest request) {
        log.warn("Missing request parameter: {}", e.getMessage());
        String message = String.format("Missing required parameter: %s", e.getParameterName());
        Result<Void> result = Result.error(ResultCode.MISSING_REQUIRED_FIELD, message);
        result.setPath(request.getRequestURI());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(result);
    }

    /**
     * Handle method argument type mismatch
     */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Result<Void>> handleMethodArgumentTypeMismatchException(
            MethodArgumentTypeMismatchException e, HttpServletRequest request) {
        log.warn("Method argument type mismatch: {}", e.getMessage());
        String message = String.format("Invalid value for parameter '%s': %s", e.getName(), e.getValue());
        Result<Void> result = Result.error(ResultCode.INVALID_PARAMETER, message);
        result.setPath(request.getRequestURI());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(result);
    }

    /**
     * Handle HTTP message not readable (invalid JSON)
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Result<Void>> handleHttpMessageNotReadableException(
            HttpMessageNotReadableException e, HttpServletRequest request) {
        log.warn("HTTP message not readable: {}", e.getMessage());
        Result<Void> result = Result.error(ResultCode.BAD_REQUEST, "Invalid request body format");
        result.setPath(request.getRequestURI());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(result);
    }

    // ==================== HTTP Exceptions ====================

    /**
     * Handle HTTP request method not supported
     */
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<Result<Void>> handleHttpRequestMethodNotSupportedException(
            HttpRequestMethodNotSupportedException e, HttpServletRequest request) {
        log.warn("Method not allowed: {}", e.getMessage());
        String message = String.format("HTTP method %s is not supported for this endpoint", e.getMethod());
        Result<Void> result = Result.error(ResultCode.METHOD_NOT_ALLOWED, message);
        result.setPath(request.getRequestURI());
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).body(result);
    }

    /**
     * Handle no handler found (404)
     */
    @ExceptionHandler(NoHandlerFoundException.class)
    public ResponseEntity<Result<Void>> handleNoHandlerFoundException(
            NoHandlerFoundException e, HttpServletRequest request) {
        log.warn("No handler found: {}", e.getMessage());
        Result<Void> result = Result.error(ResultCode.NOT_FOUND, "Endpoint not found");
        result.setPath(request.getRequestURI());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(result);
    }

    // ==================== Generic Exception ====================

    /**
     * Handle all other uncaught exceptions
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Result<Void>> handleException(Exception e, HttpServletRequest request) {
        log.error("Unexpected error occurred: ", e);
        Result<Void> result = Result.error(
                ResultCode.INTERNAL_SERVER_ERROR,
                "An unexpected error occurred. Please try again later.",
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(result);
    }
}
