import { NextResponse } from "next/server";
import { decodeUserId, getSupabaseEnv, parsePagination, supabaseFetch } from "@/app/lib/server/supabaseRest";
import { deliverWebhooks } from "@/app/lib/server/webhooks";
import { logActivity } from "@/app/lib/server/activity";
import { sendNotificationEmail } from "@/app/lib/server/email";

export const runtime = "nodejs";

const MAX_REVIEWS_PER_HOUR = 5;

function getCountFromResponse(res: Response) {
  const contentRange = res.headers.get("content-range") ?? res.headers.get("Content-Range");
  if (!contentRange) return 0;
  const parts = contentRange.split("/");
  return Number(parts[1] ?? 0);
}

async function refreshLatestReview(env: ReturnType<typeof getSupabaseEnv>, accessToken: string, repoId: string) {
  const latestRes = await supabaseFetch(
    env,
    `reviews?repo_id=eq.${repoId}&deleted_at=is.null&select=body,created_at&order=created_at.desc&limit=1`,
    { accessToken },
  );

  if (!latestRes.ok) return;
  const latestRows = await latestRes.json();
  const latest = latestRows?.[0];

  await supabaseFetch(env, `repositories?id=eq.${repoId}`, {
    method: "PATCH",
    accessToken,
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      last_review_excerpt: latest?.body?.slice(0, 140) ?? null,
      last_review_at: latest?.created_at ?? null,
      updated_at: new Date().toISOString(),
    }),
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const repoId = searchParams.get("repoId");
    if (!repoId) {
      return NextResponse.json({ error: "Missing repoId." }, { status: 400 });
    }

    const { page, pageSize, offset } = parsePagination(searchParams, { page: 1, pageSize: 6 });
    const env = getSupabaseEnv();

    const res = await supabaseFetch(
      env,
      `reviews?repo_id=eq.${repoId}&deleted_at=is.null&select=id,repo_id,author_id,rating,title,body,version,created_at,edited_at,profiles(full_name,username,avatar_url)&order=created_at.desc&limit=${pageSize}&offset=${offset}`,
      { accessToken: undefined },
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    const reviews = await res.json();
    return NextResponse.json({ reviews, page, pageSize });
  } catch (error) {
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { accessToken, repoId, rating, title, body } = await request.json();

    if (!accessToken || !repoId || !rating || !body) {
      return NextResponse.json({ error: "Missing accessToken, repoId, rating, or body." }, { status: 400 });
    }

    if (Number(rating) < 1 || Number(rating) > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5." }, { status: 400 });
    }

    const userId = decodeUserId(accessToken);
    if (!userId) {
      return NextResponse.json({ error: "Invalid access token." }, { status: 401 });
    }

    const env = getSupabaseEnv();
    const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const rateRes = await supabaseFetch(
      env,
      `reviews?author_id=eq.${userId}&created_at=gte.${cutoff}&select=id`,
      { accessToken, headers: { Prefer: "count=exact" } },
    );

    if (!rateRes.ok) {
      const text = await rateRes.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    const reviewCount = getCountFromResponse(rateRes);
    if (reviewCount >= MAX_REVIEWS_PER_HOUR) {
      return NextResponse.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 });
    }

    const repoRes = await supabaseFetch(
      env,
      `repositories?id=eq.${repoId}&select=id,owner_id,review_count,rating_total,repo_url,name`,
      { accessToken },
    );

    if (!repoRes.ok) {
      const text = await repoRes.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    const repoRows = await repoRes.json();
    const repo = repoRows?.[0];
    if (!repo) {
      return NextResponse.json({ error: "Repository not found." }, { status: 404 });
    }

    const insertRes = await supabaseFetch(env, "reviews", {
      method: "POST",
      accessToken,
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        repo_id: repoId,
        author_id: userId,
        rating: Number(rating),
        title: title ?? null,
        body: String(body),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });

    if (!insertRes.ok) {
      const text = await insertRes.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    const reviewRows = await insertRes.json();
    const review = reviewRows?.[0];

    const newReviewCount = Number(repo.review_count ?? 0) + 1;
    const newRatingTotal = Number(repo.rating_total ?? 0) + Number(rating);
    const newRatingAvg = newReviewCount > 0 ? newRatingTotal / newReviewCount : 0;

    await supabaseFetch(env, `repositories?id=eq.${repoId}`, {
      method: "PATCH",
      accessToken,
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        review_count: newReviewCount,
        rating_total: newRatingTotal,
        rating_avg: Number(newRatingAvg.toFixed(2)),
        last_review_excerpt: String(body).slice(0, 140),
        last_review_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });

    if (repo.owner_id && repo.owner_id !== userId) {
      const settingsRes = await supabaseFetch(
        env,
        `user_settings?user_id=eq.${repo.owner_id}&select=data`,
        { accessToken },
      );
      const settingsRows = settingsRes.ok ? await settingsRes.json() : [];
      const ownerSettings = settingsRows?.[0]?.data ?? {};

      await supabaseFetch(env, "notifications", {
        method: "POST",
        accessToken,
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          user_id: repo.owner_id,
          type: "review.created",
          data: {
            review_id: review?.id,
            repo_id: repoId,
            repo_url: repo.repo_url,
            repo_name: repo.name,
            rating: Number(rating),
          },
          created_at: new Date().toISOString(),
        }),
      });

      if (ownerSettings.emailNotifications) {
        await sendNotificationEmail({
          user_id: repo.owner_id,
          type: "review.created",
          data: {
            review_id: review?.id,
            repo_id: repoId,
            repo_url: repo.repo_url,
            repo_name: repo.name,
            rating: Number(rating),
          },
        });
      }
    }

    await deliverWebhooks(env, accessToken, {
      userId: repo.owner_id ?? userId,
      event: "review.created",
      payload: {
        review_id: review?.id,
        repo_id: repoId,
        repo_url: repo.repo_url,
        rating: Number(rating),
        author_id: userId,
      },
    });

    await logActivity(env, accessToken, {
      actor_id: userId,
      action: "review.created",
      target_type: "review",
      target_id: review?.id ?? null,
      meta: { repo_id: repoId },
    });

    return NextResponse.json({ review });
  } catch (error) {
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { accessToken, reviewId, rating, title, body } = await request.json();

    if (!accessToken || !reviewId) {
      return NextResponse.json({ error: "Missing accessToken or reviewId." }, { status: 400 });
    }

    if (rating && (Number(rating) < 1 || Number(rating) > 5)) {
      return NextResponse.json({ error: "Rating must be between 1 and 5." }, { status: 400 });
    }

    const userId = decodeUserId(accessToken);
    if (!userId) {
      return NextResponse.json({ error: "Invalid access token." }, { status: 401 });
    }

    const env = getSupabaseEnv();

    const reviewRes = await supabaseFetch(
      env,
      `reviews?id=eq.${reviewId}&select=id,repo_id,author_id,rating,version`,
      { accessToken },
    );

    if (!reviewRes.ok) {
      const text = await reviewRes.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    const reviewRows = await reviewRes.json();
    const review = reviewRows?.[0];
    if (!review || review.author_id !== userId) {
      return NextResponse.json({ error: "Review not found." }, { status: 404 });
    }

    const repoId = review.repo_id;

    const repoRes = await supabaseFetch(
      env,
      `repositories?id=eq.${repoId}&select=review_count,rating_total`,
      { accessToken },
    );

    if (!repoRes.ok) {
      const text = await repoRes.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    const repoRows = await repoRes.json();
    const repo = repoRows?.[0];

    const newRatingTotal =
      rating && repo
        ? Number(repo.rating_total ?? 0) - Number(review.rating ?? 0) + Number(rating)
        : repo?.rating_total ?? 0;

    const newRatingAvg = repo && repo.review_count
      ? Number(newRatingTotal) / Number(repo.review_count)
      : 0;

    const updateRes = await supabaseFetch(env, `reviews?id=eq.${reviewId}`, {
      method: "PATCH",
      accessToken,
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        rating: rating ?? review.rating,
        title: title ?? review.title ?? null,
        body: body ?? review.body ?? null,
        version: Number(review.version ?? 1) + 1,
        edited_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });

    if (!updateRes.ok) {
      const text = await updateRes.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    await supabaseFetch(env, `repositories?id=eq.${repoId}`, {
      method: "PATCH",
      accessToken,
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        rating_total: newRatingTotal,
        rating_avg: Number(newRatingAvg.toFixed(2)),
        updated_at: new Date().toISOString(),
      }),
    });

    await refreshLatestReview(env, accessToken, repoId);

    await logActivity(env, accessToken, {
      actor_id: userId,
      action: "review.updated",
      target_type: "review",
      target_id: reviewId,
      meta: { repo_id: repoId },
    });

    const updated = await updateRes.json();
    return NextResponse.json({ review: updated?.[0] });
  } catch (error) {
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { accessToken, reviewId } = await request.json();

    if (!accessToken || !reviewId) {
      return NextResponse.json({ error: "Missing accessToken or reviewId." }, { status: 400 });
    }

    const userId = decodeUserId(accessToken);
    if (!userId) {
      return NextResponse.json({ error: "Invalid access token." }, { status: 401 });
    }

    const env = getSupabaseEnv();

    const reviewRes = await supabaseFetch(
      env,
      `reviews?id=eq.${reviewId}&select=id,repo_id,author_id,rating`,
      { accessToken },
    );

    if (!reviewRes.ok) {
      const text = await reviewRes.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    const reviewRows = await reviewRes.json();
    const review = reviewRows?.[0];
    if (!review || review.author_id !== userId) {
      return NextResponse.json({ error: "Review not found." }, { status: 404 });
    }

    const repoId = review.repo_id;

    const repoRes = await supabaseFetch(
      env,
      `repositories?id=eq.${repoId}&select=review_count,rating_total`,
      { accessToken },
    );

    if (!repoRes.ok) {
      const text = await repoRes.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    const repoRows = await repoRes.json();
    const repo = repoRows?.[0];

    const deleteRes = await supabaseFetch(env, `reviews?id=eq.${reviewId}`, {
      method: "PATCH",
      accessToken,
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });

    if (!deleteRes.ok) {
      const text = await deleteRes.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    const newReviewCount = Math.max(0, Number(repo?.review_count ?? 0) - 1);
    const newRatingTotal = Math.max(0, Number(repo?.rating_total ?? 0) - Number(review.rating ?? 0));
    const newRatingAvg = newReviewCount > 0 ? newRatingTotal / newReviewCount : 0;

    await supabaseFetch(env, `repositories?id=eq.${repoId}`, {
      method: "PATCH",
      accessToken,
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        review_count: newReviewCount,
        rating_total: newRatingTotal,
        rating_avg: Number(newRatingAvg.toFixed(2)),
        updated_at: new Date().toISOString(),
      }),
    });

    await refreshLatestReview(env, accessToken, repoId);

    await logActivity(env, accessToken, {
      actor_id: userId,
      action: "review.deleted",
      target_type: "review",
      target_id: reviewId,
      meta: { repo_id: repoId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
