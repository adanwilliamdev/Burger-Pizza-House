package com.burgerpizzahouse.config;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;

/**
 * Guarda da CSP estrita ({@code script-src 'self'; style-src 'self'}): os templates não podem ter estilo, script
 * nem manipulador de evento inline, senão o navegador bloqueia e a tela quebra só em produção.
 */
class TemplatesCspTest {

    private static final Path TEMPLATES = Path.of("src/main/resources/templates");

    private static final List<Pattern> FORBIDDEN = List.of(
            Pattern.compile("\\sstyle\\s*=", Pattern.CASE_INSENSITIVE),
            Pattern.compile("\\sth:style\\s*=", Pattern.CASE_INSENSITIVE),
            Pattern.compile("\\sth:styleappend\\s*=", Pattern.CASE_INSENSITIVE),
            Pattern.compile("<style[\\s>]", Pattern.CASE_INSENSITIVE),
            Pattern.compile("<script(?![^>]*\\ssrc=)(?![^>]*th:src=)[^>]*>", Pattern.CASE_INSENSITIVE),
            Pattern.compile("\\son[a-z]+\\s*=\\s*[\"']", Pattern.CASE_INSENSITIVE),
            Pattern.compile("javascript:", Pattern.CASE_INSENSITIVE));

    @Test
    void templatesHaveNoInlineStylesScriptsOrHandlers() throws IOException {
        StringBuilder violations = new StringBuilder();
        try (Stream<Path> files = Files.walk(TEMPLATES)) {
            for (Path file : files.filter(f -> f.toString().endsWith(".html")).toList()) {
                String content = Files.readString(file);
                for (Pattern pattern : FORBIDDEN) {
                    if (pattern.matcher(content).find()) {
                        violations.append(TEMPLATES.relativize(file)).append(" -> ").append(pattern).append('\n');
                    }
                }
            }
        }
        assertTrue(violations.isEmpty(), "Conteúdo inline incompatível com a CSP:\n" + violations);
    }
}
