package com.tradingagent.service.service;

import com.tradingagent.service.common.ResultCode;
import com.tradingagent.service.entity.Task;
import com.tradingagent.service.exception.BusinessException;
import com.tradingagent.service.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class TaskExecutionService {

    private final PythonServiceClient pythonServiceClient;
    private final TaskRepository taskRepository;

    public void submitTaskToPython(Task task,
                                   String ticker,
                                   String analysisDate,
                                   java.util.List<String> selectedAnalysts,
                                   Integer researchDepth) {
        try {
            task.setQueuedAt(LocalDateTime.now());
            taskRepository.save(task);

            Map<String, Object> pythonResponse = pythonServiceClient
                    .submitAnalysisTask(
                            task.getTaskId(),
                            ticker,
                            analysisDate,
                            selectedAnalysts,
                            researchDepth
                    )
                    .block();

            if (pythonResponse == null) {
                throw new BusinessException(ResultCode.PYTHON_SERVICE_ERROR, "Failed to submit task to Python service");
            }
            log.info("Task submitted to Python service: {}", task.getTaskId());
        } catch (Exception e) {
            log.error("Failed to submit task {} to Python service: {}", task.getTaskId(), e.getMessage());
            task.setStatus("FAILED");
            task.setErrorMessage("Failed to submit to Python service: " + e.getMessage());
            task.setCompletedAt(LocalDateTime.now());
            taskRepository.save(task);
            throw new BusinessException(ResultCode.PYTHON_SERVICE_ERROR,
                    "Failed to submit task to Python service: " + e.getMessage());
        }
    }
}
