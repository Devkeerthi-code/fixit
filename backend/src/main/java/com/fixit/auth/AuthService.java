package com.fixit.auth;

import com.fixit.auth.AuthDtos.LoginRequest;
import com.fixit.auth.AuthDtos.RegisterRequest;
import com.fixit.common.AppException;
import com.fixit.usage.UsageService;
import com.fixit.user.AppUser;
import com.fixit.user.UserRepository;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final UsageService usage;
    /** Checked when the email is unknown, so both paths take the same BCrypt time (no user enumeration by timing). */
    private final String dummyHash;

    public AuthService(UserRepository users, PasswordEncoder encoder, UsageService usage) {
        this.users = users;
        this.encoder = encoder;
        this.usage = usage;
        this.dummyHash = encoder.encode("timing-equaliser");
    }

    @Transactional
    public AppUser register(RegisterRequest req) {
        String email = normalise(req.email());
        if (users.existsByEmailIgnoreCase(email)) {
            throw AppException.conflict("EMAIL_TAKEN", "An account with this email already exists. Try signing in.");
        }
        AppUser user = users.save(new AppUser(email, encoder.encode(req.password()), req.name().trim()));
        usage.record(UsageService.Action.USER_REGISTERED);
        return user;
    }

    @Transactional(readOnly = true)
    public AppUser login(LoginRequest req) {
        AppUser user = users.findByEmailIgnoreCase(normalise(req.email())).orElse(null);
        String hash = user == null ? dummyHash : user.getPasswordHash();
        boolean matches = encoder.matches(req.password(), hash);
        if (user == null || !matches || !user.isActive()) {
            // same message for "no such email" and "wrong password": don't reveal which emails exist
            throw new AppException(HttpStatus.UNAUTHORIZED, "BAD_CREDENTIALS", "Wrong email or password");
        }
        return user;
    }

    private static String normalise(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
