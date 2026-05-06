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
			enabled: true,
			contentCache: true,
		},
		rustCompiler: true,
	},
	fonts: [
		{
			name: 'Source Sans 3',
			cssVariable: '--font-sans',
			provider: fontProviders.fontsource(),
			weights: ['200 900'],
			styles: ['normal'],
			fallbacks: [
				'ui-sans-serif',
				'system-ui',
				'sans-serif',
				'Apple Color Emoji',
				'Segoe UI Emoji',
				'Segoe UI Symbol',
				'Noto Color Emoji',
			],
		},
		{
			name: 'Source Serif 4',
			cssVariable: '--font-serif',
			provider: fontProviders.fontsource(),
			weights: ['200 900'],
			styles: ['normal'],
			fallbacks: [
				'ui-serif',
				'Georgia',
				'Cambria',
				'Times New Roman',
				'Times',
				'serif',
			],
		},
		{
			name: 'Source Code Pro',
			cssVariable: '--font-mono',
			provider: fontProviders.fontsource(),
			weights: ['200 900'],
			styles: ['normal'],
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
		plugins: [tailwindcss()],
		optimizeDeps: {
			exclude: ['virtual:keystatic-config'],
		},
		ssr: {
			noExternal: ['@keystatic/astro', '@keystatic/core'],
		},
	},
});
