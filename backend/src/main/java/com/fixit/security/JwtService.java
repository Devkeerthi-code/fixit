package com.fixit.security;

import com.fixit.common.AppProperties;
import com.fixit.user.Role;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;

/** Signs and verifies short-lived access tokens (HS256). */
@Service
public class JwtService {

    private final SecretKey key;
    private final AppProperties props;
    private final Clock clock;

    public JwtService(AppProperties props, Clock clock) {
        byte[] secret = props.jwt().secret().getBytes(StandardCharsets.UTF_8);
        if (secret.length < 32) {
            throw new IllegalStateException("JWT_SECRET must be at least 32 bytes");
        }
        this.key = Keys.hmacShaKeyFor(secret);
        this.props = props;
        this.clock = clock;
    }

    public String issue(AuthUser user) {
        Instant now = Instant.now(clock);
        var builder = Jwts.builder()
                .subject(Long.toString(user.userId()))
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(props.jwt().accessTtl())))
                .claim("pa", user.platformAdmin());
        if (user.hostelId() != null) {
            builder.claim("hid", user.hostelId()).claim("role", user.role().name());
        }
        return builder.signWith(key).compact();
    }

    /** Empty for anything invalid: bad signature, expired, malformed. */
    public Optional<AuthUser> parse(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(key)
                    .clock(() -> Date.from(Instant.now(clock)))
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            Number hid = claims.get("hid", Number.class);
            String role = claims.get("role", String.class);
            Boolean admin = claims.get("pa", Boolean.class);
            return Optional.of(new AuthUser(
                    Long.parseLong(claims.getSubject()),
                    hid == null ? null : hid.longValue(),
                    role == null ? null : Role.valueOf(role),
                    Boolean.TRUE.equals(admin)));
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
