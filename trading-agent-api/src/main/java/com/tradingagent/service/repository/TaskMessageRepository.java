package com.tradingagent.service.repository;

import com.tradingagent.service.entity.TaskMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface TaskMessageRepository extends JpaRepository<TaskMessage, Long> {

    /**
     * 查询指定任务的所有消息，按时间升序排序
     */
    List<TaskMessage> findByTaskIdOrderByCreatedAtAsc(Long taskId);

    /**
     * 查询指定任务的所有消息，按时间降序排序（最新的在前面）
     */
    List<TaskMessage> findByTaskIdOrderByCreatedAtDesc(Long taskId);

    /**
     * 增量查询：获取指定任务中指定时间之后的消息（升序）
     */
    List<TaskMessage> findByTaskIdAndCreatedAtGreaterThanOrderByCreatedAtAsc(Long taskId, LocalDateTime createdAt);

    /**
     * 增量查询：获取指定任务中指定时间之后的消息（降序，最新的在前面）
     */
    List<TaskMessage> findByTaskIdAndCreatedAtGreaterThanOrderByCreatedAtDesc(Long taskId, LocalDateTime createdAt);

    /**
     * 获取指定任务的消息总数
     */
    Long countByTaskId(Long taskId);
}
