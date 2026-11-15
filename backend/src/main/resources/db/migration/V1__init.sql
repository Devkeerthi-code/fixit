-- FixIt initial schema. Every tenant-owned table carries hostel_id so every query can be scoped.

CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE hostel (
    id                   BIGSERIAL PRIMARY KEY,
    name                 VARCHAR(120) NOT NULL,
    kind                 VARCHAR(16)  NOT NULL CHECK (kind IN ('HOSTEL', 'CAMPUS', 'SOCIETY')),
    resident_invite_code VARCHAR(12)  NOT NULL UNIQUE,
    staff_invite_code    VARCHAR(12)  NOT NULL UNIQUE,
    ticket_seq           BIGINT       NOT NULL DEFAULT 0,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE block (
    id        BIGSERIAL PRIMARY KEY,
    hostel_id BIGINT      NOT NULL REFERENCES hostel (id) ON DELETE CASCADE,
    name      VARCHAR(40) NOT NULL,
    CONSTRAINT uq_block_name UNIQUE (hostel_id, name)
);

CREATE TABLE room (
    id        BIGSERIAL PRIMARY KEY,
    hostel_id BIGINT      NOT NULL REFERENCES hostel (id) ON DELETE CASCADE,
    block_id  BIGINT      NOT NULL REFERENCES block (id) ON DELETE CASCADE,
    number    VARCHAR(16) NOT NULL,
    CONSTRAINT uq_room_number UNIQUE (block_id, number)
);
CREATE INDEX ix_room_hostel ON room (hostel_id);

CREATE TABLE category (
    id        BIGSERIAL PRIMARY KEY,
    hostel_id BIGINT       NOT NULL REFERENCES hostel (id) ON DELETE CASCADE,
    code      VARCHAR(24)  NOT NULL,
    name      VARCHAR(40)  NOT NULL,
    covers    VARCHAR(200) NOT NULL,
    active    BOOLEAN      NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_category_code UNIQUE (hostel_id, code)
);

CREATE TABLE sla_policy (
    id           BIGSERIAL PRIMARY KEY,
    hostel_id    BIGINT      NOT NULL REFERENCES hostel (id) ON DELETE CASCADE,
    category_id  BIGINT      NOT NULL REFERENCES category (id) ON DELETE CASCADE,
    priority     VARCHAR(8)  NOT NULL CHECK (priority IN ('LOW', 'NORMAL', 'URGENT')),
    target_hours INT         NOT NULL CHECK (target_hours BETWEEN 1 AND 720),
    CONSTRAINT uq_sla_policy UNIQUE (category_id, priority)
);

CREATE TABLE app_user (
    id            BIGSERIAL PRIMARY KEY,
    email         CITEXT       NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL,
    name          VARCHAR(80)  NOT NULL,
    hostel_id     BIGINT       REFERENCES hostel (id) ON DELETE SET NULL,
    role          VARCHAR(10)  CHECK (role IN ('RESIDENT', 'STAFF', 'WARDEN')),
    room_id       BIGINT       REFERENCES room (id) ON DELETE SET NULL,
    active        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    -- a user either has no hostel yet, or has both a hostel and a role
    CONSTRAINT ck_user_membership CHECK ((hostel_id IS NULL) = (role IS NULL))
);
CREATE INDEX ix_user_hostel_role ON app_user (hostel_id, role);

CREATE TABLE staff_skill (
    id          BIGSERIAL PRIMARY KEY,
    hostel_id   BIGINT NOT NULL REFERENCES hostel (id) ON DELETE CASCADE,
    staff_id    BIGINT NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    category_id BIGINT NOT NULL REFERENCES category (id) ON DELETE CASCADE,
    block_id    BIGINT REFERENCES block (id) ON DELETE CASCADE
);
-- NULL block means "all blocks"; COALESCE keeps uniqueness working with NULLs
CREATE UNIQUE INDEX uq_staff_skill ON staff_skill (staff_id, category_id, COALESCE(block_id, 0));
CREATE INDEX ix_staff_skill_lookup ON staff_skill (hostel_id, category_id);

CREATE TABLE ticket (
    id               BIGSERIAL PRIMARY KEY,
    hostel_id        BIGINT        NOT NULL REFERENCES hostel (id) ON DELETE CASCADE,
    number           BIGINT        NOT NULL,
    reporter_id      BIGINT        NOT NULL REFERENCES app_user (id),
    category_id      BIGINT        NOT NULL REFERENCES category (id),
    block_id         BIGINT        NOT NULL REFERENCES block (id),
    room_id          BIGINT        REFERENCES room (id),
    common_area      BOOLEAN       NOT NULL,
    location_note    VARCHAR(80),
    description      VARCHAR(1000) NOT NULL,
    priority         VARCHAR(8)    NOT NULL CHECK (priority IN ('LOW', 'NORMAL', 'URGENT')),
    status           VARCHAR(12)   NOT NULL CHECK (status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED')),
    assignee_id      BIGINT        REFERENCES app_user (id),
    version          BIGINT        NOT NULL DEFAULT 0,
    sla_due_at       TIMESTAMPTZ   NOT NULL,
    sla_cycle        INT           NOT NULL DEFAULT 1,
    sla_breached_at  TIMESTAMPTZ,
    rating           SMALLINT      CHECK (rating BETWEEN 1 AND 5),
    rating_comment   VARCHAR(300),
    idempotency_key  VARCHAR(64),
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
    assigned_at      TIMESTAMPTZ,
    resolved_at      TIMESTAMPTZ,
    closed_at        TIMESTAMPTZ,
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT uq_ticket_number UNIQUE (hostel_id, number),
    CONSTRAINT ck_ticket_location CHECK (common_area OR room_id IS NOT NULL)
);
CREATE INDEX ix_ticket_hostel_status ON ticket (hostel_id, status, created_at DESC);
CREATE INDEX ix_ticket_assignee_status ON ticket (assignee_id, status);
CREATE INDEX ix_ticket_reporter ON ticket (reporter_id, created_at DESC);
CREATE INDEX ix_ticket_room_category ON ticket (room_id, category_id, status);
CREATE INDEX ix_ticket_sla_open ON ticket (sla_due_at)
    WHERE status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'REOPENED');
-- same submit retried (double tap, flaky network) maps to the same ticket
CREATE UNIQUE INDEX uq_ticket_idempotency ON ticket (reporter_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE TABLE ticket_photo (
    id           BIGSERIAL PRIMARY KEY,
    ticket_id    BIGINT      NOT NULL REFERENCES ticket (id) ON DELETE CASCADE,
    hostel_id    BIGINT      NOT NULL REFERENCES hostel (id) ON DELETE CASCADE,
    content_type VARCHAR(16) NOT NULL CHECK (content_type IN ('image/jpeg', 'image/webp')),
    size_bytes   INT         NOT NULL CHECK (size_bytes BETWEEN 1 AND 524288),
    bytes        BYTEA       NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_photo_ticket ON ticket_photo (ticket_id);

CREATE TABLE visit_slot (
    id         BIGSERIAL PRIMARY KEY,
    ticket_id  BIGINT     NOT NULL REFERENCES ticket (id) ON DELETE CASCADE,
    day        DATE       NOT NULL,
    time_window VARCHAR(10) NOT NULL CHECK (time_window IN ('MORNING', 'AFTERNOON', 'EVENING')),
    CONSTRAINT uq_visit_slot UNIQUE (ticket_id, day, time_window)
);

CREATE TABLE ticket_event (
    id          BIGSERIAL PRIMARY KEY,
    ticket_id   BIGINT       NOT NULL REFERENCES ticket (id) ON DELETE CASCADE,
    hostel_id   BIGINT       NOT NULL REFERENCES hostel (id) ON DELETE CASCADE,
    actor_id    BIGINT       REFERENCES app_user (id),
    type        VARCHAR(24)  NOT NULL,
    from_status VARCHAR(12),
    to_status   VARCHAR(12),
    note        VARCHAR(500),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX ix_event_ticket ON ticket_event (ticket_id, created_at);

CREATE TABLE ticket_affected (
    ticket_id  BIGINT      NOT NULL REFERENCES ticket (id) ON DELETE CASCADE,
    user_id    BIGINT      NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (ticket_id, user_id)
);

CREATE TABLE escalation (
    id          BIGSERIAL PRIMARY KEY,
    ticket_id   BIGINT      NOT NULL REFERENCES ticket (id) ON DELETE CASCADE,
    hostel_id   BIGINT      NOT NULL REFERENCES hostel (id) ON DELETE CASCADE,
    sla_cycle   INT         NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- the idempotency guarantee: one escalation per ticket per SLA cycle, ever
    CONSTRAINT uq_escalation UNIQUE (ticket_id, sla_cycle)
);

CREATE TABLE notification (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT       NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    hostel_id  BIGINT       NOT NULL REFERENCES hostel (id) ON DELETE CASCADE,
    ticket_id  BIGINT       REFERENCES ticket (id) ON DELETE CASCADE,
    type       VARCHAR(24)  NOT NULL,
    message    VARCHAR(240) NOT NULL,
    read_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX ix_notification_user ON notification (user_id, created_at DESC);
CREATE INDEX ix_notification_unread ON notification (user_id) WHERE read_at IS NULL;

CREATE TABLE refresh_token (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT      NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    token_hash CHAR(64)    NOT NULL UNIQUE,
    family_id  UUID        NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_refresh_family ON refresh_token (family_id);

-- Usage tracking: aggregate counts only, no user ids, no IPs.
CREATE TABLE usage_counter (
    day    DATE        NOT NULL,
    action VARCHAR(32) NOT NULL,
    count  BIGINT      NOT NULL DEFAULT 0,
    PRIMARY KEY (day, action)
);
