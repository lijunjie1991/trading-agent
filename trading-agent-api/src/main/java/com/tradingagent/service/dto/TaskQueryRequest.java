package com.tradingagent.service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Task query request DTO for filtering and pagination
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskQueryRequest {

    // Pagination
    private Integer page = 0;           // Page number (0-based)
    private Integer pageSize = 10;      // Items per page

    // Filtering
    private String status;              // Task status filter (PENDING, RUNNING, COMPLETED, FAILED)
    private String ticker;              // Ticker symbol filter
    private String taskId;              // Task ID filter
    private String startDate;           // Analysis date range start (YYYY-MM-DD)
    private String endDate;             // Analysis date range end (YYYY-MM-DD)
    private String searchKeyword;       // Generic search keyword

    // Sorting
    private String sortBy = "createdAt";        // Sort field (createdAt, completedAt, ticker, status)
    private String sortOrder = "DESC";          // Sort order (ASC, DESC)

    /**
     * Validate and set default values
     */
    public void validate() {
        if (page == null || page < 0) {
            page = 0;
        }
        if (pageSize == null || pageSize <= 0) {
            pageSize = 10;
        }
        if (pageSize > 100) {
            pageSize = 100; // Max page size
        }
        if (sortBy == null || sortBy.trim().isEmpty()) {
            sortBy = "createdAt";
        }
        if (sortOrder == null || (!sortOrder.equalsIgnoreCase("ASC") && !sortOrder.equalsIgnoreCase("DESC"))) {
            sortOrder = "DESC";
        }
    }
}
