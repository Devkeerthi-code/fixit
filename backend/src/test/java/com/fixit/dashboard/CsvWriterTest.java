package com.fixit.dashboard;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Arrays;
import org.junit.jupiter.api.Test;

class CsvWriterTest {

    @Test
    void quotesCellsWithCommasQuotesAndNewlines() {
        String csv = new CsvWriter().row(Arrays.asList("a,b", "say \"hi\"", "line1\nline2", null, 5)).toString();
        assertThat(csv).isEqualTo("\"a,b\",\"say \"\"hi\"\"\",\"line1\nline2\",,5\r\n");
    }

    @Test
    void defusesSpreadsheetFormulas() {
        assertThat(CsvWriter.escape("=HYPERLINK(\"evil\")")).startsWith("\"'=");
        assertThat(CsvWriter.escape("+91 98765")).isEqualTo("'+91 98765");
        assertThat(CsvWriter.escape("@cmd")).isEqualTo("'@cmd");
    }

    @Test
    void leavesPlainTextAlone() {
        assertThat(CsvWriter.escape("Tap leaking in B-204")).isEqualTo("Tap leaking in B-204");
    }
}
