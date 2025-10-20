package com.tradingagent.service.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PythonServiceClient {

    private final WebClient.Builder webClientBuilder;

    @Value("${python.service.url}")
    private String pythonServiceUrl;

    public Mono<Map<String, Object>> submitAnalysisTask(
            String taskId,
            String ticker,
            String analysisDate,
            List<String> selectedAnalysts,
            Integer researchDepth) {

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("task_id", taskId);  // Include taskId from Java
        requestBody.put("ticker", ticker);
        requestBody.put("analysis_date", analysisDate);
        requestBody.put("selected_analysts", selectedAnalysts);
        requestBody.put("research_depth", researchDepth);

        return webClientBuilder.build()
                .post()
                .uri(pythonServiceUrl + "/api/v1/analysis/start")
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<>() {
                });
    }

    public Mono<Map<String, Object>> getTaskDetail(String taskId) {
        return webClientBuilder.build()
                .get()
                .uri(pythonServiceUrl + "/api/v1/analysis/" + taskId)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<>() {
                });
    }

    public Mono<Map<String, Object>> getTaskReports(String taskId) {
        return webClientBuilder.build()
                .get()
                .uri(pythonServiceUrl + "/api/v1/analysis/" + taskId + "/reports")
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<>() {
                });
    }
}
