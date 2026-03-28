import { supabaseFetch, type SupabaseEnv } from "./supabaseRest";

const RETRY_MINUTES = 5;

function getRetryAt() {
  const date = new Date();
  date.setMinutes(date.getMinutes() + RETRY_MINUTES);
  return date.toISOString();
}

export async function deliverWebhooks(
  env: SupabaseEnv,
  accessToken: string | undefined,
  options: {
    userId: string;
    event: string;
    payload: Record<string, unknown>;
  },
) {
  if (!accessToken) return;

  const endpointsRes = await supabaseFetch(
    env,
    `webhook_endpoints?user_id=eq.${options.userId}&enabled=eq.true&select=id,url,events,secret`,
    { accessToken },
  );

  if (!endpointsRes.ok) return;
  const endpoints = (await endpointsRes.json()) as Array<{
    id: string;
    url: string;
    events: string[];
    secret?: string | null;
  }>;

  const targets = endpoints.filter((endpoint) =>
    Array.isArray(endpoint.events) ? endpoint.events.includes(options.event) : true,
  );

  for (const endpoint of targets) {
    const deliveryPayload = {
      event: options.event,
      user_id: options.userId,
      payload: options.payload,
      created_at: new Date().toISOString(),
    };

    const deliveryRes = await supabaseFetch(env, "webhook_deliveries", {
      method: "POST",
      accessToken,
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        webhook_id: endpoint.id,
        event: options.event,
        payload: deliveryPayload,
        status: "pending",
        attempt_count: 0,
        created_at: new Date().toISOString(),
      }),
    });

    const deliveryRows = deliveryRes.ok ? await deliveryRes.json() : null;
    const deliveryId = deliveryRows?.[0]?.id as string | undefined;

    try {
      const res = await fetch(endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "votrio-webhooks",
        },
        body: JSON.stringify({ ...deliveryPayload, delivery_id: deliveryId }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        if (deliveryId) {
          await supabaseFetch(env, `webhook_deliveries?id=eq.${deliveryId}`, {
            method: "PATCH",
            accessToken,
            headers: { Prefer: "return=minimal" },
            body: JSON.stringify({
              status: "failed",
              attempt_count: 1,
              last_error: errorText,
              next_retry_at: getRetryAt(),
              updated_at: new Date().toISOString(),
            }),
          });
        }
      } else if (deliveryId) {
        await supabaseFetch(env, `webhook_deliveries?id=eq.${deliveryId}`, {
          method: "PATCH",
          accessToken,
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({
            status: "delivered",
            attempt_count: 1,
            updated_at: new Date().toISOString(),
          }),
        });
      }
    } catch (error: any) {
      if (deliveryId) {
        await supabaseFetch(env, `webhook_deliveries?id=eq.${deliveryId}`, {
          method: "PATCH",
          accessToken,
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({
            status: "failed",
            attempt_count: 1,
            last_error: error?.message ?? "Webhook delivery failed",
            next_retry_at: getRetryAt(),
            updated_at: new Date().toISOString(),
          }),
        });
      }
    }
  }
}

export async function retryDeliveries(
  env: SupabaseEnv,
  accessToken: string | undefined,
  _userId: string,
) {
  if (!accessToken) return { retried: 0 };

  const now = new Date().toISOString();
  const deliveriesRes = await supabaseFetch(
    env,
    `webhook_deliveries?status=eq.failed&next_retry_at=lte.${now}&select=id,event,payload,attempt_count,webhook_id,webhook_endpoints(url,enabled,events)&order=next_retry_at.asc&limit=10`,
    { accessToken },
  );

  if (!deliveriesRes.ok) return { retried: 0 };
  const deliveries = (await deliveriesRes.json()) as Array<any>;

  let retried = 0;
  for (const delivery of deliveries) {
    const endpoint = delivery.webhook_endpoints;
    if (!endpoint?.enabled) continue;

    try {
      const res = await fetch(endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "votrio-webhooks",
        },
        body: JSON.stringify({ ...delivery.payload, retry: true }),
      });

      if (res.ok) {
        await supabaseFetch(env, `webhook_deliveries?id=eq.${delivery.id}`, {
          method: "PATCH",
          accessToken,
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({
            status: "delivered",
            attempt_count: delivery.attempt_count + 1,
            updated_at: new Date().toISOString(),
          }),
        });
        retried += 1;
      } else {
        await supabaseFetch(env, `webhook_deliveries?id=eq.${delivery.id}`, {
          method: "PATCH",
          accessToken,
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({
            status: "failed",
            attempt_count: delivery.attempt_count + 1,
            last_error: await res.text(),
            next_retry_at: getRetryAt(),
            updated_at: new Date().toISOString(),
          }),
        });
      }
    } catch (error: any) {
      await supabaseFetch(env, `webhook_deliveries?id=eq.${delivery.id}`, {
        method: "PATCH",
        accessToken,
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          status: "failed",
          attempt_count: delivery.attempt_count + 1,
          last_error: error?.message ?? "Webhook retry failed",
          next_retry_at: getRetryAt(),
          updated_at: new Date().toISOString(),
        }),
      });
    }
  }

  return { retried };
}
