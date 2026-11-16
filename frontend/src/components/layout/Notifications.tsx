import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { inboxApi } from "../../api/inbox";
import { keys, useInbox } from "../../api/queries";
import type { Inbox } from "../../api/types";
import { cx } from "../../lib/cx";
import { timeAgo } from "../../lib/format";
import { toastError } from "../../lib/toast";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { Icon } from "../ui/Icon";
import { EmptyState, ErrorState, Skeleton } from "../ui/States";

function useRingOnNew(unread: number) {
  const [ringing, setRinging] = useState(false);
  const last = useRef(unread);
  useEffect(() => {
    if (unread > last.current) {
      setRinging(true);
      const t = window.setTimeout(() => setRinging(false), 650);
      last.current = unread;
      return () => window.clearTimeout(t);
    }
    last.current = unread;
  }, [unread]);
  return ringing;
}

function InboxList({ onPick }: { onPick: () => void }) {
  const inbox = useInbox(true);
  const qc = useQueryClient();
  const markRead = useMutation({
    mutationFn: inboxApi.markAllRead,
    onMutate: () => {
      const prev = qc.getQueryData<Inbox>(keys.inbox);
      if (prev) qc.setQueryData<Inbox>(keys.inbox, { unread: 0, items: prev.items.map((n) => ({ ...n, read: true })) });
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(keys.inbox, ctx.prev);
      toastError(e);
    },
  });

  if (inbox.isPending) return <Skeleton rows={3} label="Loading notifications" />;
  if (inbox.isError) return <ErrorState error={inbox.error} onRetry={() => void inbox.refetch()} />;
  const { items, unread } = inbox.data;
  if (!items.length) {
    return <EmptyState title={<>No updates <em>yet.</em></>} body="When someone picks up, starts or fixes one of your tickets, it shows up here." />;
  }
  return (
    <>
      <ul className="notifs">
        {items.map((n) => {
          const body = (
            <>
              <span className="notif__dot" aria-hidden="true" />
              <div>
                <p className="notif__t">
                  {n.message}
                  {!n.read && <span className="sr-only"> (unread)</span>}
                </p>
                <p className="notif__m">{timeAgo(n.createdAt)}</p>
              </div>
            </>
          );
          return (
            <li key={n.id}>
              {n.ticketId ? (
                <Link to={`/tickets/${n.ticketId}`} className={cx("notif", !n.read && "is-unread")} onClick={onPick}>
                  {body}
                </Link>
              ) : (
                <div className={cx("notif", !n.read && "is-unread")}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
      {unread > 0 && (
        <Button variant="text" size="small" className="justify-self-start" pending={markRead.isPending} onClick={() => markRead.mutate()}>
          Mark all as read
        </Button>
      )}
    </>
  );
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const inbox = useInbox(true);
  const unread = inbox.data?.unread ?? 0;
  const ringing = useRingOnNew(unread);
  return (
    <>
      <button
        type="button"
        className={cx("icon-btn bell", ringing && "is-ringing")}
        aria-haspopup="dialog"
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        onClick={() => setOpen(true)}
      >
        <Icon name="bell" />
        {unread > 0 && <span className="bell__badge" aria-hidden="true">{unread > 99 ? "99+" : unread}</span>}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Notifications" label="( updates )" variant="sheet">
        <InboxList onPick={() => setOpen(false)} />
      </Dialog>
    </>
  );
}
