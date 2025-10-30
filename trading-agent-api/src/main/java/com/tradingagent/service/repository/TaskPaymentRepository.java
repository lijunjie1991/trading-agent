package com.tradingagent.service.repository;

import com.tradingagent.service.entity.TaskPayment;
import com.tradingagent.service.entity.enums.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface TaskPaymentRepository extends JpaRepository<TaskPayment, Long> {

    @Query("SELECT tp FROM TaskPayment tp JOIN Task t ON tp.taskId = t.id WHERE t.taskId = :taskId")
    TaskPayment findByTaskTaskId(@Param("taskId") String taskId);

    TaskPayment findByTaskId(Long taskId);

    TaskPayment findByStripePaymentIntentId(String paymentIntentId);

    Long countByUserIdAndStatus(Long userId, PaymentStatus status);
}
