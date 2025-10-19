package com.tradingagent.service.websocket;

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

/**
 * WebSocket Proxy Handler
 *
 * 职责：仅负责在前端和 Python 服务之间转发 WebSocket 消息
 * 数据持久化：由 Python 端直接写入数据库
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketProxyHandler extends TextWebSocketHandler {

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
                // Simply forward message from Python to frontend client
                // Data persistence is now handled by Python service directly writing to database
                if (clientSession.isOpen()) {
                    clientSession.sendMessage(message);
                    log.debug("Forwarded message from Python to client for task: {}", taskId);
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
