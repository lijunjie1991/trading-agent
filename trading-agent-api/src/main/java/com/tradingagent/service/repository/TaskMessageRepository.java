package com.tradingagent.service.repository;

import com.tradingagent.service.entity.TaskMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface TaskMessageRepository extends JpaRepository<TaskMessage, Long> {

    /**
     * 查询指定任务的所有消息，按时间排序
     */
    List<TaskMessage> findByTaskIdOrderByCreatedAtAsc(Long taskId);

    /**
     * 增量查询：获取指定任务中指定时间之后的消息
     */
    List<TaskMessage> findByTaskIdAndCreatedAtGreaterThanOrderByCreatedAtAsc(Long taskId, LocalDateTime createdAt);

    /**
     * 获取指定任务的消息总数
     */
    Long countByTaskId(Long taskId);
}
