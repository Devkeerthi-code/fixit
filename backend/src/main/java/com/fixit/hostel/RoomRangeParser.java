package com.fixit.hostel;

import com.fixit.common.AppException;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Turns what a warden types, like "101-120, 201-205, G1", into room numbers, so a whole block
 * can be set up in one line instead of 40 form rows.
 */
public final class RoomRangeParser {

    static final int MAX_ROOMS = 500;
    private static final Pattern RANGE = Pattern.compile("^([A-Za-z]*)(\\d+)\\s*-\\s*([A-Za-z]*)(\\d+)$");
    private static final Pattern SINGLE = Pattern.compile("^[A-Za-z0-9][A-Za-z0-9/-]{0,15}$");

    private RoomRangeParser() {}

    public static List<String> parse(String input) {
        Set<String> rooms = new LinkedHashSet<>();
        for (String raw : input.split("[,;\\n]")) {
            String part = raw.trim();
            if (part.isEmpty()) {
                continue;
            }
            Matcher range = RANGE.matcher(part);
            if (range.matches()) {
                addRange(rooms, part, range);
            } else if (SINGLE.matcher(part).matches()) {
                rooms.add(part.toUpperCase());
            } else {
                throw bad("\"" + part + "\" isn't a room number or a range like 101-120");
            }
            if (rooms.size() > MAX_ROOMS) {
                throw bad("A block can have at most " + MAX_ROOMS + " rooms");
            }
        }
        if (rooms.isEmpty()) {
            throw bad("Add at least one room, e.g. 101-120");
        }
        return List.copyOf(rooms);
    }

    private static void addRange(Set<String> rooms, String part, Matcher m) {
        String prefix = m.group(1).toUpperCase();
        String endPrefix = m.group(3).toUpperCase();
        if (!endPrefix.isEmpty() && !endPrefix.equals(prefix)) {
            throw bad("\"" + part + "\" mixes two prefixes");
        }
        String startDigits = m.group(2);
        int start = Integer.parseInt(startDigits);
        int end = Integer.parseInt(m.group(4));
        if (end < start) {
            throw bad("\"" + part + "\" goes backwards");
        }
        if (end - start + 1 > MAX_ROOMS) {
            throw bad("\"" + part + "\" is more than " + MAX_ROOMS + " rooms");
        }
        int width = startDigits.length(); // keeps zero padding: G01-G05 stays G01..G05
        for (int n = start; n <= end; n++) {
            rooms.add(prefix + String.format("%0" + width + "d", n));
        }
    }

    private static AppException bad(String message) {
        return AppException.badRequest("BAD_ROOM_RANGE", message);
    }
}
