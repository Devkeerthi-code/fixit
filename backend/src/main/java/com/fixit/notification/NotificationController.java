package com.fixit.notification;

import com.fixit.notification.NotificationService.Inbox;
import com.fixit.security.AuthUser;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notifications")
@Tag(name = "Notifications", description = "In-app notifications; the app polls this every 30 seconds")
public class NotificationController {

    private final NotificationService notifications;

    public NotificationController(NotificationService notifications) {
        this.notifications = notifications;
    }

    @GetMapping
    public Inbox inbox(@AuthenticationPrincipal AuthUser me) {
        return notifications.inbox(me.userId());
    }

    @PostMapping("/read")
    public ResponseEntity<Void> markAllRead(@AuthenticationPrincipal AuthUser me) {
        notifications.markAllRead(me.userId());
        return ResponseEntity.noContent().build();
    }
}
