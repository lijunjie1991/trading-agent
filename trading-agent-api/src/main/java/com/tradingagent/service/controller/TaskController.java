package com.tradingagent.service.controller;

import com.tradingagent.service.common.Result;
import com.tradingagent.service.dto.TaskRequest;
import com.tradingagent.service.dto.TaskResponse;
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
    public ResponseEntity<Result<TaskResponse>> submitTask(@Valid @RequestBody TaskRequest request) {
        TaskResponse response = taskService.submitTask(request);
        return ResponseEntity.ok(Result.success(response, "Task submitted successfully"));
    }

    @GetMapping
    public ResponseEntity<Result<List<TaskResponse>>> getUserTasks() {
        List<TaskResponse> tasks = taskService.getUserTasks();
        return ResponseEntity.ok(Result.success(tasks));
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
}
