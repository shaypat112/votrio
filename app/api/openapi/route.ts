import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    openapi: "3.0.3",
    info: {
      title: "Votrio API",
      version: "0.2.0",
      description: "Public repository discovery and review APIs.",
    },
    paths: {
      "/api/repositories/public": {
        get: {
          summary: "List public repositories",
          parameters: [
            { name: "sort", in: "query", schema: { type: "string" } },
            { name: "page", in: "query", schema: { type: "integer" } },
            { name: "pageSize", in: "query", schema: { type: "integer" } },
          ],
        },
      },
      "/api/repositories/{id}": {
        get: {
          summary: "Fetch repository detail",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
          ],
        },
      },
      "/api/repositories/submit": {
        post: {
          summary: "Submit a repository",
        },
      },
      "/api/repositories/update-visibility": {
        post: {
          summary: "Update repository visibility",
        },
      },
      "/api/reviews": {
        get: { summary: "List reviews" },
        post: { summary: "Create review" },
        put: { summary: "Update review" },
        delete: { summary: "Delete review" },
      },
      "/api/reviews/flag": {
        post: { summary: "Flag a review" },
      },
      "/api/notifications": {
        get: { summary: "List notifications" },
        post: { summary: "Mark notifications read" },
      },
      "/api/settings/load": {
        post: { summary: "Load settings" },
      },
      "/api/settings/save": {
        post: { summary: "Save settings" },
      },
      "/api/settings/test-webhook": {
        post: { summary: "Send test webhook" },
      },
      "/api/webhooks/retry": {
        post: { summary: "Retry failed webhook deliveries" },
      },
      "/api/scan/github": {
        post: { summary: "Run GitHub scan" },
      },
    },
  });
}
