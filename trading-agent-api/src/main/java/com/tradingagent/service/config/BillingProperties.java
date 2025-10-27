package com.tradingagent.service.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "billing")
@Data
public class BillingProperties {

    private Integer freeTaskLimit = 5;
    private String defaultPricingStrategy;
    private Integer priceCacheTtlSeconds = 300;
}
