import markdoc from '@astrojs/markdoc';
import netlify from '@astrojs/netlify';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import keystatic from '@keystatic/astro';
import tailwindcss from '@tailwindcss/vite';
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
	integrations: [keystatic(), markdoc(), react(), sitemap()],
	output: 'static',
	server: {
		host: true,
	},
	site: 'https://www.lukebennett.dev',
	trailingSlash: 'never',
	vite: {
		plugins: [tailwindcss()],
	},
});
