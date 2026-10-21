package com.burgerpizzahouse.web;

import com.burgerpizzahouse.config.AppProperties;
import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import org.springframework.stereotype.Component;

/** Formatação pt-BR usada pelos templates ({@code ${@fmt.money(x)}}). */
@Component("fmt")
public class Format {

    private static final Locale PT_BR = Locale.of("pt", "BR");

    private final DateTimeFormatter dateTime;
    private final DateTimeFormatter date;

    public Format(AppProperties props) {
        ZoneId zone = props.zone();
        this.dateTime = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm", PT_BR).withZone(zone);
        this.date = DateTimeFormatter.ofPattern("dd/MM", PT_BR).withZone(zone);
    }

    /**
     * Moeda no padrão brasileiro (R$ 1.234,56). Os símbolos são fixos (não dependem dos dados de locale
     * do JRE, que podem estar ausentes em imagens enxutas).
     */
    public String money(BigDecimal value) {
        BigDecimal amount = value == null ? BigDecimal.ZERO : value;
        DecimalFormatSymbols symbols = new DecimalFormatSymbols(Locale.ROOT);
        symbols.setDecimalSeparator(',');
        symbols.setGroupingSeparator('.');
        // DecimalFormat não é thread-safe: uma instância por chamada.
        String formatted = new DecimalFormat("#,##0.00", symbols).format(amount.abs());
        return (amount.signum() < 0 ? "-" : "") + "R$ " + formatted;
    }

    public String dateTime(Instant value) {
        return value == null ? "—" : dateTime.format(value);
    }

    public String date(Instant value) {
        return value == null ? "—" : date.format(value);
    }

    /** Quantidade sem zeros à direita (0.5000 -> 0.5). */
    public String qty(BigDecimal value) {
        return value == null ? "0" : value.stripTrailingZeros().toPlainString();
    }

    public String initials(String name) {
        if (name == null || name.isBlank()) {
            return "?";
        }
        String trimmed = name.strip();
        return trimmed.substring(0, Math.min(2, trimmed.length())).toUpperCase(PT_BR);
    }
}
