package com.tradingagent.service.entity;

import com.tradingagent.service.entity.enums.PaymentStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "task_payments")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskPayment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "task_id", nullable = false)
    private Long taskId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "stripe_payment_intent_id", length = 255)
    private String stripePaymentIntentId;

    @Column(name = "stripe_client_secret", length = 255)
    private String stripeClientSecret;

    @Column(name = "amount", precision = 10, scale = 2, nullable = false)
    private BigDecimal amount;

    @Column(name = "currency", length = 10, nullable = false)
    private String currency;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 30, nullable = false)
    @Builder.Default
    private PaymentStatus status = PaymentStatus.AWAITING_PAYMENT;

    @Column(name = "pricing_snapshot", columnDefinition = "TEXT")
    private String pricingSnapshot;

    @Column(name = "is_free", nullable = false)
    @Builder.Default
    private Boolean isFree = Boolean.FALSE;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;
}
