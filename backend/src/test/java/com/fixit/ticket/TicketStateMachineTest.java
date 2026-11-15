package com.fixit.ticket;

import static com.fixit.ticket.ActorRole.ASSIGNEE;
import static com.fixit.ticket.ActorRole.REPORTER;
import static com.fixit.ticket.ActorRole.SYSTEM;
import static com.fixit.ticket.ActorRole.WARDEN;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fixit.common.AppException;
import java.util.EnumSet;
import java.util.Set;
import java.util.stream.Stream;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.http.HttpStatus;

class TicketStateMachineTest {

    private final TicketStateMachine machine = new TicketStateMachine();

    static Stream<Arguments> legalMoves() {
        return Stream.of(
                Arguments.of(TicketStatus.OPEN, TicketAction.ASSIGN, SYSTEM, TicketStatus.ASSIGNED),
                Arguments.of(TicketStatus.OPEN, TicketAction.ASSIGN, WARDEN, TicketStatus.ASSIGNED),
                Arguments.of(TicketStatus.ASSIGNED, TicketAction.ASSIGN, WARDEN, TicketStatus.ASSIGNED),
                Arguments.of(TicketStatus.IN_PROGRESS, TicketAction.ASSIGN, WARDEN, TicketStatus.ASSIGNED),
                Arguments.of(TicketStatus.REOPENED, TicketAction.ASSIGN, SYSTEM, TicketStatus.ASSIGNED),
                Arguments.of(TicketStatus.ASSIGNED, TicketAction.START, ASSIGNEE, TicketStatus.IN_PROGRESS),
                Arguments.of(TicketStatus.ASSIGNED, TicketAction.START, WARDEN, TicketStatus.IN_PROGRESS),
                Arguments.of(TicketStatus.IN_PROGRESS, TicketAction.RESOLVE, ASSIGNEE, TicketStatus.RESOLVED),
                Arguments.of(TicketStatus.RESOLVED, TicketAction.CONFIRM, REPORTER, TicketStatus.CLOSED),
                Arguments.of(TicketStatus.RESOLVED, TicketAction.CONFIRM, SYSTEM, TicketStatus.CLOSED),
                Arguments.of(TicketStatus.RESOLVED, TicketAction.REOPEN, REPORTER, TicketStatus.REOPENED));
    }

    @ParameterizedTest(name = "{0} --{1} by {2}--> {3}")
    @MethodSource("legalMoves")
    void allowsEveryLegalMove(TicketStatus from, TicketAction action, ActorRole actor, TicketStatus expected) {
        assertThat(machine.next(from, action, Set.of(actor))).isEqualTo(expected);
    }

    static Stream<Arguments> illegalMoves() {
        return Stream.of(
                Arguments.of(TicketStatus.OPEN, TicketAction.START),
                Arguments.of(TicketStatus.OPEN, TicketAction.RESOLVE),
                Arguments.of(TicketStatus.OPEN, TicketAction.CONFIRM),
                Arguments.of(TicketStatus.ASSIGNED, TicketAction.RESOLVE),
                Arguments.of(TicketStatus.IN_PROGRESS, TicketAction.START),
                Arguments.of(TicketStatus.IN_PROGRESS, TicketAction.CONFIRM),
                Arguments.of(TicketStatus.RESOLVED, TicketAction.START),
                Arguments.of(TicketStatus.RESOLVED, TicketAction.ASSIGN),
                Arguments.of(TicketStatus.CLOSED, TicketAction.REOPEN),
                Arguments.of(TicketStatus.CLOSED, TicketAction.ASSIGN),
                Arguments.of(TicketStatus.CLOSED, TicketAction.START),
                Arguments.of(TicketStatus.REOPENED, TicketAction.START));
    }

    @ParameterizedTest(name = "{0} --{1}--> rejected")
    @MethodSource("illegalMoves")
    void rejectsIllegalMovesWithConflict(TicketStatus from, TicketAction action) {
        Set<ActorRole> everyone = EnumSet.allOf(ActorRole.class);
        assertThatThrownBy(() -> machine.next(from, action, everyone))
                .isInstanceOf(AppException.class)
                .satisfies(e -> {
                    AppException ex = (AppException) e;
                    assertThat(ex.status()).isEqualTo(HttpStatus.CONFLICT);
                    assertThat(ex.code()).isEqualTo("ILLEGAL_TRANSITION");
                });
    }

    @Nested
    class WhoMayAct {

        @Test
        void residentCannotStartWork() {
            assertForbidden(TicketStatus.ASSIGNED, TicketAction.START, REPORTER);
        }

        @Test
        void staffCannotConfirmTheirOwnFix() {
            assertForbidden(TicketStatus.RESOLVED, TicketAction.CONFIRM, ASSIGNEE);
        }

        @Test
        void wardenCannotReopenOnResidentsBehalf() {
            assertForbidden(TicketStatus.RESOLVED, TicketAction.REOPEN, WARDEN);
        }

        @Test
        void staffCannotReassign() {
            assertForbidden(TicketStatus.ASSIGNED, TicketAction.ASSIGN, ASSIGNEE);
        }

        @Test
        void noRolesMeansNoAccess() {
            assertForbidden(TicketStatus.ASSIGNED, TicketAction.START, null);
        }

        private void assertForbidden(TicketStatus from, TicketAction action, ActorRole actor) {
            Set<ActorRole> roles = actor == null ? EnumSet.noneOf(ActorRole.class) : Set.of(actor);
            assertThatThrownBy(() -> machine.next(from, action, roles))
                    .isInstanceOf(AppException.class)
                    .extracting(e -> ((AppException) e).status())
                    .isEqualTo(HttpStatus.FORBIDDEN);
        }
    }

    @Test
    void listsOnlyActionsTheActorCanTakeNow() {
        assertThat(machine.available(TicketStatus.RESOLVED, Set.of(REPORTER)))
                .containsExactlyInAnyOrder(TicketAction.CONFIRM, TicketAction.REOPEN);
        assertThat(machine.available(TicketStatus.ASSIGNED, Set.of(ASSIGNEE))).containsExactly(TicketAction.START);
        assertThat(machine.available(TicketStatus.CLOSED, EnumSet.allOf(ActorRole.class))).isEmpty();
    }
}
