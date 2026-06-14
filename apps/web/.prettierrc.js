/** @type {import("prettier").Config} */
export default {
	// Overrides
	overrides: [
		{
			files: '*.astro',
			options: {
				parser: 'astro',
			},
		},
	],
	// Plugins
	plugins: ['prettier-plugin-astro', 'prettier-plugin-tailwindcss'],
	// Options
	printWidth: 80,
	singleQuote: true,
	useTabs: true,
};
