package com.devdroid.spars_server;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@EnableJpaRepositories(basePackages = "com.devdroid.spars_server")
public class SparsServerApplication {

    public static void main(String[] args) {
        SpringApplication.run(SparsServerApplication.class, args);
    }

}
