package com.tradingagent.service.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_quotas")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserQuota {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "free_tasks_total", nullable = false)
    private Integer freeTasksTotal;

    @Column(name = "free_tasks_used", nullable = false)
    @Builder.Default
    private Integer freeTasksUsed = 0;

    @Column(name = "paid_tasks_total", nullable = false)
    @Builder.Default
    private Integer paidTasksTotal = 0;

    @Column(name = "total_tasks_used", nullable = false)
    @Builder.Default
    private Integer totalTasksUsed = 0;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
