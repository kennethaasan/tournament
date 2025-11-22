import { apiClient, unwrapResponse } from "@/lib/api/client";
import type { components } from "@/lib/api/generated/openapi";

type FetchNotificationsOptions = {
  signal?: AbortSignal;
};

export const notificationsQueryKey = () => ["notifications"] as const;

export async function fetchNotifications(
  options: FetchNotificationsOptions = {},
): Promise<components["schemas"]["Notification"][]> {
  const { data, error, response } = await apiClient.GET("/api/notifications", {
    signal: options.signal,
    credentials: "include",
  });

  const payload = unwrapResponse({
    data,
    error,
    response,
  });

  return payload.items ?? [];
}
