package com.fixit.dashboard;

import java.util.List;

/**
 * Minimal RFC 4180 CSV writer. Also defuses "CSV injection": a cell starting with = + - @ would run
 * as a formula when the warden opens the file in Excel, so it gets a leading apostrophe.
 */
public final class CsvWriter {

    private final StringBuilder out = new StringBuilder();

    public CsvWriter row(List<?> cells) {
        for (int i = 0; i < cells.size(); i++) {
            if (i > 0) {
                out.append(',');
            }
            out.append(escape(cells.get(i)));
        }
        out.append("\r\n");
        return this;
    }

    @Override
    public String toString() {
        return out.toString();
    }

    static String escape(Object value) {
        if (value == null) {
            return "";
        }
        String s = value.toString();
        if (!s.isEmpty() && "=+-@\t\r".indexOf(s.charAt(0)) >= 0) {
            s = "'" + s;
        }
        boolean needsQuotes = s.indexOf(',') >= 0 || s.indexOf('"') >= 0 || s.indexOf('\n') >= 0 || s.indexOf('\r') >= 0;
        if (needsQuotes) {
            return '"' + s.replace("\"", "\"\"") + '"';
        }
        return s;
    }
}
