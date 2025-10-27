package com.tradingagent.service.service;

import com.tradingagent.service.common.ResultCode;
import com.tradingagent.service.config.BillingProperties;
import com.tradingagent.service.entity.PricingStrategy;
import com.tradingagent.service.entity.User;
import com.tradingagent.service.entity.UserQuota;
import com.tradingagent.service.exception.BusinessException;
import com.tradingagent.service.repository.UserQuotaRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class QuotaService {

    private final UserQuotaRepository userQuotaRepository;
    private final BillingProperties billingProperties;

    @Transactional
    public UserQuota initializeQuota(User user, PricingStrategy strategy) {
        if (user == null) {
            throw new BusinessException(ResultCode.INVALID_PARAMETER, "User cannot be null");
        }
        Optional<UserQuota> existing = userQuotaRepository.findByUserId(user.getId());
        if (existing.isPresent()) {
            return existing.get();
        }

        int freeQuota = resolveInitialFreeQuota(strategy);
        UserQuota quota = UserQuota.builder()
                .user(user)
                .freeTasksTotal(freeQuota)
                .freeTasksUsed(0)
                .paidTasksTotal(0)
                .totalTasksUsed(0)
                .build();
        return userQuotaRepository.save(quota);
    }

    @Transactional
    public boolean consumeFreeQuotaIfAvailable(User user, PricingStrategy strategy) {
        UserQuota quota = lockOrCreateQuota(user, strategy);
        if (quota.getFreeTasksUsed() < quota.getFreeTasksTotal()) {
            quota.setFreeTasksUsed(quota.getFreeTasksUsed() + 1);
            quota.setTotalTasksUsed(quota.getTotalTasksUsed() + 1);
            userQuotaRepository.save(quota);
            return true;
        }
        return false;
    }

    @Transactional
    public void incrementPaidTaskUsage(User user, PricingStrategy strategy) {
        UserQuota quota = lockOrCreateQuota(user, strategy);
        quota.setPaidTasksTotal(quota.getPaidTasksTotal() + 1);
        quota.setTotalTasksUsed(quota.getTotalTasksUsed() + 1);
        userQuotaRepository.save(quota);
    }

    public UserQuota getQuotaSnapshot(User user, PricingStrategy strategy) {
        return userQuotaRepository.findByUserId(user.getId())
                .orElseGet(() -> initializeQuota(user, strategy));
    }

    private UserQuota lockOrCreateQuota(User user, PricingStrategy strategy) {
        return userQuotaRepository.findByUserIdForUpdate(user.getId())
                .orElseGet(() -> initializeQuota(user, strategy));
    }

    private int resolveInitialFreeQuota(PricingStrategy strategy) {
        if (strategy != null && strategy.getFreeTaskQuota() != null) {
            return strategy.getFreeTaskQuota();
        }
        return Optional.ofNullable(billingProperties.getFreeTaskLimit()).orElse(5);
    }
}
