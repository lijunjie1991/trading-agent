package com.tradingagent.service.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import com.tradingagent.service.entity.enums.PaymentStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "tasks")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "task_id", unique = true, nullable = false, length = 36)
    private String taskId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 20)
    private String ticker;

    @Column(name = "analysis_date", nullable = false)
    private LocalDate analysisDate;

    @Column(name = "selected_analysts", columnDefinition = "TEXT")
    private String selectedAnalysts; // JSON string: ["market", "social", "news"]

    @Column(name = "research_depth")
    @Builder.Default
    private Integer researchDepth = 1;

    @Column(length = 20)
    @Builder.Default
    private String status = "PENDING"; // PENDING, RUNNING, COMPLETED, FAILED

    @Column(name = "final_decision", length = 50)
    private String finalDecision;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    // Statistics fields for real-time tracking
    @Column(name = "tool_calls", nullable = false)
    @Builder.Default
    private Integer toolCalls = 0;

    @Column(name = "llm_calls", nullable = false)
    @Builder.Default
    private Integer llmCalls = 0;

    @Column(name = "reports", nullable = false)
    @Builder.Default
    private Integer reports = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", nullable = false, length = 30)
    @Builder.Default
    private PaymentStatus paymentStatus = PaymentStatus.FREE;

    @Column(name = "billing_amount", precision = 10, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal billingAmount = BigDecimal.ZERO;

    @Column(name = "billing_currency", length = 10, nullable = false)
    @Builder.Default
    private String billingCurrency = "USD";

    @Column(name = "is_free_task", nullable = false)
    @Builder.Default
    private Boolean isFreeTask = Boolean.TRUE;

    @Column(name = "pricing_snapshot", columnDefinition = "TEXT")
    private String pricingSnapshot;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_id")
    private TaskPayment payment;

    @OneToMany(mappedBy = "task", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Report> reportList = new ArrayList<>();
}
