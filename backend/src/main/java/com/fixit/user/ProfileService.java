package com.fixit.user;

import com.fixit.auth.SessionService;
import com.fixit.common.AppException;
import com.fixit.hostel.RoomRepository;
import com.fixit.security.AuthUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** The signed-in user's own profile: name and room. */
@Service
public class ProfileService {

    private final UserRepository users;
    private final RoomRepository rooms;
    private final SessionService sessions;

    public ProfileService(UserRepository users, RoomRepository rooms, SessionService sessions) {
        this.users = users;
        this.rooms = rooms;
        this.sessions = sessions;
    }

    @Transactional(readOnly = true)
    public MeView me(AuthUser me) {
        AppUser user = load(me);
        return MeView.of(user, sessions.isPlatformAdmin(user.getEmail()));
    }

    @Transactional
    public MeView update(AuthUser me, String name, Long roomId) {
        AppUser user = load(me);
        if (name != null && !name.isBlank()) {
            user.setName(name.trim());
        }
        if (roomId != null) {
            // the room must belong to the caller's own hostel
            user.setRoom(rooms.findByIdAndHostelId(roomId, me.requireHostel())
                    .orElseThrow(() -> AppException.notFound("Room")));
        }
        return MeView.of(user, sessions.isPlatformAdmin(user.getEmail()));
    }

    private AppUser load(AuthUser me) {
        return users.findWithHostelById(me.userId()).orElseThrow(() -> AppException.notFound("User"));
    }
}
