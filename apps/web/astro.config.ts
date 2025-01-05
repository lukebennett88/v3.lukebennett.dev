import markdoc from '@astrojs/markdoc';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel';
import keystatic from '@keystatic/astro';
import { defineConfig } from 'astro/config';

/** @see https://astro.build/config */
export default defineConfig({
	adapter: vercel({
		edgeMiddleware: false,
		webAnalytics: {
			enabled: true,
		},
	}),
	integrations: [keystatic(), markdoc(), react(), sitemap(), tailwind()],
	output: 'static',
	site: 'https://www.lukebennett.com.au',
	server: {
		host: true,
	},
	trailingSlash: 'never',
});
