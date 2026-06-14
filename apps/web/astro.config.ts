import markdoc from '@astrojs/markdoc';
import netlify from '@astrojs/netlify';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import keystatic from '@keystatic/astro';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, fontProviders } from 'astro/config';

/** @see https://astro.build/config */
export default defineConfig({
	adapter: netlify({
		edgeMiddleware: true,
		imageCDN: true,
	}),
	build: {
		format: 'file',
	},
	experimental: {
		queuedRendering: {
			contentCache: true,
			enabled: true,
		},
		rustCompiler: true,
	},
	fonts: [
		{
			cssVariable: '--font-sans',
			fallbacks: [
				'ui-sans-serif',
				'system-ui',
				'sans-serif',
				'Apple Color Emoji',
				'Segoe UI Emoji',
				'Segoe UI Symbol',
				'Noto Color Emoji',
			],
			name: 'Source Sans 3',
			provider: fontProviders.fontsource(),
			styles: ['normal'],
			weights: ['200 900'],
		},
		{
			cssVariable: '--font-serif',
			fallbacks: [
				'ui-serif',
				'Georgia',
				'Cambria',
				'Times New Roman',
				'Times',
				'serif',
			],
			name: 'Source Serif 4',
			provider: fontProviders.fontsource(),
			styles: ['normal'],
			weights: ['200 900'],
		},
		{
			cssVariable: '--font-mono',
			fallbacks: [
				'ui-monospace',
				'SFMono-Regular',
				'SF Mono',
				'Menlo',
				'Monaco',
				'Consolas',
				'Liberation Mono',
				'Courier New',
				'monospace',
			],
			name: 'Source Code Pro',
			provider: fontProviders.fontsource(),
			styles: ['normal'],
			weights: ['200 900'],
		},
	],
	integrations: [keystatic(), markdoc(), react(), sitemap()],
	output: 'static',
	server: {
		host: true,
	},
	site: 'https://www.lukebennett.dev',
	trailingSlash: 'never',
	vite: {
		optimizeDeps: {
			exclude: ['virtual:keystatic-config'],
		},
		plugins: [tailwindcss()],
		ssr: {
			noExternal: ['@keystatic/astro', '@keystatic/core'],
		},
	},
});
