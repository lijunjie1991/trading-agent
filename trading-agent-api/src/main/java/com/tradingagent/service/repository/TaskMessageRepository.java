package com.tradingagent.service.repository;

import com.tradingagent.service.entity.TaskMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface TaskMessageRepository extends JpaRepository<TaskMessage, Long> {

    /**
     * Query all messages for the specified task，Sort by time in ascending order
     */
    List<TaskMessage> findByTaskIdOrderByCreatedAtAsc(Long taskId);

    /**
     * Query all messages for the specified task，By timeDescending ordersorted（Latest first）
     */
    List<TaskMessage> findByTaskIdOrderByCreatedAtDesc(Long taskId);

    /**
     * Incremental query：GetspecifiedTaskmessages after the specified time（ascending）
     */
    List<TaskMessage> findByTaskIdAndCreatedAtGreaterThanOrderByCreatedAtAsc(Long taskId, LocalDateTime createdAt);

    /**
     * Incremental query：GetspecifiedTaskmessages after the specified time（Descending order，Latest first）
     */
    List<TaskMessage> findByTaskIdAndCreatedAtGreaterThanOrderByCreatedAtDesc(Long taskId, LocalDateTime createdAt);

    /**
     * GetspecifiedTask message count
     */
    Long countByTaskId(Long taskId);
}
