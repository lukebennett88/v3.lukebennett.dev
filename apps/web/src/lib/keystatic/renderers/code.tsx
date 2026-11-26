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
			// Keep token text at 4.5:1 or higher against the theme background.
			colorReplacements: {
				'#767c9db0': '#858aa5',
				'#767c9d': '#898eac',
				'#42675a': '#699384',
				'#506477': '#8196aa',
				'#50647750': '#7b90a4',
			},
		});
	} catch (err) {
		throw new Error(
			`Failed to highlight code block with language "${language}"`,
			{ cause: err },
		);
	}

	return <div dangerouslySetInnerHTML={{ __html: codeBlock }} />;
}
