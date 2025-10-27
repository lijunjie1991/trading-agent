package com.tradingagent.service.service;

import com.tradingagent.service.config.StripeProperties;
import com.tradingagent.service.dto.BillingProfileResponse;
import com.tradingagent.service.dto.PricingCalculationResult;
import com.tradingagent.service.dto.TaskPriceQuoteRequest;
import com.tradingagent.service.dto.TaskPriceQuoteResponse;
import com.tradingagent.service.entity.PricingStrategy;
import com.tradingagent.service.entity.User;
import com.tradingagent.service.entity.UserQuota;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class BillingService {

    private final AuthService authService;
    private final PricingService pricingService;
    private final QuotaService quotaService;
    private final StripeProperties stripeProperties;

    public TaskPriceQuoteResponse quoteTask(TaskPriceQuoteRequest request) {
        User user = authService.getCurrentUser();
        PricingStrategy strategy = pricingService.getActiveStrategy(request.getPricingStrategyCode());
        PricingCalculationResult calculation = pricingService.calculatePrice(
                strategy,
                request.getResearchDepth(),
                request.getSelectedAnalysts()
        );

        UserQuota quota = quotaService.getQuotaSnapshot(user, strategy);
        int freeRemaining = Math.max(quota.getFreeTasksTotal() - quota.getFreeTasksUsed(), 0);

        return TaskPriceQuoteResponse.builder()
                .amountCents(calculation.getFinalAmountCents())
                .currency(stripeProperties.getCurrency())
                .pricingStrategyCode(strategy.getStrategyCode())
                .pricingBreakdown(calculation.getPricingSnapshot())
                .freeQuotaAvailable(freeRemaining > 0)
                .freeTasksRemaining(freeRemaining)
                .freeTasksTotal(quota.getFreeTasksTotal())
                .build();
    }

    public BillingProfileResponse getBillingProfile() {
        User user = authService.getCurrentUser();
        PricingStrategy strategy = pricingService.getActiveStrategy(null);
        UserQuota quota = quotaService.getQuotaSnapshot(user, strategy);

        int freeRemaining = Math.max(quota.getFreeTasksTotal() - quota.getFreeTasksUsed(), 0);

        return BillingProfileResponse.builder()
                .freeTasksTotal(quota.getFreeTasksTotal())
                .freeTasksUsed(quota.getFreeTasksUsed())
                .freeTasksRemaining(freeRemaining)
                .paidTasksTotal(quota.getPaidTasksTotal())
                .totalTasksUsed(quota.getTotalTasksUsed())
                .activePricingStrategyCode(strategy.getStrategyCode())
                .build();
    }
}
