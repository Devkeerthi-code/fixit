package com.fixit.hostel;

import com.fixit.ticket.Priority;
import com.fixit.user.Role;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;

/** Request and response bodies for hostel setup and administration. */
public final class HostelDtos {

    private HostelDtos() {}

    public record BlockInput(
            @NotBlank @Size(max = 40) String name,
            @NotBlank @Size(max = 500) String rooms) {}

    public record CreateHostelRequest(
            @NotBlank @Size(max = 120) String name,
            @NotNull Hostel.Kind kind,
            @NotEmpty @Size(max = 30) List<@Valid BlockInput> blocks) {}

    public record CodeRequest(@NotBlank @Size(max = 12) String code) {}

    public record JoinRequest(@NotBlank @Size(max = 12) String code, Long roomId) {}

    public record UpdateHostelRequest(@NotBlank @Size(max = 120) String name, @NotNull Hostel.Kind kind) {}

    public record RoomsRequest(@NotBlank @Size(max = 500) String rooms) {}

    public record UpdateCategoryRequest(
            @NotBlank @Size(max = 40) String name,
            @NotBlank @Size(max = 200) String covers,
            boolean active,
            @NotNull Map<Priority, @NotNull @Min(1) @Max(720) Integer> slaHours) {}

    public record SkillInput(@NotNull Long categoryId, Long blockId) {}

    public record SetSkillsRequest(@NotNull @Size(max = 60) List<@Valid SkillInput> skills) {}

    public record ActiveRequest(boolean active) {}

    public record RoomView(Long id, String number) {}

    public record BlockView(Long id, String name, List<RoomView> rooms) {}

    public record HostelLookup(String name, Hostel.Kind kind, Role joinsAs, List<BlockView> blocks) {}

    public record HostelSettings(Long id, String name, Hostel.Kind kind, String residentInviteCode,
                                 String staffInviteCode, long members) {}

    public record CategoryView(Long id, String code, String name, String covers, boolean active,
                               Map<Priority, Integer> slaHours) {}

    public record SkillView(Long categoryId, Long blockId) {}

    public record StaffView(Long id, String name, String email, Role role, boolean active,
                            List<SkillView> skills) {}
}
