import { type Config } from 'tailwindcss';
import { zinc } from 'tailwindcss/colors';
import defaultTheme from 'tailwindcss/defaultTheme';

export default {
	darkMode: 'class',
	content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
	theme: {
		extend: {
			colors: {
				gray: zinc,
			},
			fontFamily: {
				sans: ['var(--font-sans)', ...defaultTheme.fontFamily.sans],
			},
			typography: () => ({
				DEFAULT: {
					css: {
						h1: {
							textWrap: 'balance',
						},
						h2: {
							textWrap: 'balance',
						},
					},
				},
			}),
		},
	},
	plugins: [require('@tailwindcss/typography')],
} satisfies Config;
