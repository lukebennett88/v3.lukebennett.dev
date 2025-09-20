import typographyPlugin from '@tailwindcss/typography';
import type { Config } from 'tailwindcss';
import colors from 'tailwindcss/colors';
import defaultTheme from 'tailwindcss/defaultTheme';
import plugin from 'tailwindcss/plugin';

export const fontStackSansArray = [
	'"Source Sans 3 Variable"',
	...defaultTheme.fontFamily.sans,
];
export const fontStackSerifArray = [
	'"Source Serif 4 Variable"',
	...defaultTheme.fontFamily.serif,
];
export const fontStackMonoArray = [
	'"Source Code Pro Variable"',
	...defaultTheme.fontFamily.mono,
];

const baseStylesPlugin = plugin(({ addBase, theme }) => {
	return addBase({
		'.dark': {
			colorScheme: 'dark',
		},
		'.light': {
			colorScheme: 'light',
		},
		'[id]': {
			scrollMarginTop: theme('spacing[4]'),
		},
	});
});

export default {
	darkMode: 'class',
	content: ['./src/**/*.{astro,mdoc,ts,tsx}'],
	theme: {
		extend: {
			animation: {
				steamRise: [
					'steamFade 3s ease-in-out infinite',
					'steamTransform 3s cubic-bezier(0.4, 0, 0.2, 1) infinite',
				].join(', '),
			},
			keyframes: {
				steamFade: {
					'0%, 100%': { opacity: '0' },
					'50%': { opacity: '1' },
				},
				steamTransform: {
					'0%': { transform: 'translate3d(0, 0.5rem, 0) scale(0.9)' },
					'100%': { transform: 'translate3d(-0.125rem, 0, 0) scale(1.1)' },
				},
			},
			colors: {
				gray: colors.zinc,
			},
			fontFamily: {
				sans: fontStackSansArray,
				serif: fontStackSerifArray,
				mono: fontStackMonoArray,
			},
			typography: () => ({
				DEFAULT: {
					css: {
						fontFamily: fontStackSerifArray.join(', '),
						h1: {
							fontFamily: fontStackSansArray.join(', '),
							textWrap: 'balance',
						},
						h2: {
							fontFamily: fontStackSansArray.join(', '),
							textWrap: 'balance',
						},
						'code::before': {
							content: 'none',
						},
						'code::after': {
							content: 'none',
						},
					},
				},
			}),
		},
	},
	plugins: [typographyPlugin, baseStylesPlugin],
} satisfies Config;
