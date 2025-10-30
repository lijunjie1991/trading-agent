package com.tradingagent.service.dto;

import com.tradingagent.service.entity.Task;
import com.tradingagent.service.entity.User;
import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Context object holding all data needed during task submission.
 *
 * This DTO is used to pass data between transaction boundaries during
 * task submission, ensuring all necessary information is available
 * without requiring multiple database queries.
 *
 * @author Trading Agent Team
 * @since 1.0.1
 */
@Data
@Builder
public class TaskSubmissionContext {

    /**
     * The created task entity (with database ID assigned)
     */
    private Task task;

    /**
     * The current user submitting the task
     */
    private User user;

    /**
     * List of selected analyst identifiers
     */
    private List<String> analysts;

    /**
     * Pricing quote for this task
     */
    private PricingQuote pricingQuote;

    /**
     * Stripe payment intent (if paid task)
     */
    private StripePaymentIntent paymentIntent;

    /**
     * Whether this task uses free quota
     */
    private boolean useFreeQuota;

    /**
     * Whether user had free quota before submission
     */
    private boolean hadFreeQuota;

    /**
     * User's remaining free quota before submission
     */
    private int remainingFreeBefore;

    /**
     * Whether this task should be submitted to engine immediately
     */
    private boolean shouldSubmitToEngine;
}
