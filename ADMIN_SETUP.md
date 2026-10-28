# Admin content studio setup

The admin editor is available at `/admin`. It stores event details in Cloudflare D1 and uploaded photos in Cloudflare R2. The existing portfolio is copied into D1 the first time the admin list or public event API is opened.

## Create the Cloudflare resources

From the project directory, create the D1 database and R2 bucket:

```powershell
npx wrangler d1 create shega-events-content
npx wrangler r2 bucket create shega-events-media
```

Copy the D1 `database_id` returned by Wrangler. Add these entries at the top level of `wrangler.jsonc` (alongside `assets`):

```jsonc
"d1_databases": [
  {
    "binding": "CONTENT_DB",
    "database_name": "shega-events-content",
    "database_id": "PASTE_THE_DATABASE_ID_HERE",
    "migrations_dir": "migrations"
  }
],
"r2_buckets": [
  { "binding": "MEDIA", "bucket_name": "shega-events-media" }
],
```

Apply the schema and set the three secrets without adding them to source control:

```powershell
npx wrangler d1 migrations apply shega-events-content --remote
npx wrangler secret put ADMIN_USERNAME
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put SESSION_SECRET
```

Use a unique admin username and password, and a separate random session secret of at least 32 characters. Wrangler prompts for each secret. Keep production values in Cloudflare secrets; do not commit them.

For local development, add the same binding entries to the local Wrangler config and place `NEXTJS_ENV=development`, `ADMIN_USERNAME=...`, `ADMIN_PASSWORD=...`, and `SESSION_SECRET=...` in the ignored `.dev.vars` file. Local D1 migrations can be applied with `npx wrangler d1 migrations apply shega-events-content --local`.

After configuring the bindings and secrets, rebuild and deploy the Worker. The panel supports current, upcoming, and past event status; publishing and drafts; event descriptions and links; cover image and multi-image galleries; and deleting events. Uploaded image types are JPG, PNG, WebP, and GIF, up to 12 MB each.

## Website launch settings

Set `NEXT_PUBLIC_SITE_URL` to the canonical public HTTPS domain in the deployment environment before building. The metadata, canonical links, structured data, and sitemap use this value. For local development, set it in `.dev.vars` to the local public URL you use.

Before publishing the legal pages, confirm Shega Events' registered legal name and any company or privacy contact details that should appear publicly. The website currently uses `info@shega.events` as its public inquiry and privacy contact. Confirm that mailbox is monitored. Keep the service descriptions, event dates, partner marks, audience figures, and photography permissions accurate as content is added.
