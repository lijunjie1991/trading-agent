package com.tradingagent.service.repository;

import com.tradingagent.service.entity.Task;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long>, JpaSpecificationExecutor<Task> {

    Optional<Task> findByTaskId(String taskId);

    List<Task> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<Task> findByUserIdAndStatusOrderByCreatedAtDesc(Long userId, String status);

    /**
     * Find tasks with pagination and dynamic filtering
     */
    @Query("SELECT t FROM Task t WHERE t.user.id = :userId " +
            "AND (:status IS NULL OR t.status = :status) " +
            "AND (:ticker IS NULL OR LOWER(t.ticker) LIKE LOWER(CONCAT('%', :ticker, '%'))) " +
            "AND (:taskId IS NULL OR t.taskId = :taskId) " +
            "AND (:startDate IS NULL OR t.analysisDate >= :startDate) " +
            "AND (:endDate IS NULL OR t.analysisDate <= :endDate) " +
            "AND (:searchKeyword IS NULL OR " +
            "     LOWER(t.ticker) LIKE LOWER(CONCAT('%', :searchKeyword, '%')) OR " +
            "     LOWER(t.taskId) LIKE LOWER(CONCAT('%', :searchKeyword, '%')) OR " +
            "     LOWER(t.finalDecision) LIKE LOWER(CONCAT('%', :searchKeyword, '%')))")
    Page<Task> findTasksWithFilters(
            @Param("userId") Long userId,
            @Param("status") String status,
            @Param("ticker") String ticker,
            @Param("taskId") String taskId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("searchKeyword") String searchKeyword,
            Pageable pageable
    );
}
