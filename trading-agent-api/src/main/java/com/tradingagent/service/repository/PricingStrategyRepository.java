package com.tradingagent.service.repository;

import com.tradingagent.service.entity.PricingStrategy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PricingStrategyRepository extends JpaRepository<PricingStrategy, Long> {

    Optional<PricingStrategy> findByStrategyCode(String strategyCode);

    Optional<PricingStrategy> findFirstByIsActiveTrueOrderByUpdatedAtDesc();

    Optional<PricingStrategy> findByStrategyCodeAndIsActiveTrue(String strategyCode);
}
