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
@Table(name = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 100)
    private String email;

    @Column(nullable = false)
    private String password;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "free_quota_total", nullable = false)
    @Builder.Default
    private Integer freeQuotaTotal = 0;

    @Column(name = "free_quota_used", nullable = false)
    @Builder.Default
    private Integer freeQuotaUsed = 0;

    @Column(name = "paid_task_count", nullable = false)
    @Builder.Default
    private Integer paidTaskCount = 0;

    @Column(name = "free_quota_last_reset")
    private LocalDateTime freeQuotaLastReset;
}
