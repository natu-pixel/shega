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

## GitHub push deployments

The repository workflow at `.github/workflows/deploy.yml` builds and deploys the Worker whenever code is pushed to `main`. In GitHub, open **Settings > Secrets and variables > Actions** and add a repository secret named `CLOUDFLARE_API_TOKEN` using a Cloudflare API token with permission to edit Workers on this account. The workflow reads the account ID from the existing deployment configuration. Never commit the token. Add `NEXT_PUBLIC_SITE_URL` as a GitHub Actions variable when the canonical domain is ready; the build uses it for canonical metadata and the sitemap. Publishing a blog post or uploading photos in `/admin/blog` saves directly to D1/R2 and does not require a GitHub push or redeployment.

Blog post text, photo references, and YouTube links are stored in D1 in the `site_posts.data` JSON field. Uploaded image files are stored in the R2 media bucket under `blog/`; event uploads use `events/`. In local development, blog drafts and image previews are kept in this browser's local storage rather than D1/R2. Production photo uploads support JPG, PNG, WebP, and GIF up to 12 MB each. YouTube video and Shorts links are embedded on the published post page.
