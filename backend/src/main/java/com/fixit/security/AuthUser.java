package com.fixit.security;

import com.fixit.common.AppException;
import com.fixit.user.Role;
import java.util.ArrayList;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

/**
 * Who is calling, taken from the verified JWT. This is the Spring Security "principal":
 * controllers receive it with {@code @AuthenticationPrincipal AuthUser me}.
 * hostelId only ever comes from here, never from the request, which is what keeps hostels isolated.
 */
public record AuthUser(long userId, Long hostelId, Role role, boolean platformAdmin) {

    public List<GrantedAuthority> authorities() {
        List<GrantedAuthority> list = new ArrayList<>();
        if (role != null) {
            list.add(new SimpleGrantedAuthority("ROLE_" + role.name()));
        }
        if (platformAdmin) {
            list.add(new SimpleGrantedAuthority("ROLE_PLATFORM_ADMIN"));
        }
        return list;
    }

    public long requireHostel() {
        if (hostelId == null) {
            throw new AppException(HttpStatus.FORBIDDEN, "NO_HOSTEL", "Join or create a hostel first");
        }
        return hostelId;
    }

    public boolean is(Role r) {
        return role == r;
    }
}
