package com.fixit.notification;

import com.fixit.user.Role;
import com.fixit.user.UserRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationService {

    public record NotificationView(Long id, Long ticketId, String type, String message, boolean read, Instant createdAt) {}

    public record Inbox(List<NotificationView> items, long unread) {}

    private final NotificationRepository notifications;
    private final UserRepository users;
    private final Clock clock;

    public NotificationService(NotificationRepository notifications, UserRepository users, Clock clock) {
        this.notifications = notifications;
        this.users = users;
        this.clock = clock;
    }

    /** Joins the caller's transaction, so a notification exists only if the change that caused it commits. */
    @Transactional
    public void notify(Long userId, Long hostelId, Long ticketId, String type, String message) {
        if (userId == null) {
            return;
        }
        notifications.save(new Notification(userId, hostelId, ticketId, type, message, Instant.now(clock)));
    }

    @Transactional
    public void notifyWardens(Long hostelId, Long ticketId, String type, String message) {
        users.findByHostelIdAndRoleAndActiveTrue(hostelId, Role.WARDEN)
                .forEach(w -> notify(w.getId(), hostelId, ticketId, type, message));
    }

    @Transactional(readOnly = true)
    public Inbox inbox(Long userId) {
        List<NotificationView> items = notifications.findTop30ByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(n -> new NotificationView(n.getId(), n.getTicketId(), n.getType(), n.getMessage(),
                        n.getReadAt() != null, n.getCreatedAt()))
                .toList();
        return new Inbox(items, notifications.countByUserIdAndReadAtIsNull(userId));
    }

    @Transactional
    public void markAllRead(Long userId) {
        notifications.markAllRead(userId, Instant.now(clock));
    }
}
