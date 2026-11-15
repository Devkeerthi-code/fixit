package com.fixit.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fixit.common.ApiError;
import com.fixit.common.AppProperties;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * The security filter chain. Key choices:
 * <ul>
 *   <li>Stateless: no server session; the JWT cookie is checked on every request.</li>
 *   <li>CSRF on: cookies are sent automatically by the browser, so state-changing requests must also
 *       echo the XSRF-TOKEN cookie in an X-XSRF-TOKEN header, which another site can't read or forge.</li>
 *   <li>@EnableMethodSecurity: role rules sit on service methods with @PreAuthorize, close to the logic.</li>
 * </ul>
 */
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private static final String[] PUBLIC = {
            "/api/auth/register", "/api/auth/login", "/api/auth/refresh", "/api/auth/logout", "/api/auth/csrf",
            "/docs", "/docs/**", "/swagger-ui/**", "/v3/api-docs/**", "/actuator/health"
    };

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http, JwtService jwtService, ObjectMapper mapper) throws Exception {
        http
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .cors(c -> { })
                .csrf(csrf -> csrf
                        .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                        // plain handler: the SPA sends the raw cookie value back in the header
                        .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler())
                        .ignoringRequestMatchers("/api/auth/register", "/api/auth/login"))
                .addFilterAfter(new CsrfCookieFilter(), CsrfFilter.class)
                // not a @Component on purpose: Boot would also register it as a plain servlet filter
                .addFilterBefore(new JwtCookieFilter(jwtService), UsernamePasswordAuthenticationFilter.class)
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(PUBLIC).permitAll()
                        .requestMatchers("/api/platform/**").hasRole("PLATFORM_ADMIN")
                        .requestMatchers("/api/**").authenticated()
                        .anyRequest().permitAll())
                .exceptionHandling(e -> e
                        .authenticationEntryPoint((req, res, ex) ->
                                writeError(res, mapper, 401, "UNAUTHENTICATED", "Please sign in"))
                        .accessDeniedHandler((req, res, ex) ->
                                writeError(res, mapper, 403, "FORBIDDEN", "You don't have access to this")))
                .httpBasic(b -> b.disable())
                .formLogin(f -> f.disable())
                .logout(l -> l.disable());
        return http.build();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    /** In production the frontend proxies /api, so this only matters for local dev on another port. */
    @Bean
    CorsConfigurationSource corsConfigurationSource(AppProperties props) {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(props.allowedOriginList());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE"));
        config.setAllowedHeaders(List.of("Content-Type", "X-XSRF-TOKEN", "Idempotency-Key"));
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }

    private static void writeError(HttpServletResponse res, ObjectMapper mapper, int status, String code, String msg)
            throws IOException {
        res.setStatus(status);
        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        mapper.writeValue(res.getOutputStream(), ApiError.of(status, code, msg));
    }
}
