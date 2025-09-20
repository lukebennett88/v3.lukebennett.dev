import { cn } from '../../cn';

type InlineCodeProps = React.HTMLAttributes<HTMLElement>;

export function InlineCode({
	children,
	className,
	...consumerProps
}: InlineCodeProps) {
	return (
		<code
			{...consumerProps}
			className={cn(
				'rounded-md border px-1 py-0.5 font-medium font-mono',
				'border-gray-300 bg-gray-200 text-gray-900',
				'dark:border-gray-600 dark:bg-gray-700 dark:text-gray-50',
				className,
			)}
		>
			{children}
		</code>
	);
}
