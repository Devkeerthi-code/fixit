package com.fixit.hostel;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.HashSet;
import java.util.Set;
import org.junit.jupiter.api.Test;

class InviteCodesTest {

    private final HostelRepository hostels = mock(HostelRepository.class);
    private final InviteCodes codes = new InviteCodes(hostels);

    @Test
    void codesAreEightCharactersWithoutLookAlikes() {
        for (int i = 0; i < 200; i++) {
            assertThat(codes.next()).hasSize(8).matches("[A-HJKMNP-Z2-9]{8}");
        }
    }

    @Test
    void codesDontRepeatInPractice() {
        Set<String> seen = new HashSet<>();
        for (int i = 0; i < 500; i++) {
            seen.add(codes.next());
        }
        assertThat(seen).hasSize(500);
    }

    @Test
    void triesAgainWhenACodeIsAlreadyTaken() {
        when(hostels.existsByResidentInviteCodeOrStaffInviteCode(anyString(), anyString()))
                .thenReturn(true, true, false);

        assertThat(codes.next()).hasSize(8);
        verify(hostels, times(3)).existsByResidentInviteCodeOrStaffInviteCode(anyString(), anyString());
    }
}
