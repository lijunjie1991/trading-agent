package com.tradingagent.service.entity;

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
@Table(name = "pricing_strategy")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PricingStrategy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "code", nullable = false, unique = true, length = 50)
    private String code;

    @Column(name = "currency", nullable = false, length = 10)
    private String currency;

    @Column(name = "base_price", precision = 10, scale = 2, nullable = false)
    private BigDecimal basePrice;

    @Column(name = "research_depth_multiplier", precision = 8, scale = 4, nullable = false)
    private BigDecimal researchDepthMultiplier;

    @Column(name = "analyst_multiplier", precision = 8, scale = 4, nullable = false)
    private BigDecimal analystMultiplier;

    @Column(name = "free_tasks_per_user", nullable = false)
    private Integer freeTasksPerUser;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
