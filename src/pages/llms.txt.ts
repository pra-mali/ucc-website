/**
 * /llms.txt — a plain-text guide to the site for AI assistants and answer
 * engines (format: https://llmstxt.org). Built from the content collections
 * so it stays in sync with new stories.
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { site } from '../data/site';

const clip = (s: string, n = 220) => {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n).replace(/\s+\S*$/, '') + '…' : t;
};

export const GET: APIRoute = async () => {
  const stories = (await getCollection('stories', ({ data }) => !data.draft))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
  const pages = await getCollection('pages');
  const u = (p: string) => new URL(p, site.url).toString();

  const body = `# ${site.name}

> ${site.name} (UCC) is a cycling club in Udaipur, Rajasthan, India, founded in May ${site.founded}. Members ride together every morning around Udaipur, ride brevets (BRM long-distance events), and run signature expeditions across Rajasthan and to the Himalaya. The club promotes cycling for commuting, leisure, fitness and sport, and organises regular rides, events and workshops.

Key facts:
- Location: Udaipur, Rajasthan, India (address: ${site.address.slice(1).join(', ')})
- Founded: May ${site.founded}
- Activities: daily group rides, brevets (BRM), signature cycling expeditions, cyclothons, challenges, workshops
- Signature expeditions: Cyclorun, Jodhpur Night Ride, Ride to the Statue of Unity, Ride to Jaisalmer, Sita Mata Sanctuary, TAAVDO, Tour de Diu, Udaipur Duathlon
- How to join: register at ${u('/registration/')}; ride announcements are shared on WhatsApp and events run in the UCC app (${site.appUrl})
- Contact: ${site.email}, WhatsApp ${site.phone}
- Social: Instagram ${site.social.instagram}, Facebook ${site.social.facebook}, YouTube ${site.social.youtube}, X ${site.social.twitter}

## Main pages

- [Home](${u('/')}): overview of the club, ride types, featured rider stories and expeditions
- [About](${u('/about/')}): who the club is and its vision for cycling in Udaipur
- [Rider stories](${u('/blogs/')}): ride reports, member milestones, expeditions and newsletters
- [Signature expeditions](${u('/signature-cycling-expedition/')}): the club's flagship rides
- [Events](${u('/events/')}): how rides and events are scheduled and registered (live calendar in the UCC app)
- [Challenges](${u('/ucc-challenges/')}): monthly and annual riding challenges
- [Photos](${u('/photos/')}): photo gallery from club rides
- [Member registration](${u('/registration/')}): how to become a member
- [Contact](${u('/contact/')}): email, WhatsApp and address

## Club rules

${pages.filter((p) => /conduct|rules/.test(p.data.slug || p.id)).map((p) => `- [${p.data.title}](${u(`/${p.data.slug || p.id}/`)})`).join('\n')}

## Rider stories

${stories.map((s) => `- [${s.data.title}](${u(`/${s.data.slug || s.id}/`)}) (${s.data.date.toISOString().slice(0, 10)}): ${clip(s.data.excerpt || '')}`).join('\n')}

## Optional

- [RSS feed of stories](${u('/rss.xml')})
- [Sitemap](${u('/sitemap-index.xml')})
- [Privacy policy](${u('/privacy-policy/')})
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
