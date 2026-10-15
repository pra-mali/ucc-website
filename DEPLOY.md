# Deploying udaipurcycling.club (Hostinger WordPress → GitHub + Render)

## 1. GitHub

```bash
gh auth login
gh repo create pra-mali/ucc-website --public --source=. --remote=origin --push
```

## 2. Render static site

Either let the blueprint do it (Render dashboard → New → Blueprint → pick `pra-mali/ucc-website`), or create it by hand:

| Setting | Value |
| --- | --- |
| Workspace | UCC |
| Type | Static Site |
| Repo / branch | `pra-mali/ucc-website` / `main` |
| Build command | `npm ci && npm run build` |
| Publish directory | `dist` |
| Plan | Free |
| Auto-deploy | On |

The site exists: https://dashboard.render.com/static/srv-db8beq3ncjis73fai6f0 (workspace UCC). First build takes 1–2 minutes. Check the site at `https://ucc-website-9cbc.onrender.com` before touching DNS.

## 3. Custom domain (Render dashboard → ucc-website → Settings → Custom Domains)

Add both `udaipurcycling.club` and `www.udaipurcycling.club`. Render issues the TLS certificate automatically once DNS resolves.

## 4. DNS at Hostinger (hPanel → Domains → udaipurcycling.club → DNS / Name Servers)

Change only these records:

| Type | Name | Value | Note |
| --- | --- | --- | --- |
| A | `@` | `216.24.57.1` | Render apex IP (confirm in the Custom Domains screen) |
| CNAME | `www` | `ucc-website-9cbc.onrender.com` | |

Leave everything else alone, in particular:

- `app` CNAME → stays pointed at the UCC app (GitHub Pages).
- **MX, SPF (TXT) and DKIM records** → these carry `hello@udaipurcycling.club` email. Do not delete them.

Delete any old `A` record for `@` or `www` that points at the Hostinger server IP.

DNS propagates in minutes to a few hours. Check with:

```bash
nslookup udaipurcycling.club
```

## 5. After cutover

1. Visit https://udaipurcycling.club and a few old post URLs (for example `/ucc-2025-the-complete-story/`) to confirm they still resolve.
2. Submit the sitemap in Google Search Console: `https://udaipurcycling.club/sitemap-index.xml`.
3. Keep the Hostinger WordPress hosting for at least a week as a fallback, then cancel the hosting plan (keep the domain registration and email).
4. Before cancelling, download `wp-content/uploads` from Hostinger as an archive for safekeeping. The 280 images used on the site are already in this repo; the other ~250 media-library files are not.

## Rollback

Point the `@` A record and `www` CNAME back at Hostinger. WordPress is untouched until the hosting plan is cancelled.
