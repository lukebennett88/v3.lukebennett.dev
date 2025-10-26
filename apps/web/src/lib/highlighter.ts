import { bundledLanguages, createHighlighter, type Highlighter } from 'shiki';

export const highlighter: Highlighter = await createHighlighter({
	themes: ['poimandres'],
	langs: Object.keys(bundledLanguages),
});
