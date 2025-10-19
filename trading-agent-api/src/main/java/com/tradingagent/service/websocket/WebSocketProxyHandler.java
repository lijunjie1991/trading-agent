package com.tradingagent.service.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tradingagent.service.service.TaskService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.net.URI;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketProxyHandler extends TextWebSocketHandler {

    private final TaskService taskService;
    private final ObjectMapper objectMapper;

    @Value("${python.service.websocket.base-url}")
    private String pythonWebSocketBaseUrl;

    // Map to store connections: clientSession -> pythonSession
    private final Map<String, WebSocketSession> pythonSessions = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession clientSession) throws Exception {
        // Extract taskId from URL
        String path = clientSession.getUri().getPath();
        String taskId = path.substring(path.lastIndexOf('/') + 1);

        log.info("Client connected for task: {}", taskId);

        // Connect to Python WebSocket
        String pythonWsUrl = pythonWebSocketBaseUrl + "/" + taskId;
        StandardWebSocketClient client = new StandardWebSocketClient();

        WebSocketHandler pythonHandler = new TextWebSocketHandler() {
            @Override
            protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
                // Forward message from Python to client
                if (clientSession.isOpen()) {
                    clientSession.sendMessage(message);

                    // Parse message and save to database
                    try {
                        @SuppressWarnings("unchecked")
                        Map<String, Object> data = objectMapper.readValue(message.getPayload(), Map.class);
                        String type = (String) data.get("type");

                        if ("report".equals(type)) {
                            @SuppressWarnings("unchecked")
                            Map<String, Object> reportData = (Map<String, Object>) data.get("data");
                            String reportType = (String) reportData.get("report_type");
                            String content = (String) reportData.get("content");
                            taskService.saveReport(taskId, reportType, content);
                        } else if ("status".equals(type)) {
                            @SuppressWarnings("unchecked")
                            Map<String, Object> statusData = (Map<String, Object>) data.get("data");
                            String status = (String) statusData.get("status");
                            String finalDecision = (String) statusData.get("decision");
                            String errorMessage = (String) statusData.get("error");
                            taskService.updateTaskStatus(taskId, status.toUpperCase(), finalDecision, errorMessage);
                        }
                    } catch (Exception e) {
                        log.error("Error processing WebSocket message", e);
                    }
                }
            }

            @Override
            public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
                log.info("Python WebSocket closed for task: {}", taskId);
                if (clientSession.isOpen()) {
                    clientSession.close();
                }
                pythonSessions.remove(clientSession.getId());
            }
        };

        try {
            WebSocketSession pythonSession = client.execute(pythonHandler, null, new URI(pythonWsUrl)).get();
            pythonSessions.put(clientSession.getId(), pythonSession);
        } catch (Exception e) {
            log.error("Failed to connect to Python WebSocket", e);
            clientSession.close(CloseStatus.SERVER_ERROR);
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession clientSession, TextMessage message) throws Exception {
        // Forward client messages to Python WebSocket (e.g., ping messages)
        WebSocketSession pythonSession = pythonSessions.get(clientSession.getId());
        if (pythonSession != null && pythonSession.isOpen()) {
            pythonSession.sendMessage(message);
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession clientSession, CloseStatus status) throws Exception {
        log.info("Client disconnected: {}", clientSession.getId());
        WebSocketSession pythonSession = pythonSessions.remove(clientSession.getId());
        if (pythonSession != null && pythonSession.isOpen()) {
            pythonSession.close();
        }
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        log.error("WebSocket transport error", exception);
        session.close(CloseStatus.SERVER_ERROR);
    }
}
