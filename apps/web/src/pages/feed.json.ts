import type { APIRoute } from 'astro';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import invariant from 'tiny-invariant';
import { DocumentRenderer } from '../lib/keystatic/document-renderer';
import { getSortedEntries, toIsoString } from '../lib/posts';

const MAX_POSTS = 100;

export const GET: APIRoute = async ({ site }) => {
	invariant(site, '`site` must be defined in astro.config.ts');
	const baseUrl = site.toString();
	const sortedEntries = (await getSortedEntries()).slice(0, MAX_POSTS);
	const body = {
		version: 'https://jsonfeed.org/version/1.1',
		title: 'Luke Bennett',
		home_page_url: baseUrl,
		feed_url: `${baseUrl}/feed.json`,
		icon: `${baseUrl}/apple-icon.png`,
		items: await Promise.all(
			sortedEntries.map(async ({ entry, pathname, type }) => {
				const url = `${baseUrl}${pathname}`;
				return {
					authors: [{ name: 'Luke Bennett' }],
					content_html: renderToStaticMarkup(
						createElement(DocumentRenderer, {
							document: await entry.content(),
						}),
					),
					date_published: toIsoString(entry.publishedAt),
					...(type === 'link' ? { external_url: entry.linkedUrl } : undefined),
					id: url,
					title: entry.title,
					url,
				};
			}),
		),
	};

	return new Response(JSON.stringify(body, null, '\t'), {
		headers: {
			'Content-Type': 'application/feed+json; charset=utf-8',
		},
	});
};
