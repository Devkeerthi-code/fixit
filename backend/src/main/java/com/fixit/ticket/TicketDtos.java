package com.fixit.ticket;

import jakarta.validation.Valid;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;

/** Request and response bodies for tickets. Entities never leave the service layer; these records do. */
public final class TicketDtos {

    private TicketDtos() {}

    public record SlotInput(@NotNull @FutureOrPresent LocalDate day, @NotNull TimeWindow window) {}

    public record CreateTicketRequest(
            @NotNull Long categoryId,
            boolean commonArea,
            Long blockId,
            Long roomId,
            @Size(max = 80) String locationNote,
            @NotBlank @Size(min = 10, max = 1000, message = "Describe it in 10 to 1000 characters") String description,
            @NotNull Priority priority,
            @Size(max = 6) List<@Valid SlotInput> visitSlots,
            boolean confirmDuplicate) {}

    public record TransitionRequest(
            @NotNull TicketAction action,
            @NotNull Long version,
            @Size(max = 500) String note,
            @Min(1) @Max(5) Integer rating) {}

    public record AssignRequest(@NotNull Long staffId, @NotNull Long version) {}

    public record Ref(Long id, String name) {}

    public record CategoryRef(Long id, String code, String name) {}

    public record TicketSummary(
            Long id,
            String code,
            CategoryRef category,
            Ref block,
            String roomLabel,
            boolean commonArea,
            String locationNote,
            String description,
            Priority priority,
            TicketStatus status,
            Ref reporter,
            Ref assignee,
            Instant createdAt,
            Instant slaDueAt,
            boolean slaBreached,
            long affectedCount,
            boolean affectedByMe,
            Long version) {}

    public record EventView(String type, TicketStatus from, TicketStatus to, String note, String actor, Instant at) {}

    public record SlotView(LocalDate day, TimeWindow window) {}

    public record TicketDetail(
            TicketSummary ticket,
            List<Long> photoIds,
            List<SlotView> visitSlots,
            Integer rating,
            String ratingComment,
            Instant assignedAt,
            Instant startedAt,
            Instant resolvedAt,
            Instant closedAt,
            Set<TicketAction> availableActions,
            List<EventView> events) {}

    public record AffectedView(long affectedCount, boolean affectedByMe) {}

    public record PageView<T>(List<T> items, int page, int size, long total) {}
}
