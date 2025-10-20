package com.tradingagent.service.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tradingagent.service.common.ResultCode;
import com.tradingagent.service.dto.TaskRequest;
import com.tradingagent.service.dto.TaskResponse;
import com.tradingagent.service.entity.Report;
import com.tradingagent.service.entity.Task;
import com.tradingagent.service.entity.User;
import com.tradingagent.service.exception.BusinessException;
import com.tradingagent.service.exception.ResourceNotFoundException;
import com.tradingagent.service.exception.UnauthorizedException;
import com.tradingagent.service.entity.TaskMessage;
import com.tradingagent.service.repository.ReportRepository;
import com.tradingagent.service.repository.TaskMessageRepository;
import com.tradingagent.service.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;
    private final ReportRepository reportRepository;
    private final TaskMessageRepository taskMessageRepository;
    private final PythonServiceClient pythonServiceClient;
    private final AuthService authService;
    private final ObjectMapper objectMapper;

    public TaskResponse submitTask(TaskRequest request) {
        User currentUser = authService.getCurrentUser();

        // Generate taskId first
        String taskId = java.util.UUID.randomUUID().toString();

        // Save task to database BEFORE submitting to Python
        Task task = Task.builder()
                .taskId(taskId)
                .user(currentUser)
                .ticker(request.getTicker())
                .analysisDate(LocalDate.parse(request.getAnalysisDate()))
                .selectedAnalysts(toJson(request.getSelectedAnalysts()))
                .researchDepth(request.getResearchDepth())
                .status("PENDING")
                .build();

        task = taskRepository.save(task);
        log.info("Task created in database: {}", taskId);

        // Submit task to Python service with the generated taskId
        try {
            Map<String, Object> pythonResponse = pythonServiceClient
                    .submitAnalysisTask(
                            taskId,
                            request.getTicker(),
                            request.getAnalysisDate(),
                            request.getSelectedAnalysts(),
                            request.getResearchDepth()
                    )
                    .block();

            if (pythonResponse == null) {
                throw new BusinessException(ResultCode.PYTHON_SERVICE_ERROR, "Failed to submit task to Python service");
            }
            log.info("Task submitted to Python service: {}", taskId);
        } catch (Exception e) {
            // If Python service fails, update task status to FAILED
            task.setStatus("FAILED");
            task.setErrorMessage("Failed to submit to Python service: " + e.getMessage());
            task.setCompletedAt(LocalDateTime.now());
            taskRepository.save(task);
            log.error("Failed to submit task to Python service: {}", e.getMessage());
            throw new BusinessException(ResultCode.PYTHON_SERVICE_ERROR, "Failed to submit task to Python service: " + e.getMessage());
        }
        return toTaskResponse(task);
    }

    public List<TaskResponse> getUserTasks() {
        User currentUser = authService.getCurrentUser();
        List<Task> tasks = taskRepository.findByUserIdOrderByCreatedAtDesc(currentUser.getId());
        return tasks.stream()
                .map(this::toTaskResponse)
                .collect(Collectors.toList());
    }

    public TaskResponse getTaskById(String taskId) {
        Task task = taskRepository.findByTaskId(taskId)
                .orElseThrow(() -> new ResourceNotFoundException(ResultCode.TASK_NOT_FOUND, "Task not found: " + taskId));

        User currentUser = authService.getCurrentUser();
        if (!task.getUser().getId().equals(currentUser.getId())) {
            throw new UnauthorizedException(ResultCode.ACCESS_DENIED);
        }

        return toTaskResponse(task);
    }

    public List<Map<String, Object>> getTaskReports(String taskId) {
        Task task = taskRepository.findByTaskId(taskId)
                .orElseThrow(() -> new ResourceNotFoundException(ResultCode.TASK_NOT_FOUND, "Task not found: " + taskId));

        User currentUser = authService.getCurrentUser();
        if (!task.getUser().getId().equals(currentUser.getId())) {
            throw new UnauthorizedException(ResultCode.ACCESS_DENIED);
        }

        List<Report> reports = reportRepository.findByTaskIdOrderByCreatedAtAsc(task.getId());
        return reports.stream()
                .map(report -> {
                    Map<String, Object> map = new java.util.HashMap<>();
                    map.put("id", report.getId());
                    map.put("reportType", report.getReportType());
                    map.put("content", report.getContent());
                    map.put("createdAt", report.getCreatedAt());
                    return map;
                })
                .collect(Collectors.toList());
    }

    public Map<String, Long> getTaskStats() {
        User currentUser = authService.getCurrentUser();
        List<Task> userTasks = taskRepository.findByUserIdOrderByCreatedAtDesc(currentUser.getId());

        long total = userTasks.size();
        long pending = userTasks.stream().filter(t -> "PENDING".equals(t.getStatus())).count();
        long running = userTasks.stream().filter(t -> "RUNNING".equals(t.getStatus())).count();
        long completed = userTasks.stream().filter(t -> "COMPLETED".equals(t.getStatus())).count();
        long failed = userTasks.stream().filter(t -> "FAILED".equals(t.getStatus())).count();

        Map<String, Long> stats = new java.util.HashMap<>();
        stats.put("total", total);
        stats.put("pending", pending);
        stats.put("running", running);
        stats.put("completed", completed);
        stats.put("failed", failed);

        return stats;
    }

    public List<Map<String, Object>> getTaskMessages(String taskId, String lastTimestamp) {
        Task task = taskRepository.findByTaskId(taskId)
                .orElseThrow(() -> new ResourceNotFoundException(ResultCode.TASK_NOT_FOUND, "Task not found: " + taskId));

        User currentUser = authService.getCurrentUser();
        if (!task.getUser().getId().equals(currentUser.getId())) {
            throw new UnauthorizedException(ResultCode.ACCESS_DENIED);
        }

        List<TaskMessage> messages;
        if (lastTimestamp != null && !lastTimestamp.isEmpty()) {
            // 增量查询：只获取新消息
            // Parse ISO 8601 format with timezone (e.g., "2025-10-20T14:14:35.000Z")
            LocalDateTime timestamp = OffsetDateTime.parse(lastTimestamp, DateTimeFormatter.ISO_OFFSET_DATE_TIME)
                    .toLocalDateTime();
            messages = taskMessageRepository.findByTaskIdAndCreatedAtGreaterThanOrderByCreatedAtAsc(
                    task.getId(), timestamp);
        } else {
            // 全量查询：获取所有消息
            messages = taskMessageRepository.findByTaskIdOrderByCreatedAtAsc(task.getId());
        }

        return messages.stream()
                .map(message -> {
                    Map<String, Object> map = new java.util.HashMap<>();
                    map.put("id", message.getId());
                    map.put("messageType", message.getMessageType());
                    map.put("content", message.getContent());
                    map.put("createdAt", message.getCreatedAt());
                    return map;
                })
                .collect(Collectors.toList());
    }

    private TaskResponse toTaskResponse(Task task) {
        return TaskResponse.builder()
                .id(task.getId())
                .taskId(task.getTaskId())
                .ticker(task.getTicker())
                .analysisDate(task.getAnalysisDate().toString())
                .selectedAnalysts(fromJson(task.getSelectedAnalysts()))
                .researchDepth(task.getResearchDepth())
                .status(task.getStatus())
                .finalDecision(task.getFinalDecision())
                .errorMessage(task.getErrorMessage())
                .createdAt(task.getCreatedAt())
                .completedAt(task.getCompletedAt())
                .build();
    }

    private String toJson(List<String> list) {
        try {
            return objectMapper.writeValueAsString(list);
        } catch (JsonProcessingException e) {
            throw new BusinessException(ResultCode.INTERNAL_SERVER_ERROR, "Failed to serialize list");
        }
    }

    @SuppressWarnings("unchecked")
    private List<String> fromJson(String json) {
        try {
            return objectMapper.readValue(json, List.class);
        } catch (JsonProcessingException e) {
            throw new BusinessException(ResultCode.INTERNAL_SERVER_ERROR, "Failed to deserialize list");
        }
    }
}
