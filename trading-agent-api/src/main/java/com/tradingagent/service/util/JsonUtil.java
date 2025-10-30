package com.tradingagent.service.util;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tradingagent.service.common.ResultCode;
import com.tradingagent.service.exception.BusinessException;
import lombok.extern.slf4j.Slf4j;

import java.util.Collections;
import java.util.List;

/**
 * Utility class for JSON serialization and deserialization.
 *
 * This class provides type-safe JSON conversion methods for common data types
 * used in the application, with proper error handling and logging.
 *
 * @author Trading Agent Team
 * @since 1.0.0
 */
@Slf4j
public class JsonUtil {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    // Private constructor to prevent instantiation
    private JsonUtil() {
        throw new UnsupportedOperationException("Utility class cannot be instantiated");
    }

    /**
     * Convert a list of strings to JSON array format.
     *
     * @param list The list to convert (may be null)
     * @return JSON string representation, or "[]" if list is null/empty
     * @throws BusinessException if serialization fails
     */
    public static String convertListToJson(List<String> list) {
        if (list == null || list.isEmpty()) {
            return "[]";
        }

        try {
            return OBJECT_MAPPER.writeValueAsString(list);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize list to JSON: {}", e.getMessage(), e);
            throw new BusinessException(
                ResultCode.INTERNAL_SERVER_ERROR,
                "Failed to convert list to JSON"
            );
        }
    }

    /**
     * Convert JSON array string to a list of strings.
     *
     * @param json The JSON string to parse (may be null/blank)
     * @return List of strings, or empty list if json is null/blank or parsing fails gracefully
     * @throws BusinessException if JSON is malformed and cannot be parsed
     */
    public static List<String> convertJsonToList(String json) {
        if (json == null || json.isBlank()) {
            return Collections.emptyList();
        }

        try {
            return OBJECT_MAPPER.readValue(json, new TypeReference<List<String>>() {});
        } catch (JsonProcessingException e) {
            log.error("Failed to deserialize JSON to list: {}", e.getMessage(), e);
            throw new BusinessException(
                ResultCode.INTERNAL_SERVER_ERROR,
                "Failed to parse JSON to list"
            );
        }
    }

    /**
     * Convert any object to JSON string.
     *
     * @param object The object to serialize
     * @return JSON string representation
     * @throws BusinessException if serialization fails
     */
    public static String toJson(Object object) {
        if (object == null) {
            return null;
        }

        try {
            return OBJECT_MAPPER.writeValueAsString(object);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize object to JSON: {}", e.getMessage(), e);
            throw new BusinessException(
                ResultCode.INTERNAL_SERVER_ERROR,
                "Failed to convert object to JSON"
            );
        }
    }

    /**
     * Parse JSON string to specified type.
     *
     * @param json The JSON string
     * @param valueType The target class type
     * @param <T> The type parameter
     * @return Deserialized object
     * @throws BusinessException if parsing fails
     */
    public static <T> T fromJson(String json, Class<T> valueType) {
        if (json == null || json.isBlank()) {
            return null;
        }

        try {
            return OBJECT_MAPPER.readValue(json, valueType);
        } catch (JsonProcessingException e) {
            log.error("Failed to deserialize JSON to {}: {}", valueType.getSimpleName(), e.getMessage(), e);
            throw new BusinessException(
                ResultCode.INTERNAL_SERVER_ERROR,
                "Failed to parse JSON to " + valueType.getSimpleName()
            );
        }
    }
}
