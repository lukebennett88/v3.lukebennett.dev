import { Image, type ImageProps } from '@unpic/react';
import invariant from 'tiny-invariant';
import { cn } from '../../cn';

const MAX_WIDTH = 700;

/**
 * The props for the CloudImage component.
 */
type CloudImageProps = Omit<ImageProps, 'height' | 'layout' | 'width'> & {
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

	let finalWidth: number | undefined;
	let finalHeight: number | undefined;
	let finalAspectRatio: number | undefined;

	const widthType = typeof originalWidth === 'number' ? 'number' : 'null';
	const heightType = typeof originalHeight === 'number' ? 'number' : 'null';

	switch (`${widthType}-${heightType}` as const) {
		case 'null-null': {
			// No width or height provided
			break;
		}

		case 'null-number': {
			// Only height is provided
			finalHeight = originalHeight ?? undefined;
			break;
		}

		case 'number-null': {
			// Only width is provided
			invariant(typeof originalWidth === 'number');
			finalWidth = Math.min(originalWidth, MAX_WIDTH);
			break;
		}

		case 'number-number': {
			// Both width and height are provided
			invariant(typeof originalWidth === 'number');
			invariant(typeof originalHeight === 'number');
			if (originalWidth > MAX_WIDTH) {
				finalWidth = MAX_WIDTH;
				finalHeight = Math.round((originalHeight / originalWidth) * MAX_WIDTH);
			} else {
				finalWidth = originalWidth;
				finalHeight = originalHeight;
			}
			if (!originalAspectRatio) {
				finalAspectRatio = originalWidth / originalHeight;
			}
			break;
		}

		default: {
			throw new Error(
				`Invalid height/width combination: ${originalHeight} x ${originalWidth}`,
			);
		}
	}

	const img = (
		<Image
			alt={alt}
			aspectRatio={
				// Can't set aspect radio when height and width are provided
				finalAspectRatio as undefined
			}
			background="auto"
			breakpoints={breakpoints}
			className={cn(
				'rounded-lg bg-white object-cover dark:bg-gray-800',
				className,
			)}
			fallback={fallback}
			height={
				// Unpic will correctly handle undefined values, but they types error so
				// we need to do a type assertion here
				finalHeight as number
			}
			layout="constrained"
			loading={loading}
			priority={priority}
			src={srcUrl.toString()}
			width={
				// Unpic will correctly handle undefined values, but they types error so
				// we need to do a type assertion here
				finalWidth as number
			}
			{...consumerProps}
		/>
	);

	if (caption) {
		return (
			<figure>
				{img}
				<figcaption>{caption}</figcaption>
			</figure>
		);
	}

	return img;
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
