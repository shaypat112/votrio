export async function sendNotificationEmail(payload: {
  user_id: string;
  type: string;
  data: Record<string, unknown>;
}) {
  const endpoint = process.env.NOTIFICATION_EMAIL_WEBHOOK_URL;
  const token = process.env.NOTIFICATION_EMAIL_WEBHOOK_TOKEN;

  if (!endpoint) return;

  try {
    await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        ...payload,
        created_at: new Date().toISOString(),
      }),
    });
  } catch {
    // Best-effort email delivery.
  }
}
