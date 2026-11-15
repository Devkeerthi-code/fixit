package com.fixit.hostel;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fixit.common.AppException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class RoomRangeParserTest {

    @Test
    void expandsRangesAndSingles() {
        assertThat(RoomRangeParser.parse("101-103, 110")).containsExactly("101", "102", "103", "110");
    }

    @Test
    void keepsPrefixesAndZeroPadding() {
        assertThat(RoomRangeParser.parse("G01-G03")).containsExactly("G01", "G02", "G03");
        assertThat(RoomRangeParser.parse("a1-3")).containsExactly("A1", "A2", "A3");
    }

    @Test
    void acceptsNewlinesAndSemicolonsAndRemovesDuplicates() {
        assertThat(RoomRangeParser.parse("101-102\n102;103")).containsExactly("101", "102", "103");
    }

    @ParameterizedTest
    @ValueSource(strings = {"", " , ", "120-101", "G1-H5", "1-1000", "room #4"})
    void rejectsInputThatIsntRooms(String input) {
        assertThatThrownBy(() -> RoomRangeParser.parse(input))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).code())
                .isEqualTo("BAD_ROOM_RANGE");
    }
}
