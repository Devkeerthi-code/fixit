package com.fixit.common;

import java.time.Instant;
import java.util.List;

/** The one error shape every endpoint returns, so the frontend handles errors in a single place. */
public record ApiError(int status, String code, String message, List<FieldProblem> fieldErrors, Instant timestamp) {

    public record FieldProblem(String field, String message) {}

    public static ApiError of(int status, String code, String message) {
        return new ApiError(status, code, message, List.of(), Instant.now());
    }
}
