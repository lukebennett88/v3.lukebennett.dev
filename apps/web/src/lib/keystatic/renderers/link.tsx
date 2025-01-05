import { cn } from '../../cn';

type LinkProps = React.ComponentPropsWithoutRef<'a'>;

export function Link({ className, children, ...consumerProps }: LinkProps) {
	return (
		<a
			{...consumerProps}
			className={cn(
				'-mx-0.5 rounded-md px-0.5 decoration-teal-700 underline-offset-2 transition-colors hover:bg-teal-700/50',
				className,
			)}
		>
			{children}
		</a>
	);
}
