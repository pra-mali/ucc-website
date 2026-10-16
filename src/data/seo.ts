/**
 * Structured data (schema.org JSON-LD) shared across pages. Search engines
 * and AI answer engines read this to understand who the club is, what each
 * page is about and how pages relate.
 */
import { site } from './site';

export const ORG_ID = `${site.url}/#organization`;
export const WEBSITE_ID = `${site.url}/#website`;

const sameAs = Object.values(site.social);

/** The club itself. Emitted on every page so articles can reference it by @id. */
export function organization() {
  return {
    '@type': ['SportsOrganization', 'SportsClub'],
    '@id': ORG_ID,
    name: site.name,
    alternateName: ['UCC', 'Udaipur Cycling Club (UCC)'],
    url: `${site.url}/`,
    logo: { '@type': 'ImageObject', url: `${site.url}/logo.png` },
    image: `${site.url}/uploads/SachPass_UdaipurCyclingClub-36.jpg`,
    description: site.description,
    sport: 'Cycling',
    foundingDate: '2017-05',
    email: site.email,
    telephone: site.phone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'National Highway 32, near A, Bhopalpura',
      addressLocality: 'Udaipur',
      addressRegion: 'Rajasthan',
      postalCode: '313001',
      addressCountry: 'IN',
    },
    areaServed: { '@type': 'City', name: 'Udaipur' },
    sameAs: [...sameAs, site.appUrl],
    knowsAbout: ['Road cycling', 'Mountain biking', 'Brevets (BRM)', 'Randonneuring', 'Cycling expeditions', 'Group rides in Udaipur'],
  };
}

export function website() {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: `${site.url}/`,
    name: site.name,
    alternateName: 'UCC',
    description: site.description,
    inLanguage: 'en-IN',
    publisher: { '@id': ORG_ID },
  };
}

export function breadcrumbs(items: { name: string; path: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: new URL(it.path, site.url).toString(),
    })),
  };
}

/** True when text is mostly Devanagari (used to mark Hindi stories). */
export const isHindi = (text: string) => /[ऀ-ॿ]/.test(text) && (text.match(/[ऀ-ॿ]/g) || []).length > text.length / 3;

export function article(opts: {
  path: string; title: string; description: string; image?: string | null; date: Date; updated?: Date;
  author: string; categories: string[]; tags: string[]; lang: string; wordCount?: number;
}) {
  const url = new URL(opts.path, site.url).toString();
  const author = !opts.author || /team ucc/i.test(opts.author)
    ? { '@id': ORG_ID }
    : { '@type': 'Person', name: opts.author };
  return {
    '@type': 'BlogPosting',
    '@id': `${url}#article`,
    mainEntityOfPage: url,
    url,
    headline: opts.title.slice(0, 110),
    description: opts.description,
    image: opts.image ? [new URL(opts.image, site.url).toString()] : undefined,
    datePublished: opts.date.toISOString(),
    dateModified: (opts.updated || opts.date).toISOString(),
    author,
    publisher: { '@id': ORG_ID },
    isPartOf: { '@id': WEBSITE_ID },
    articleSection: opts.categories.length ? opts.categories : undefined,
    keywords: opts.tags.length ? opts.tags.join(', ') : undefined,
    inLanguage: opts.lang,
    wordCount: opts.wordCount,
    about: { '@id': ORG_ID },
  };
}

/** Wrap nodes in a single @graph document. */
export const graph = (nodes: unknown[]) => ({ '@context': 'https://schema.org', '@graph': nodes.filter(Boolean) });
