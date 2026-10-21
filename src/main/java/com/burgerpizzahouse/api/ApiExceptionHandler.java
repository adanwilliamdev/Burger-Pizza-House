package com.burgerpizzahouse.api;

import com.burgerpizzahouse.service.BusinessException;
import com.burgerpizzahouse.service.InsufficientStockException;
import jakarta.validation.ConstraintViolationException;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/** Erros da API no formato {"detail": "mensagem"} (ou {"detail": {"message", "shortages"}} para falta de estoque). */
@RestControllerAdvice(basePackages = "com.burgerpizzahouse.api")
public class ApiExceptionHandler {

    @ExceptionHandler(InsufficientStockException.class)
    ResponseEntity<Map<String, Object>> stock(InsufficientStockException e) {
        Map<String, Object> detail = new LinkedHashMap<>();
        detail.put("message", e.getMessage());
        detail.put("shortages", e.getShortages());
        return ResponseEntity.status(e.getStatus()).body(Map.of("detail", detail));
    }

    @ExceptionHandler(BusinessException.class)
    ResponseEntity<Map<String, Object>> business(BusinessException e) {
        return ResponseEntity.status(e.getStatus()).body(Map.of("detail", e.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<Map<String, Object>> invalidBody(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .map(f -> f.getDefaultMessage())
                .findFirst()
                .orElse("Requisição inválida.");
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(Map.of("detail", message));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    ResponseEntity<Map<String, Object>> constraint(ConstraintViolationException e) {
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(Map.of("detail", "Parâmetro inválido."));
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
    ResponseEntity<Map<String, Object>> unreadable(Exception e) {
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                .body(Map.of("detail", "Requisição inválida: verifique os campos enviados."));
    }
}
