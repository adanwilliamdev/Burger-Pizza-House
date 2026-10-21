package com.burgerpizzahouse;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class BurgerPizzaHouseApplication {

    public static void main(String[] args) {
        SpringApplication.run(BurgerPizzaHouseApplication.class, args);
    }
}
