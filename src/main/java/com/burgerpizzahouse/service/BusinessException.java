package com.burgerpizzahouse.service;

import org.springframework.http.HttpStatus;

/**
 * Erro de negócio "normal" (não é bug): vira uma resposta HTTP na API e uma mensagem na tela.
 * Por ser RuntimeException, derruba a transação em andamento (rollback).
 */
public class BusinessException extends RuntimeException {

    private final HttpStatus status;

    public BusinessException(String message) {
        this(HttpStatus.BAD_REQUEST, message);
    }

    public BusinessException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public static BusinessException notFound(String message) {
        return new BusinessException(HttpStatus.NOT_FOUND, message);
    }

    public static BusinessException conflict(String message) {
        return new BusinessException(HttpStatus.CONFLICT, message);
    }
}
