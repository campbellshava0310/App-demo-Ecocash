package com.example.shop;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientResponseException;

/** Turns errors into {"message": "..."} so the shop page can show them. */
@RestControllerAdvice
public class ApiErrorHandler {

    // EcoCash answered with an error, e.g. "Whitelist the test MSISDN before using it in the sandbox"
    @ExceptionHandler(RestClientResponseException.class)
    public ResponseEntity<Map<String, String>> ecocashError(RestClientResponseException e) {
        String message = e.getStatusText();
        try {
            Map<?, ?> body = e.getResponseBodyAs(Map.class);
            if (body != null && body.get("message") != null) {
                message = body.get("message").toString();
            }
        } catch (RuntimeException notJson) {
            // keep the HTTP status text
        }
        return error(HttpStatus.BAD_GATEWAY, "EcoCash said: " + message + " (HTTP " + e.getStatusCode().value() + ")");
    }

    @ExceptionHandler(ResourceAccessException.class)
    public ResponseEntity<Map<String, String>> ecocashUnreachable(ResourceAccessException e) {
        return error(HttpStatus.BAD_GATEWAY, "Could not reach EcoCash: " + e.getMessage());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> badRequest(IllegalArgumentException e) {
        return error(HttpStatus.BAD_REQUEST, e.getMessage());
    }

    @ExceptionHandler(UnsupportedOperationException.class)
    public ResponseEntity<Map<String, String>> notBuiltYet(UnsupportedOperationException e) {
        return error(HttpStatus.NOT_IMPLEMENTED, e.getMessage());
    }

    private static ResponseEntity<Map<String, String>> error(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(Map.of("message", message));
    }
}
