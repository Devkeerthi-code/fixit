package com.fixit.common;

import org.springframework.http.HttpStatus;

/**
 * Business error that maps to a specific HTTP status and a stable machine-readable code.
 * The global exception handler turns it into an {@link ApiError}.
 */
public class AppException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    public AppException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public static AppException notFound(String what) {
        return new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND", what + " not found");
    }

    public static AppException badRequest(String code, String message) {
        return new AppException(HttpStatus.BAD_REQUEST, code, message);
    }

    public static AppException conflict(String code, String message) {
        return new AppException(HttpStatus.CONFLICT, code, message);
    }

    public static AppException forbidden(String message) {
        return new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN", message);
    }

    public HttpStatus status() {
        return status;
    }

    public String code() {
        return code;
    }
}
