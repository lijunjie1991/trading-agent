package com.tradingagent.service;

import com.tradingagent.service.config.StripeProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(StripeProperties.class)
public class TradingAgentApplication {

	public static void main(String[] args) {
		SpringApplication.run(TradingAgentApplication.class, args);
	}

}
