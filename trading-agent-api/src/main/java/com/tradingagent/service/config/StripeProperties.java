package com.tradingagent.service.config;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "stripe")
public class StripeProperties {

    @NotBlank
    private String secretKey;

    private String publishableKey;

    private String webhookSecret;

    @NotBlank
    private String successUrl;

    @NotBlank
    private String cancelUrl;

    @NotNull
    private String defaultPricingCode = "DEFAULT";
}
