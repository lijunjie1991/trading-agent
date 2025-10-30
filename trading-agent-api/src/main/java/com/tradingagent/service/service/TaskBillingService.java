package com.tradingagent.service.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tradingagent.service.common.ResultCode;
import com.tradingagent.service.dto.PricingQuote;
import com.tradingagent.service.entity.User;
import com.tradingagent.service.exception.BusinessException;
import com.tradingagent.service.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

/**
 * Service responsible for task billing and user quota management.
 *
 * <p>This service handles all billing-related operations including: - Free quota tracking and
 * consumption - Paid task counting - Pricing snapshot serialization
 *
 * <p>All quota operations are transactional to ensure data consistency.
 *
 * @author Trading Agent Team
 * @since 1.0.0
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TaskBillingService {

  private final UserRepository userRepository;
  private final ObjectMapper objectMapper;

  // ==================== Free Quota Management ====================

  /**
   * Check if user has remaining free quota.
   *
   * @param user The user to check (must not be null)
   * @return true if user has at least one free quota remaining, false otherwise
   */
  public boolean hasRemainingFreeQuota(User user) {
    if (user == null) {
      log.warn("Null user passed to hasRemainingFreeQuota check");
      return false;
    }
    return user.getFreeQuotaUsed() < user.getFreeQuotaTotal();
  }

  /**
   * Get the number of remaining free quotas for a user.
   *
   * @param user The user to check
   * @return Number of remaining free quotas (0 if user is null or has no quota)
   */
  public int getRemainingFreeQuota(User user) {
    if (user == null) {
      return 0;
    }
    int remaining = user.getFreeQuotaTotal() - user.getFreeQuotaUsed();
    return Math.max(remaining, 0);
  }

  /**
   * Consume one free quota from user's account.
   *
   * <p>This operation is transactional and will increment the user's quota usage counter. If user
   * has no remaining quota, this method will still execute but may result in negative quota balance
   * (caller should check hasRemainingFreeQuota first).
   *
   * @param user The user whose quota to consume (must not be null)
   * @throws BusinessException if user is null or database update fails
   */
  @Transactional(rollbackFor = Exception.class)
  public void consumeFreeQuota(User user) {
    if (user == null) {
      throw new BusinessException(ResultCode.INVALID_PARAMETER, "User cannot be null");
    }

    int usedBefore = user.getFreeQuotaUsed();
    user.setFreeQuotaUsed(usedBefore + 1);
    userRepository.save(user);

    log.info(
        "Consumed free quota for user {}: {} -> {} (total: {})",
        user.getId(),
        usedBefore,
        user.getFreeQuotaUsed(),
        user.getFreeQuotaTotal());
  }

  /**
   * Restore one free quota to user's account.
   *
   * <p>This operation is typically used when a task fails after quota was consumed. It decrements
   * the usage counter but will not go below zero.
   *
   * @param user The user whose quota to restore (must not be null)
   * @throws BusinessException if user is null or database update fails
   */
  @Transactional(rollbackFor = Exception.class)
  public void restoreFreeQuota(User user) {
    if (user == null) {
      throw new BusinessException(ResultCode.INVALID_PARAMETER, "User cannot be null");
    }

    int usedBefore = user.getFreeQuotaUsed();
    if (usedBefore > 0) {
      user.setFreeQuotaUsed(usedBefore - 1);
      userRepository.save(user);

      log.info(
          "Restored free quota for user {}: {} -> {} (total: {})",
          user.getId(),
          usedBefore,
          user.getFreeQuotaUsed(),
          user.getFreeQuotaTotal());
    } else {
      log.warn("Attempted to restore free quota for user {} but usage is already 0", user.getId());
    }
  }

  // ==================== Paid Task Tracking ====================

  /**
   * Increment the paid task counter for a user.
   *
   * <p>This is typically called when a payment succeeds for a task.
   *
   * @param user The user whose counter to increment
   * @throws BusinessException if user is null
   */
  @Transactional(rollbackFor = Exception.class)
  public void incrementPaidTaskCount(User user) {
    if (user == null) {
      throw new BusinessException(ResultCode.INVALID_PARAMETER, "User cannot be null");
    }

    int countBefore = user.getPaidTaskCount();
    user.setPaidTaskCount(countBefore + 1);
    userRepository.save(user);

    log.info(
        "Incremented paid task count for user {}: {} -> {}",
        user.getId(),
        countBefore,
        user.getPaidTaskCount());
  }

  /**
   * Increment the paid task counter for a user by user ID.
   *
   * <p>This is a convenience method when only the user ID is available.
   *
   * @param userId The ID of the user
   * @throws BusinessException if user not found
   */
  @Transactional(rollbackFor = Exception.class)
  public void incrementPaidTaskCountByUserId(Long userId) {
    if (userId == null) {
      throw new BusinessException(ResultCode.INVALID_PARAMETER, "User ID cannot be null");
    }

    User user =
        userRepository
            .findById(userId)
            .orElseThrow(
                () ->
                    new BusinessException(
                        ResultCode.INTERNAL_SERVER_ERROR, "User not found: " + userId));

    incrementPaidTaskCount(user);
  }

  // ==================== Pricing Snapshot ====================

  /**
   * Build a JSON snapshot of pricing information.
   *
   * <p>This snapshot is stored with the task/payment for audit and display purposes. It captures
   * the exact pricing calculation at the time of task submission.
   *
   * @param quote The pricing quote to serialize
   * @return JSON string representation of the pricing data, or null if quote is null
   * @throws BusinessException if JSON serialization fails
   */
  public String buildPricingSnapshot(PricingQuote quote) {
    if (quote == null) {
      log.warn("Null quote passed to buildPricingSnapshot");
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
      String json = objectMapper.writeValueAsString(snapshot);
      log.debug("Built pricing snapshot: {}", json);
      return json;
    } catch (JsonProcessingException e) {
      log.error("Failed to serialize pricing snapshot: {}", e.getMessage(), e);
      throw new BusinessException(
          ResultCode.INTERNAL_SERVER_ERROR, "Failed to create pricing snapshot");
    }
  }
}
