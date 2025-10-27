package com.tradingagent.service.repository;

import com.tradingagent.service.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Optional<Payment> findByPaymentIntentId(String paymentIntentId);

    Optional<Payment> findFirstByTaskIdOrderByCreatedAtDesc(Long taskId);
}
