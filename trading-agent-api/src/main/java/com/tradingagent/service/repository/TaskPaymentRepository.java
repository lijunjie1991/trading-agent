package com.tradingagent.service.repository;

import com.tradingagent.service.entity.TaskPayment;
import com.tradingagent.service.entity.enums.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TaskPaymentRepository extends JpaRepository<TaskPayment, Long> {

    TaskPayment findByTaskTaskId(String taskId);

    TaskPayment findByStripePaymentIntentId(String paymentIntentId);

    Long countByUserIdAndStatus(Long userId, PaymentStatus status);
}
