package com.fixit.hostel;

import java.security.SecureRandom;
import org.springframework.stereotype.Component;

/** Short codes residents can read out loud or type on a phone: no 0/O or 1/I/L to confuse. */
@Component
public class InviteCodes {

    private static final String ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    private static final int LENGTH = 8;

    private final SecureRandom random = new SecureRandom();
    private final HostelRepository hostels;

    public InviteCodes(HostelRepository hostels) {
        this.hostels = hostels;
    }

    public String next() {
        String code;
        do {
            code = generate();
        } while (hostels.existsByResidentInviteCodeOrStaffInviteCode(code, code));
        return code;
    }

    private String generate() {
        StringBuilder sb = new StringBuilder(LENGTH);
        for (int i = 0; i < LENGTH; i++) {
            sb.append(ALPHABET.charAt(random.nextInt(ALPHABET.length())));
        }
        return sb.toString();
    }
}
