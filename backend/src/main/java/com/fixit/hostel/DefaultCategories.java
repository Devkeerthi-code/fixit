package com.fixit.hostel;

import java.util.List;

/** Categories every new hostel starts with. Wardens can rename them, edit the text or switch them off. */
final class DefaultCategories {

    record Template(String code, String name, String covers) {}

    static final List<Template> ALL = List.of(
            new Template("PLUMBING", "Plumbing", "Taps, leaks, blocked drains, flush, geyser and water supply"),
            new Template("ELECTRICAL", "Electrical", "Lights, fans, switches, sockets, MCB trips and power cuts"),
            new Template("WIFI", "Wi-Fi", "No signal, slow speed, router or LAN port not working"),
            new Template("FURNITURE", "Furniture", "Bed, table, chair, cupboard, door locks and windows"),
            new Template("HOUSEKEEPING", "Housekeeping", "Room and corridor cleaning, washrooms, garbage and pests"),
            new Template("MESS", "Mess", "Food quality, hygiene, timings and drinking water"));

    private DefaultCategories() {}
}
