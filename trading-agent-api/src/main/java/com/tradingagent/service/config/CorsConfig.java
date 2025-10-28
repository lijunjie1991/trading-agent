package com.tradingagent.service.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.CollectionUtils;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.List;

@Configuration
@ConfigurationProperties(prefix = "cors")
@Data
public class CorsConfig {

    private List<String> allowedOrigins;
    private List<String> allowedMethods;
    private List<String> allowedHeaders;
    private boolean allowCredentials;

    @Bean
    public CorsFilter corsFilter() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        CorsConfiguration config = new CorsConfiguration();

        config.setAllowCredentials(allowCredentials);
        if (!CollectionUtils.isEmpty(allowedOrigins)) {
            if (allowedOrigins.stream().anyMatch(origin -> origin.contains("*"))) {
                config.setAllowedOriginPatterns(allowedOrigins);
            } else {
                config.setAllowedOrigins(allowedOrigins);
            }
        }
        if (!CollectionUtils.isEmpty(allowedMethods)) {
            config.setAllowedMethods(allowedMethods);
        }
        if (!CollectionUtils.isEmpty(allowedHeaders)) {
            config.setAllowedHeaders(allowedHeaders);
        }

        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }
}
