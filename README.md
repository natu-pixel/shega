# Shega Events

Shega Events produces concerts, festivals, brand activations, and live experiences in Addis Ababa, Ethiopia. This repository contains the company website and its content management tools.

## Website

- Event portfolio with photo galleries and artist features
- Editorial blog with photo uploads and YouTube embeds
- Admin studio for publishing and managing event and blog content
- Contact, privacy, cookies, terms, sitemap, and structured data pages

## Platform

The site is built with Next.js and deployed to Cloudflare Workers through the OpenNext Cloudflare adapter. Cloudflare D1 stores published content and Cloudflare R2 stores uploaded media. Static site imagery and the homepage frame sequence are served from the application assets.

## Deployment

Commits pushed to `main` trigger the GitHub Actions deployment workflow in `.github/workflows/deploy.yml`. Configure the `CLOUDFLARE_API_TOKEN` repository secret before enabling deployments. Set `NEXT_PUBLIC_SITE_URL` as a GitHub Actions variable when the canonical public domain is ready.

Cloudflare resource setup, database migrations, and admin secrets are documented in [ADMIN_SETUP.md](./ADMIN_SETUP.md).
