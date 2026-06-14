import { bundledLanguages, createHighlighter, type Highlighter } from 'shiki';

export const highlighter: Highlighter = await createHighlighter({
	langs: Object.keys(bundledLanguages),
	themes: ['poimandres'],
});
