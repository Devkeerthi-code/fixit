package com.fixit.user;

/** Role inside one hostel. Platform admin is not a role here: it is granted from ADMIN_EMAILS at login. */
public enum Role {
    RESIDENT,
    STAFF,
    WARDEN
}
