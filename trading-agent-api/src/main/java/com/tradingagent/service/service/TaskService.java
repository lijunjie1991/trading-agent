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
import com.tradingagent.service.repository.ReportRepository;
import com.tradingagent.service.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;
    private final ReportRepository reportRepository;
    private final PythonServiceClient pythonServiceClient;
    private final AuthService authService;
    private final ObjectMapper objectMapper;

    @Transactional
    public TaskResponse submitTask(TaskRequest request) {
        User currentUser = authService.getCurrentUser();

        // Submit task to Python service
        Map<String, Object> pythonResponse = pythonServiceClient
                .submitAnalysisTask(
                        request.getTicker(),
                        request.getAnalysisDate(),
                        request.getSelectedAnalysts(),
                        request.getResearchDepth()
                )
                .block();

        if (pythonResponse == null) {
            throw new BusinessException(ResultCode.PYTHON_SERVICE_ERROR, "Failed to submit task to Python service");
        }

        String taskId = (String) pythonResponse.get("task_id");

        // Save task to database
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

    // ==================== 已废弃的方法 ====================
    // 以下方法已不再使用，因为 Python 服务直接写入数据库
    // 保留这些方法仅为了向后兼容，实际数据由 Python 端维护

    /**
     * @deprecated Python 服务直接写入数据库，此方法已废弃
     */
    @Deprecated
    @Transactional
    public void updateTaskStatus(String taskId, String status, String finalDecision, String errorMessage) {
        log.warn("updateTaskStatus is deprecated - Python service writes to DB directly");
        // 保留空实现，避免调用报错
    }

    /**
     * @deprecated Python 服务直接写入数据库，此方法已废弃
     */
    @Deprecated
    @Transactional
    public void saveReport(String taskId, String reportType, String content) {
        log.warn("saveReport is deprecated - Python service writes to DB directly");
        // 保留空实现，避免调用报错
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
