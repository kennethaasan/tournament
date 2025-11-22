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
    <section className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900">Varsler</h2>
          <p className="text-sm text-zinc-600">
            Oversikt over systemvarsler (innlogging kreves).
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void notificationsQuery.refetch();
          }}
          className="rounded-md border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50"
          disabled={notificationsQuery.isFetching}
        >
          Oppdater
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {notificationsQuery.isLoading ? (
        <p className="text-sm text-zinc-600">Laster varsler …</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Du har ingen varsler enda. Systemhendelser dukker opp her.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((notification) => (
            <li
              key={notification.id}
              className="rounded-lg border border-zinc-200 px-4 py-3 text-sm text-zinc-800"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{notification.type}</span>
                <span className="text-xs text-zinc-500">
                  {notification.created_at
                    ? new Date(notification.created_at).toLocaleString("no-NB")
                    : ""}
                </span>
              </div>
              <pre className="mt-2 rounded bg-zinc-50 p-2 text-xs text-zinc-600">
                {JSON.stringify(notification.payload, null, 2)}
              </pre>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
