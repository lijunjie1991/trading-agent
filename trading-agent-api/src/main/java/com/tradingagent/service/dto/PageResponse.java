package com.tradingagent.service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Generic page response DTO for pagination
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PageResponse<T> {

    private List<T> content;            // Page content
    private Integer currentPage;        // Current page number (0-based)
    private Integer pageSize;           // Items per page
    private Long totalElements;         // Total number of elements
    private Integer totalPages;         // Total number of pages
    private Boolean hasNext;            // Has next page
    private Boolean hasPrevious;        // Has previous page

    /**
     * Create page response from Spring Data Page
     */
    public static <T> PageResponse<T> of(org.springframework.data.domain.Page<T> page) {
        return PageResponse.<T>builder()
                .content(page.getContent())
                .currentPage(page.getNumber())
                .pageSize(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .hasNext(page.hasNext())
                .hasPrevious(page.hasPrevious())
                .build();
    }
}
