package com.tradingagent.service.repository;

import com.tradingagent.service.entity.PricingStrategy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PricingStrategyRepository extends JpaRepository<PricingStrategy, Long> {

    PricingStrategy findFirstByCodeAndIsActiveTrueOrderByUpdatedAtDesc(String code);

    PricingStrategy findFirstByIsActiveTrueOrderByUpdatedAtDesc();
}
