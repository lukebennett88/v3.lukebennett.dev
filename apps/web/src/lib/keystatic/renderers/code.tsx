import type { Highlighter } from 'shiki';

export function Code({
	children,
	highlighter,
	language = 'javascript',
}: {
	children: string;
	highlighter: Highlighter;
	language?: string;
}) {
	let codeBlock = children;
	try {
		codeBlock = highlighter.codeToHtml(children, {
			lang: language,
			theme: 'poimandres',
		});
	} catch (err) {
		throw new Error(
			`Failed to highlight code block with language "${language}"`,
			{ cause: err },
		);
	}

	return <div dangerouslySetInnerHTML={{ __html: codeBlock }} />;
}
