package com.tradingagent.service.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tradingagent.service.common.ResultCode;
import com.tradingagent.service.dto.PricingQuote;
import com.tradingagent.service.entity.User;
import com.tradingagent.service.exception.BusinessException;
import com.tradingagent.service.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class TaskBillingService {

    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public boolean hasRemainingFreeQuota(User user) {
        return user != null && user.getFreeQuotaUsed() < user.getFreeQuotaTotal();
    }

    public int getRemainingFreeQuota(User user) {
        if (user == null) {
            return 0;
        }
        return Math.max(user.getFreeQuotaTotal() - user.getFreeQuotaUsed(), 0);
    }

    @Transactional
    public void consumeFreeQuota(User user) {
        if (user == null) {
            return;
        }
        user.setFreeQuotaUsed(user.getFreeQuotaUsed() + 1);
        userRepository.save(user);
    }

    @Transactional
    public void restoreFreeQuota(User user) {
        if (user == null) {
            return;
        }
        if (user.getFreeQuotaUsed() > 0) {
            user.setFreeQuotaUsed(user.getFreeQuotaUsed() - 1);
            userRepository.save(user);
        }
    }

    @Transactional
    public void incrementPaidTaskCount(User user) {
        if (user == null) {
            return;
        }
        user.setPaidTaskCount(user.getPaidTaskCount() + 1);
        userRepository.save(user);
    }

    @Transactional
    public void incrementPaidTaskCountByUserId(Long userId) {
        if (userId == null) {
            return;
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ResultCode.INTERNAL_SERVER_ERROR, "User not found"));
        user.setPaidTaskCount(user.getPaidTaskCount() + 1);
        userRepository.save(user);
    }

    public String buildPricingSnapshot(PricingQuote quote) {
        if (quote == null) {
            return null;
        }
        Map<String, Object> snapshot = new HashMap<>();
        snapshot.put("basePrice", quote.getBasePrice());
        snapshot.put("totalAmount", quote.getTotalAmount());
        snapshot.put("researchDepth", quote.getResearchDepth());
        snapshot.put("researchDepthFactor", quote.getResearchDepthFactor());
        snapshot.put("analystCount", quote.getAnalystCount());
        snapshot.put("analystFactor", quote.getAnalystFactor());
        snapshot.put("currency", quote.getCurrency());
        snapshot.put("selectedAnalysts", quote.getSelectedAnalysts());

        try {
            return objectMapper.writeValueAsString(snapshot);
        } catch (JsonProcessingException e) {
            throw new BusinessException(ResultCode.INTERNAL_SERVER_ERROR, "Failed to serialize pricing snapshot");
        }
    }
}
