# Votrio CLI

## Scan publish to Supabase

To write scan summaries to the `scan_history` table, set these environment variables:

```bash
export SUPABASE_URL="https://<your-project>.supabase.co"
export SUPABASE_ANON_KEY="<anon-key>"
export SUPABASE_ACCESS_TOKEN="<user-access-token>"
```

Then run:

```bash
votrio scan --publish
```

Notes:
- `SUPABASE_ACCESS_TOKEN` must be a **user session JWT** so RLS can write to `scan_history`.
- The CLI uses the current folder name as the repo value.
