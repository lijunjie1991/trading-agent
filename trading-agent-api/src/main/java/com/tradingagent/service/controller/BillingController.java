package com.tradingagent.service.controller;

import com.tradingagent.service.common.Result;
import com.tradingagent.service.dto.BillingSummaryResponse;
import com.tradingagent.service.dto.TaskQuoteRequest;
import com.tradingagent.service.dto.TaskQuoteResponse;
import com.tradingagent.service.entity.User;
import com.tradingagent.service.service.AuthService;
import com.tradingagent.service.service.PricingService;
import com.tradingagent.service.service.TaskBillingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/billing")
@RequiredArgsConstructor
public class BillingController {

    private final PricingService pricingService;
    private final TaskBillingService taskBillingService;
    private final AuthService authService;

    @GetMapping("/summary")
    public Result<BillingSummaryResponse> getBillingSummary() {
        User currentUser = authService.getCurrentUser();
        var strategy = pricingService.getActiveStrategy();
        int remaining = taskBillingService.getRemainingFreeQuota(currentUser);

        BillingSummaryResponse response = BillingSummaryResponse.builder()
                .freeQuotaTotal(currentUser.getFreeQuotaTotal())
                .freeQuotaUsed(currentUser.getFreeQuotaUsed())
                .freeQuotaRemaining(remaining)
                .paidTaskCount(currentUser.getPaidTaskCount())
                .basePrice(strategy.getBasePrice())
                .researchDepthMultiplier(strategy.getResearchDepthMultiplier())
                .analystMultiplier(strategy.getAnalystMultiplier())
                .currency(strategy.getCurrency())
                .freeTasksPerUser(strategy.getFreeTasksPerUser())
                .build();

        return Result.success(response);
    }

    @PostMapping("/quote")
    public Result<TaskQuoteResponse> quoteTask(@Valid @RequestBody TaskQuoteRequest request) {
        User currentUser = authService.getCurrentUser();
        var strategy = pricingService.getActiveStrategy();
        var quote = pricingService.calculateQuote(strategy, request.getResearchDepth(), request.getSelectedAnalysts());
        int remaining = taskBillingService.getRemainingFreeQuota(currentUser);

        // Build calculation formula for UI display
        String formula = String.format("%s %s × %s (depth factor) × %s (analyst factor) = %s %s",
                quote.getCurrency(),
                quote.getBasePrice(),
                quote.getResearchDepthFactor(),
                quote.getAnalystFactor(),
                quote.getCurrency(),
                quote.getTotalAmount());

        TaskQuoteResponse response = TaskQuoteResponse.builder()
                .totalAmount(quote.getTotalAmount())
                .currency(quote.getCurrency())
                .researchDepth(quote.getResearchDepth())
                .analystCount(quote.getAnalystCount())
                .selectedAnalysts(request.getSelectedAnalysts())
                // Detailed pricing breakdown
                .basePrice(quote.getBasePrice())
                .researchDepthFactor(quote.getResearchDepthFactor())
                .analystFactor(quote.getAnalystFactor())
                // Free quota information
                .freeQuotaRemaining(remaining)
                .freeQuotaTotal(currentUser.getFreeQuotaTotal())
                .eligibleForFreeQuota(remaining > 0)
                // Calculation formula for display
                .calculationFormula(formula)
                .build();

        return Result.success(response);
    }
}
