import { type Highlighter, bundledLanguages, createHighlighter } from 'shiki';

export const highlighter: Highlighter = await createHighlighter({
	themes: ['poimandres'],
	langs: Object.keys(bundledLanguages),
});
