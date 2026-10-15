import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Stories (blog posts).
 *  - Imported WordPress posts live as JSON with a pre-rendered `html` body.
 *  - New posts can be written as Markdown files in the same folder:
 *      src/content/stories/my-new-ride.md  with the same frontmatter fields.
 */
const stories = defineCollection({
  loader: glob({ pattern: '**/*.{json,md}', base: './src/content/stories' }),
  schema: z.object({
    title: z.string(),
    slug: z.string().optional(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    excerpt: z.string().default(''),
    cover: z.string().nullable().optional(),
    coverAlt: z.string().optional(),
    categories: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    author: z.string().default('Team UCC'),
    draft: z.boolean().default(false),
    wpId: z.number().optional(),
    wpUrl: z.string().optional(),
    html: z.string().optional(),
  }),
});

/** Static pages served at /<slug>/ (About, Code of Conduct, Rules, …). */
const pages = defineCollection({
  loader: glob({ pattern: '**/*.{json,md}', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    slug: z.string().optional(),
    description: z.string().optional(),
    updated: z.coerce.date().optional(),
    wpId: z.number().optional(),
    wpUrl: z.string().optional(),
    html: z.string().optional(),
  }),
});

export const collections = { stories, pages };
