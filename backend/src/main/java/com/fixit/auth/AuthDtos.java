package com.fixit.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Request bodies for /api/auth. Bean Validation annotations are checked before the controller runs. */
public final class AuthDtos {

    private AuthDtos() {}

    public record RegisterRequest(
            @NotBlank @Size(max = 80) String name,
            @NotBlank @Email @Size(max = 160) String email,
            @NotBlank @Size(min = 8, max = 72, message = "Use 8 to 72 characters") String password) {}

    public record LoginRequest(
            @NotBlank @Email String email,
            @NotBlank String password) {}
}
