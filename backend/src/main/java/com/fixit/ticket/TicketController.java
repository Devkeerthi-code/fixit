package com.fixit.ticket;

import com.fixit.security.AuthUser;
import com.fixit.ticket.TicketDtos.AffectedView;
import com.fixit.ticket.TicketDtos.AssignRequest;
import com.fixit.ticket.TicketDtos.CreateTicketRequest;
import com.fixit.ticket.TicketDtos.PageView;
import com.fixit.ticket.TicketDtos.Ref;
import com.fixit.ticket.TicketDtos.TicketDetail;
import com.fixit.ticket.TicketDtos.TicketSummary;
import com.fixit.ticket.TicketDtos.TransitionRequest;
import com.fixit.ticket.TicketQueryService.SortBy;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.Duration;
import java.util.List;
import java.util.Set;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@Validated
@RequestMapping("/api/tickets")
@Tag(name = "Tickets", description = "Raise, track and work on complaints")
public class TicketController {

    private final TicketQueryService queries;
    private final TicketCommandService commands;

    public TicketController(TicketQueryService queries, TicketCommandService commands) {
        this.queries = queries;
        this.commands = commands;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Raise a ticket: JSON part 'ticket' plus up to 3 photos. Send an Idempotency-Key header "
            + "so a retried submit returns the same ticket instead of creating a second one.")
    public ResponseEntity<TicketDetail> create(@AuthenticationPrincipal AuthUser me,
                                               @Valid @RequestPart("ticket") CreateTicketRequest ticket,
                                               @RequestPart(name = "photos", required = false) List<MultipartFile> photos,
                                               @RequestHeader(name = "Idempotency-Key", required = false) String key) {
        TicketCommandService.Created created = commands.create(me, ticket, photos, key);
        HttpStatus status = created.replayed() ? HttpStatus.OK : HttpStatus.CREATED;
        return ResponseEntity.status(status).body(queries.detail(me, created.ticketId()));
    }

    @GetMapping
    @Operation(summary = "List tickets you can see, newest first or by due time")
    public PageView<TicketSummary> list(@AuthenticationPrincipal AuthUser me,
                                        @RequestParam(required = false) Set<TicketStatus> status,
                                        @RequestParam(required = false) Long categoryId,
                                        @RequestParam(required = false) Long blockId,
                                        @RequestParam(required = false) Long assigneeId,
                                        @RequestParam(defaultValue = "false") boolean mine,
                                        @RequestParam(defaultValue = "false") boolean assignedToMe,
                                        @RequestParam(defaultValue = "false") boolean breached,
                                        @RequestParam(defaultValue = "false") boolean common,
                                        @RequestParam(defaultValue = "RECENT") SortBy sort,
                                        @RequestParam(defaultValue = "0") int page,
                                        @RequestParam(defaultValue = "20") int size) {
        TicketFilter filter = new TicketFilter(status, categoryId, blockId, assigneeId, mine, assignedToMe, breached, common);
        return queries.list(me, filter, sort, page, size);
    }

    @GetMapping("/duplicates")
    @Operation(summary = "Open tickets that would duplicate a new one (same room + category, or same block for common areas)")
    public List<TicketSummary> duplicates(@AuthenticationPrincipal AuthUser me, @RequestParam Long categoryId,
                                          @RequestParam(required = false) Long roomId,
                                          @RequestParam(required = false) Long blockId) {
        return queries.duplicates(me, categoryId, roomId, blockId);
    }

    @GetMapping("/assignable-staff")
    public List<Ref> assignableStaff(@AuthenticationPrincipal AuthUser me) {
        return queries.assignableStaff(me);
    }

    @GetMapping("/{id}")
    public TicketDetail detail(@AuthenticationPrincipal AuthUser me, @PathVariable Long id) {
        return queries.detail(me, id);
    }

    @PostMapping("/{id}/transitions")
    @Operation(summary = "START, RESOLVE, CONFIRM (with rating) or REOPEN. Send the version you last saw.")
    public TicketDetail transition(@AuthenticationPrincipal AuthUser me, @PathVariable Long id,
                                   @Valid @RequestBody TransitionRequest req) {
        commands.transition(me, id, req);
        return queries.detail(me, id);
    }

    @PostMapping("/{id}/assign")
    @Operation(summary = "Warden reassigns a ticket")
    public TicketDetail assign(@AuthenticationPrincipal AuthUser me, @PathVariable Long id,
                               @Valid @RequestBody AssignRequest req) {
        commands.assign(me, id, req);
        return queries.detail(me, id);
    }

    @PostMapping("/{id}/affects-me")
    @Operation(summary = "Mark a common-area issue as affecting you too (idempotent)")
    public AffectedView affectsMe(@AuthenticationPrincipal AuthUser me, @PathVariable Long id) {
        return commands.setAffected(me, id, true);
    }

    @DeleteMapping("/{id}/affects-me")
    public AffectedView notAffected(@AuthenticationPrincipal AuthUser me, @PathVariable Long id) {
        return commands.setAffected(me, id, false);
    }

    @GetMapping("/{id}/photos/{photoId}")
    public ResponseEntity<byte[]> photo(@AuthenticationPrincipal AuthUser me, @PathVariable Long id,
                                        @PathVariable Long photoId) {
        TicketPhoto photo = queries.photo(me, id, photoId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(photo.getContentType()))
                .cacheControl(CacheControl.maxAge(Duration.ofDays(1)).cachePrivate())
                .body(photo.getBytes());
    }
}
