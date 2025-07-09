import slugify from '@sindresorhus/slugify';
import { ZeroWidthSpace } from '../../../components/zero-width-space';
import { cn } from '../../cn';

type NativeHeadingProps = React.HTMLAttributes<HTMLHeadingElement>;

type HeadingProps = NativeHeadingProps & {
	isAnchor?: boolean;
	level: 1 | 2 | 3 | 4 | 5 | 6;
	textAlign?: 'center' | 'end';
};

function getAlignmentClass(textAlign: HeadingProps['textAlign']) {
	switch (textAlign) {
		case 'center':
			return 'text-center';
		case 'end':
			return 'text-end';
		default:
			return '';
	}
}

export function Heading({
	children,
	className,
	isAnchor = false,
	level,
	textAlign,
	...consumerProps
}: HeadingProps) {
	const Tag = `h${level}` as const;

	const alignmentClass = getAlignmentClass(textAlign);
	const slug = getSlug(children);

	const headingContent = (
		<Tag
			{...consumerProps}
			className={cn(alignmentClass, '[text-wrap:balance]', className)}
			id={slug}
		>
			{isAnchor ? (
				<span className="inline-flex items-center">
					<ZeroWidthSpace />
					<HashtagIcon className="absolute me-1 h-[0.75em] max-h-[1.25rem] w-[0.75em] max-w-[1.25rem] -translate-x-full text-gray-500" />
				</span>
			) : null}
			{children}
		</Tag>
	);

	return isAnchor ? (
		<a className="relative block no-underline" href={`#${slug}`}>
			{headingContent}
		</a>
	) : (
		headingContent
	);
}

function getSlug(node: React.ReactNode) {
	return slugify(getTextNode(node));
}

function getTextNode(node: React.ReactNode): string {
	if (!node) return '';
	if (typeof node === 'string') return node;
	if (typeof node === 'number') return String(node);

	if (Array.isArray(node)) return node.map(getTextNode).join('');

	if (
		typeof node === 'object' &&
		'text' in node &&
		typeof node.text === 'string'
	) {
		return node.text;
	}

	if (
		typeof node === 'object' &&
		node !== null &&
		'props' in node &&
		typeof node.props === 'object' &&
		node.props !== null &&
		'node' in node.props
	) {
		return getTextNode((node.props as { node: React.ReactNode }).node);
	}

	return '';
}

function HashtagIcon(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg
			aria-hidden="true"
			fill="none"
			focusable="false"
			role="img"
			stroke="currentColor"
			strokeWidth={1.5}
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path
				d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5l-3.9 19.5m-2.1-19.5l-3.9 19.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}
