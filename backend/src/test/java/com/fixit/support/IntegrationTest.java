package com.fixit.support;

import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.testcontainers.containers.PostgreSQLContainer;

/**
 * Base for tests that need the real stack: Spring context + a real PostgreSQL 16 in Docker (Testcontainers).
 * One container is shared by every integration test class (static field) so the suite stays fast;
 * each test starts from empty tables.
 */
@Tag("integration")
@SpringBootTest(properties = {
        "app.jwt.secret=integration-test-secret-that-is-long-enough-for-hs256",
        "app.admin-emails=root@fixit.test",
        "app.sla.job-enabled=false",
        "app.cookie-secure=false",
        "spring.jpa.properties.hibernate.generate_statistics=true"
})
@AutoConfigureMockMvc
@Import(IntegrationTest.TestClockConfig.class)
public abstract class IntegrationTest {

    @ServiceConnection
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

    static {
        POSTGRES.start();
    }

    @Autowired protected JdbcClient jdbc;
    @Autowired protected MutableClock clock;

    @BeforeEach
    void cleanDatabase() {
        clock.set(Instant.now());
        jdbc.sql("""
                TRUNCATE notification, escalation, ticket_affected, ticket_event, visit_slot, ticket_photo, ticket,
                         staff_skill, refresh_token, app_user, sla_policy, category, room, block, hostel, usage_counter
                RESTART IDENTITY CASCADE
                """).update();
    }

    @TestConfiguration
    static class TestClockConfig {
        /** @Primary wins over the app's Clock bean, so every service sees time the test controls. */
        @Bean
        @Primary
        MutableClock testClock() {
            return new MutableClock(Instant.now());
        }
    }
}
