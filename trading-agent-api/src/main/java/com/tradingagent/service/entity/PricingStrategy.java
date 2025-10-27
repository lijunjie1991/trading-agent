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
@Table(name = "pricing_strategy")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PricingStrategy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "strategy_code", nullable = false, length = 50, unique = true)
    private String strategyCode;

    @Column(length = 255)
    private String description;

    @Column(name = "free_task_quota", nullable = false)
    private Integer freeTaskQuota;

    @Column(name = "base_price_cents", nullable = false)
    private Integer basePriceCents;

    @Column(name = "depth_multiplier", columnDefinition = "JSON", nullable = false)
    private String depthMultiplier;

    @Column(name = "analyst_multiplier", columnDefinition = "JSON", nullable = false)
    private String analystMultiplier;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
