# Udaipur Cycling Club — website

Public site for [udaipurcycling.club](https://udaipurcycling.club), built with [Astro](https://astro.build) and deployed as a static site on Render.

Related repos: [uccapp](https://github.com/pra-mali/uccapp) (member app at app.udaipurcycling.club) and [uccapp-backend](https://github.com/pra-mali/uccapp-backend).

## Develop

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # outputs to dist/
npm run preview    # serve the built site locally
```

## Content

| What | Where | URL |
| --- | --- | --- |
| Stories (blog posts) | `src/content/stories/*.json` or `*.md` | `/<slug>/`, listed at `/blogs/` |
| Static pages (About, Code of Conduct, Rules, Challenges, Privacy) | `src/content/pages/*.json` or `*.md` | `/<slug>/` |
| Home, Events, Contact, Registration, Expeditions, Photos | `src/pages/*.astro` | fixed |
| Club details, nav, social links | `src/data/site.ts` | — |
| Expedition tiles / photo gallery | `src/data/expeditions.json`, `src/data/photos.json` | — |
| Images | `public/uploads/` | `/uploads/<file>` |

### Writing a new story in the admin (recommended)

Open the UCC app admin at [app.udaipurcycling.club/stories.html](https://app.udaipurcycling.club/stories.html) (sign in with the admin email, password and the 6-digit authenticator code). "New story" gives you a Markdown editor with live preview, cover and inline image upload, categories and a draft toggle. Publishing commits the story to this repo through the backend's `/cms` API (see `uccapp-backend/cms.js`), and Render rebuilds the site in about a minute. Stories imported from WordPress (`.json`) are listed read-only there; edit those files on GitHub. `udaipurcycling.club/admin/` redirects there.

### Writing a new story by hand

Create `src/content/stories/my-ride.md`:

```md
---
title: "Udaipur to Kumbhalgarh in a day"
date: 2026-11-02
excerpt: "Eighty riders, one fort, and a lot of climbing."
cover: /uploads/kumbhalgarh-2026.jpg
categories: [Cycling Expedition]
author: Team UCC
---

Write the story in Markdown. Put images in `public/uploads/` and reference them as `/uploads/<file>`.
```

The file name becomes the URL: `/my-ride/`. Push to `main` and Render rebuilds the site in about a minute.

### Re-importing from WordPress

The original posts and pages were pulled from the WordPress REST API with:

```bash
npm run import:wp
```

It is safe to re-run; already-downloaded images are skipped.

## Deploy

`render.yaml` defines the Render Static Site (free plan, auto-deploy on push to `main`). Custom domain and DNS are configured in the Render dashboard; see the deployment notes in the project root.
