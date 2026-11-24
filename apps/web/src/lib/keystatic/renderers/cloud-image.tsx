import { Image, type ImageProps } from '@unpic/react';
import { cn } from '../../cn';

const MAX_WIDTH = 700;

/**
 * The props for the CloudImage component.
 */
type CloudImageProps = Omit<
	ImageProps,
	'height' | 'layout' | 'width' | 'priority'
> & {
	/**
	 * The caption for the image.
	 */
	caption?: string;

	/**
	 * How the image should be resized to fit its container.
	 * - 'scale-down': Scale down to fit.
	 * - 'contain': Scale to fit, preserving aspect ratio.
	 * - 'cover': Scale to fill, preserving aspect ratio.
	 * - 'crop': Scale to fill, cropping edges if necessary.
	 * @default 'scale-down'
	 */
	fit?: 'scale-down' | 'contain' | 'cover' | 'crop';

	/**
	 * The height of the image.
	 */
	height?: number | null;

	/**
	 * Whether the image should be prioritized for loading (LCP image).
	 * @default false
	 */
	priority?: boolean;

	/**
	 * The width of the image.
	 */
	width?: number | null;
};

export function CloudImage(props: CloudImageProps) {
	const {
		alt = '',
		aspectRatio: originalAspectRatio,
		breakpoints = defaultBreakpoints,
		caption,
		className,
		fallback = 'imgix',
		fit = 'scale-down',
		height: originalHeight,
		loading,
		priority = false,
		src,
		width: originalWidth,
		...consumerProps
	} = props;

	const srcUrl = parseURL(src);
	srcUrl.searchParams.set('fit', fit);

	const image = (
		<Image
			alt={alt}
			background="auto"
			breakpoints={breakpoints}
			className={cn(
				'rounded-lg bg-white object-cover dark:bg-gray-800',
				className,
			)}
			fallback={fallback}
			layout="constrained"
			loading={priority ? 'eager' : loading}
			priority={priority}
			src={srcUrl.toString()}
			{...getImageDimensions({
				aspectRatio: originalAspectRatio,
				height: originalHeight,
				width: originalWidth,
			})}
			{...consumerProps}
		/>
	);

	if (!caption) return image;

	return (
		<figure>
			{image}
			<figcaption>{caption}</figcaption>
		</figure>
	);
}

function getImageDimensions(
	params: Pick<CloudImageProps, 'aspectRatio' | 'height' | 'width'>,
) {
	// Unpic treats zero dimensions as omitted while the preview is incomplete.
	const width = Math.min(params.width ?? 0, MAX_WIDTH);
	if (params.width == null || params.height == null) {
		return { width, height: params.height ?? 0 };
	}

	const height =
		params.width > MAX_WIDTH
			? Math.round((params.height / params.width) * MAX_WIDTH)
			: params.height;
	const aspectRatio = params.width / params.height;

	// Keep the source ratio when Unpic can infer the same rounded height.
	if (
		!params.aspectRatio &&
		aspectRatio &&
		(!height || Math.round(width / aspectRatio) === height)
	) {
		return { width, aspectRatio };
	}

	return { width, height };
}

const defaultBreakpoints = [
	300, 400, 450, 500, 600, 700, 750, 800, 900, 1000, 1050, 1200, 1400,
];

function parseURL(src: string): URL {
	try {
		return new URL(src);
	} catch {
		throw new Error(`Invalid image source: ${src}`);
	}
}
