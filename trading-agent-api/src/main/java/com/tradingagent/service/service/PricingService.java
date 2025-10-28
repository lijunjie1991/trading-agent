package com.tradingagent.service.service;

import com.tradingagent.service.common.ResultCode;
import com.tradingagent.service.config.StripeProperties;
import com.tradingagent.service.dto.PricingQuote;
import com.tradingagent.service.entity.PricingStrategy;
import com.tradingagent.service.exception.BusinessException;
import com.tradingagent.service.repository.PricingStrategyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class PricingService {

    private static final BigDecimal ONE = BigDecimal.ONE;

    private final PricingStrategyRepository pricingStrategyRepository;
    private final StripeProperties stripeProperties;

    public PricingStrategy getActiveStrategy() {
        PricingStrategy strategy = null;
        if (stripeProperties.getDefaultPricingCode() != null) {
            strategy = pricingStrategyRepository.findFirstByCodeAndIsActiveTrueOrderByUpdatedAtDesc(
                    stripeProperties.getDefaultPricingCode()
            );
        }
        if (strategy == null) {
            strategy = pricingStrategyRepository.findFirstByIsActiveTrueOrderByUpdatedAtDesc();
        }
        if (strategy == null) {
            throw new BusinessException(ResultCode.INTERNAL_SERVER_ERROR, "Active pricing strategy is not configured");
        }
        return strategy;
    }

    public PricingQuote calculateQuote(PricingStrategy strategy,
                                       Integer researchDepth,
                                       List<String> selectedAnalysts) {
        if (strategy == null) {
            throw new BusinessException(ResultCode.INTERNAL_SERVER_ERROR, "Pricing strategy is required");
        }
        int depth = researchDepth != null ? researchDepth : 1;
        int analystCount = selectedAnalysts != null ? selectedAnalysts.size() : 0;

        BigDecimal depthFactor = ONE.add(strategy.getResearchDepthMultiplier()
                .multiply(BigDecimal.valueOf(Math.max(depth - 1, 0))));
        BigDecimal analystFactor = ONE.add(strategy.getAnalystMultiplier()
                .multiply(BigDecimal.valueOf(Math.max(analystCount - 1, 0))));

        BigDecimal total = strategy.getBasePrice()
                .multiply(depthFactor)
                .multiply(analystFactor)
                .setScale(2, RoundingMode.HALF_UP);

        return PricingQuote.builder()
                .basePrice(strategy.getBasePrice())
                .totalAmount(total)
                .researchDepthFactor(depthFactor)
                .analystFactor(analystFactor)
                .researchDepth(depth)
                .analystCount(analystCount)
                .currency(strategy.getCurrency())
                .freeTasksPerUser(strategy.getFreeTasksPerUser())
                .selectedAnalysts(selectedAnalysts)
                .build();
    }
}
