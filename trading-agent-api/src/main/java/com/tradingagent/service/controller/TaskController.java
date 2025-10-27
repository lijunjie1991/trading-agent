package com.tradingagent.service.controller;

import com.tradingagent.service.common.Result;
import com.tradingagent.service.dto.BillingProfileResponse;
import com.tradingagent.service.dto.PageResponse;
import com.tradingagent.service.dto.TaskPriceQuoteRequest;
import com.tradingagent.service.dto.TaskPriceQuoteResponse;
import com.tradingagent.service.dto.TaskQueryRequest;
import com.tradingagent.service.dto.TaskRequest;
import com.tradingagent.service.dto.TaskResponse;
import com.tradingagent.service.dto.TaskSubmissionResult;
import com.tradingagent.service.service.TaskService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;

    @PostMapping
    public ResponseEntity<Result<TaskSubmissionResult>> submitTask(@Valid @RequestBody TaskRequest request) {
        TaskSubmissionResult response = taskService.submitTask(request);
        return ResponseEntity.ok(Result.success(response, "Task submitted successfully"));
    }

    @PostMapping("/price-quote")
    public ResponseEntity<Result<TaskPriceQuoteResponse>> quoteTask(@Valid @RequestBody TaskPriceQuoteRequest request) {
        TaskPriceQuoteResponse response = taskService.quoteTask(request);
        return ResponseEntity.ok(Result.success(response));
    }

    @GetMapping("/billing/profile")
    public ResponseEntity<Result<BillingProfileResponse>> getBillingProfile() {
        BillingProfileResponse response = taskService.getBillingProfile();
        return ResponseEntity.ok(Result.success(response));
    }

    @GetMapping
    public ResponseEntity<Result<PageResponse<TaskResponse>>> getUserTasks(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer pageSize,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sortOrder) {
        // Build query request with defaults
        TaskQueryRequest queryRequest = TaskQueryRequest.builder()
                .page(page != null ? page : 0)
                .pageSize(pageSize != null ? pageSize : 10)
                .sortBy(sortBy != null ? sortBy : "createdAt")
                .sortOrder(sortOrder != null ? sortOrder : "DESC")
                .build();

        PageResponse<TaskResponse> pageResponse = taskService.getUserTasksWithPagination(queryRequest);
        return ResponseEntity.ok(Result.success(pageResponse));
    }

    @PostMapping("/query")
    public ResponseEntity<Result<PageResponse<TaskResponse>>> queryUserTasks(
            @RequestBody TaskQueryRequest queryRequest) {
        PageResponse<TaskResponse> pageResponse = taskService.getUserTasksWithPagination(queryRequest);
        return ResponseEntity.ok(Result.success(pageResponse, "Tasks retrieved successfully"));
    }

    @GetMapping("/{taskId}")
    public ResponseEntity<Result<TaskResponse>> getTaskById(@PathVariable String taskId) {
        TaskResponse response = taskService.getTaskById(taskId);
        return ResponseEntity.ok(Result.success(response));
    }

    @GetMapping("/{taskId}/reports")
    public ResponseEntity<Result<List<Map<String, Object>>>> getTaskReports(@PathVariable String taskId) {
        List<Map<String, Object>> reports = taskService.getTaskReports(taskId);
        return ResponseEntity.ok(Result.success(reports));
    }

    @GetMapping("/stats")
    public ResponseEntity<Result<Map<String, Long>>> getTaskStats() {
        Map<String, Long> stats = taskService.getTaskStats();
        return ResponseEntity.ok(Result.success(stats));
    }

    @GetMapping("/{taskId}/messages")
    public ResponseEntity<Result<List<Map<String, Object>>>> getTaskMessages(
            @PathVariable String taskId,
            @RequestParam(required = false) String lastTimestamp) {
        List<Map<String, Object>> messages = taskService.getTaskMessages(taskId, lastTimestamp);
        return ResponseEntity.ok(Result.success(messages));
    }
}
