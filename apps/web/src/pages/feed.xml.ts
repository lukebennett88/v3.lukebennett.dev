import rss, { type RSSFeedItem } from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import invariant from 'tiny-invariant';
import { DocumentRenderer } from '../lib/keystatic/document-renderer';
import { getSortedEntries } from '../lib/posts';

const MAX_POSTS = 100;

export const GET: APIRoute = async ({ site }) => {
	invariant(site, '`site` must be defined in astro.config.ts');
	const baseUrl = site.toString();
	const sortedEntries = (await getSortedEntries()).slice(0, MAX_POSTS);

	return rss({
		// `<title>` field in output xml
		title: 'Luke Bennett',

		// `<description>` field in output xml
		description: 'Luke Bennett’s personal website',

		// Pull in your project "site" from the endpoint context
		// https://docs.astro.build/en/reference/api-reference/#contextsite
		site: baseUrl,

		// Array of `<item>`s in output xml
		// See "Generating items" section for examples using content collections and glob imports
		items: await Promise.all(
			sortedEntries.map(async ({ entry, pathname }) => {
				const url = `${baseUrl}${pathname}`;
				return {
					author: 'Luke Bennett',
					content: renderToStaticMarkup(
						createElement(DocumentRenderer, {
							document: await entry.content(),
						}),
					),
					description: '',
					link: url,
					pubDate: new Date(entry.publishedAt),
					title: entry.title,
				} satisfies RSSFeedItem;
			}),
		),

		// (optional) inject custom xml
		customData: '<language>en-AU</language>',
	});
};
