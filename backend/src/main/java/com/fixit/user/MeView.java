package com.fixit.user;

import com.fixit.hostel.Hostel;
import com.fixit.hostel.Room;

/** What the frontend knows about the signed-in user. */
public record MeView(
        Long id,
        String name,
        String email,
        Role role,
        boolean platformAdmin,
        HostelRef hostel,
        RoomRef room) {

    public record HostelRef(Long id, String name, Hostel.Kind kind) {}

    public record RoomRef(Long id, String label, Long blockId, String blockName) {}

    /** Expects hostel, room and room.block to be loaded already (see UserRepository.findWithHostelById). */
    public static MeView of(AppUser user, boolean platformAdmin) {
        Hostel h = user.getHostel();
        Room r = user.getRoom();
        return new MeView(
                user.getId(), user.getName(), user.getEmail(), user.getRole(), platformAdmin,
                h == null ? null : new HostelRef(h.getId(), h.getName(), h.getKind()),
                r == null ? null : new RoomRef(r.getId(), r.label(), r.getBlock().getId(), r.getBlock().getName()));
    }
}
