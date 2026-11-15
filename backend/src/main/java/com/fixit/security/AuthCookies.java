package com.fixit.security;

import com.fixit.common.AppProperties;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Duration;
import java.util.Arrays;
import java.util.Optional;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

/**
 * Tokens live in httpOnly cookies, so page JavaScript (and any XSS) can't read them.
 * The refresh cookie is scoped to /api/auth so it is only ever sent to the refresh/logout endpoints.
 */
@Component
public class AuthCookies {

    public static final String ACCESS = "fx_at";
    public static final String REFRESH = "fx_rt";
    private static final String REFRESH_PATH = "/api/auth";

    private final AppProperties props;

    public AuthCookies(AppProperties props) {
        this.props = props;
    }

    public void write(HttpServletResponse response, String accessToken, String refreshToken) {
        add(response, ACCESS, accessToken, "/", props.jwt().accessTtl());
        add(response, REFRESH, refreshToken, REFRESH_PATH, props.jwt().refreshTtl());
    }

    public void clear(HttpServletResponse response) {
        add(response, ACCESS, "", "/", Duration.ZERO);
        add(response, REFRESH, "", REFRESH_PATH, Duration.ZERO);
    }

    public static Optional<String> read(HttpServletRequest request, String name) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return Optional.empty();
        }
        return Arrays.stream(cookies)
                .filter(c -> name.equals(c.getName()) && !c.getValue().isBlank())
                .map(Cookie::getValue)
                .findFirst();
    }

    private void add(HttpServletResponse response, String name, String value, String path, Duration maxAge) {
        ResponseCookie cookie = ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(props.cookieSecure())
                .sameSite("Lax")
                .path(path)
                .maxAge(maxAge)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}
