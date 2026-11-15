package com.fixit.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Runs once per request: if the access-token cookie holds a valid JWT, puts the caller into the
 * SecurityContext. If not, the request continues anonymous and protected endpoints answer 401,
 * which tells the frontend to call /api/auth/refresh.
 */
public class JwtCookieFilter extends OncePerRequestFilter {

    private final JwtService jwt;

    public JwtCookieFilter(JwtService jwt) {
        this.jwt = jwt;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        AuthCookies.read(request, AuthCookies.ACCESS)
                .flatMap(jwt::parse)
                .ifPresent(user -> SecurityContextHolder.getContext().setAuthentication(
                        new UsernamePasswordAuthenticationToken(user, null, user.authorities())));
        chain.doFilter(request, response);
    }
}
