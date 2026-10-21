package com.burgerpizzahouse.config;

import com.burgerpizzahouse.service.SeedService;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/** Popula o banco na inicialização (as migrações do Flyway já rodaram). Desligue com APP_SEED_ENABLED=false. */
@Component
public class SeedRunner implements ApplicationRunner {

    private final SeedService seedService;
    private final AppProperties props;

    public SeedRunner(SeedService seedService, AppProperties props) {
        this.seedService = seedService;
        this.props = props;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (props.seed().enabled()) {
            seedService.seed();
        }
    }
}
