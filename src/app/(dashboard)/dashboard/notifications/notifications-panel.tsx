"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchNotifications,
  notificationsQueryKey,
} from "@/lib/api/notifications-client";

export function NotificationsPanel() {
  const notificationsQuery = useQuery({
    queryKey: notificationsQueryKey(),
    queryFn: ({ signal }) => fetchNotifications({ signal }),
  });

  const items = notificationsQuery.data ?? [];
  const error =
    notificationsQuery.error instanceof Error
      ? notificationsQuery.error.message
      : null;

  return (
    <section className="rounded-2xl border border-border bg-card p-8 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Varsler</h2>
          <p className="text-sm text-muted-foreground">
            Oversikt over systemvarsler (innlogging kreves).
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void notificationsQuery.refetch();
          }}
          className="rounded-md border border-border px-4 py-2 text-xs font-semibold text-foreground shadow-sm hover:bg-card/60"
          disabled={notificationsQuery.isFetching}
        >
          Oppdater
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {notificationsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Laster varsler …</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Du har ingen varsler enda. Systemhendelser dukker opp her.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((notification) => (
            <li
              key={notification.id}
              className="rounded-lg border border-border px-4 py-3 text-sm text-foreground"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{notification.type}</span>
                <span className="text-xs text-muted-foreground">
                  {notification.created_at
                    ? new Date(notification.created_at).toLocaleString("no-NB")
                    : ""}
                </span>
              </div>
              <pre className="mt-2 rounded bg-card/60 p-2 text-xs text-muted-foreground">
                {JSON.stringify(notification.payload, null, 2)}
              </pre>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
