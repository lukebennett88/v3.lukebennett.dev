import markdoc from '@astrojs/markdoc';
import netlify from '@astrojs/netlify';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';
import keystatic from '@keystatic/astro';
import { defineConfig } from 'astro/config';

/** @see https://astro.build/config */
export default defineConfig({
	adapter: netlify({
		edgeMiddleware: true,
		imageCDN: true,
	}),
	build: {
		format: 'file',
	},
	integrations: [keystatic(), markdoc(), react(), sitemap(), tailwind()],
	output: 'static',
	server: {
		host: true,
	},
	site: 'https://www.lukebennett.dev',
	trailingSlash: 'never',
});
