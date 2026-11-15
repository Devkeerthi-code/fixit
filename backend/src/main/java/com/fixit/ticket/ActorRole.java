package com.fixit.ticket;

/** How the person acting relates to this particular ticket. One user can hold several (a warden who reported it). */
public enum ActorRole {
    REPORTER,
    ASSIGNEE,
    WARDEN,
    SYSTEM
}
