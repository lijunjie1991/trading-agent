package com.tradingagent.service.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "stripe")
@Data
public class StripeProperties {

    private String secretKey;
    private String publishableKey;
    private String webhookSecret;
    private String currency = "usd";
}
