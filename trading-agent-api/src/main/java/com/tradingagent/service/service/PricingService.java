package com.tradingagent.service.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tradingagent.service.common.ResultCode;
import com.tradingagent.service.config.BillingProperties;
import com.tradingagent.service.dto.PricingCalculationResult;
import com.tradingagent.service.entity.PricingStrategy;
import com.tradingagent.service.exception.BusinessException;
import com.tradingagent.service.repository.PricingStrategyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class PricingService {

    private final PricingStrategyRepository pricingStrategyRepository;
    private final BillingProperties billingProperties;
    private final ObjectMapper objectMapper;

    private final ConcurrentHashMap<String, CachedStrategy> strategyCache = new ConcurrentHashMap<>();

    public PricingStrategy getActiveStrategy(String requestedStrategyCode) {
        String strategyCode = resolveStrategyCode(requestedStrategyCode);

        PricingStrategy strategy = loadCachedStrategy(strategyCode);
        if (strategy != null) {
            return strategy;
        }

        strategy = pricingStrategyRepository.findByStrategyCodeAndIsActiveTrue(strategyCode)
                .orElseGet(() -> pricingStrategyRepository
                        .findFirstByIsActiveTrueOrderByUpdatedAtDesc()
                        .orElseThrow(() -> new BusinessException(ResultCode.CONFIGURATION_ERROR,
                                "Unable to locate active pricing strategy")));

        cacheStrategy(strategy);
        return strategy;
    }

    public PricingCalculationResult calculatePrice(PricingStrategy strategy,
                                                   Integer researchDepth,
                                                   List<String> selectedAnalysts) {
        if (strategy == null) {
            throw new BusinessException(ResultCode.CONFIGURATION_ERROR, "Pricing strategy cannot be null");
        }

        int depth = Optional.ofNullable(researchDepth).orElse(1);
        int analystCount = Optional.ofNullable(selectedAnalysts)
                .map(List::size)
                .orElse(0);

        Map<String, Double> depthMultiplierMap = parseMultiplier(strategy.getDepthMultiplier());
        Map<String, Double> analystMultiplierMap = parseMultiplier(strategy.getAnalystMultiplier());

        double depthMultiplier = depthMultiplierMap.getOrDefault(String.valueOf(depth), 1.0d);
        double analystMultiplier = analystMultiplierMap.getOrDefault(String.valueOf(Math.max(analystCount, 1)), 1.0d);

        int basePriceCents = Optional.ofNullable(strategy.getBasePriceCents()).orElse(0);
        int finalAmount = (int) Math.round(basePriceCents * depthMultiplier * analystMultiplier);

        Map<String, Object> breakdown = new LinkedHashMap<>();
        breakdown.put("strategyCode", strategy.getStrategyCode());
        breakdown.put("basePriceCents", basePriceCents);
        breakdown.put("researchDepth", depth);
        breakdown.put("depthMultiplier", depthMultiplier);
        breakdown.put("analystCount", analystCount);
        breakdown.put("analystMultiplier", analystMultiplier);
        breakdown.put("finalAmountCents", finalAmount);

        return PricingCalculationResult.builder()
                .strategyCode(strategy.getStrategyCode())
                .basePriceCents(basePriceCents)
                .researchDepth(depth)
                .depthMultiplier(depthMultiplier)
                .analystCount(analystCount)
                .analystMultiplier(analystMultiplier)
                .finalAmountCents(finalAmount)
                .pricingSnapshot(breakdown)
                .build();
    }

    private String resolveStrategyCode(String requestedStrategyCode) {
        if (requestedStrategyCode != null && !requestedStrategyCode.isBlank()) {
            return requestedStrategyCode.trim();
        }
        if (billingProperties.getDefaultPricingStrategy() != null
                && !billingProperties.getDefaultPricingStrategy().isBlank()) {
            return billingProperties.getDefaultPricingStrategy().trim();
        }
        return "DEFAULT_2024";
    }

    private PricingStrategy loadCachedStrategy(String strategyCode) {
        CachedStrategy cached = strategyCache.get(strategyCode);
        if (cached == null) {
            return null;
        }
        if (cached.expiresAt.isBefore(Instant.now())) {
            strategyCache.remove(strategyCode);
            return null;
        }
        return cached.strategy;
    }

    private void cacheStrategy(PricingStrategy strategy) {
        int ttl = Optional.ofNullable(billingProperties.getPriceCacheTtlSeconds()).orElse(0);
        if (ttl <= 0) {
            return;
        }
        strategyCache.put(strategy.getStrategyCode(),
                new CachedStrategy(strategy, Instant.now().plus(ttl, ChronoUnit.SECONDS)));
    }

    private Map<String, Double> parseMultiplier(String json) {
        if (json == null || json.isBlank()) {
            return Collections.emptyMap();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Double>>() {});
        } catch (Exception ex) {
            log.error("Failed to parse pricing multiplier: {}", json, ex);
            throw new BusinessException(ResultCode.CONFIGURATION_ERROR, "Invalid pricing multiplier configuration");
        }
    }

    private record CachedStrategy(PricingStrategy strategy, Instant expiresAt) {
    }
}
