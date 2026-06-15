import { component, fields } from '@keystatic/core';

import { CloudImage } from '../renderers/cloud-image';

export const cloudImage = component({
	label: 'Cloud Image',
	preview({ fields }) {
		const src = fields.src.value;

		// `CloudImage` calls `new URL(src)` and throws on any not-yet-valid URL
		// (empty, whitespace-only, or missing protocol), so guard while the
		// author is still typing.
		if (!URL.canParse(src)) {
			return (
				<figure style={{ margin: 0 }}>
					<span style={{ color: '#6b7280', fontSize: 12 }}>
						No image URL yet
					</span>
				</figure>
			);
		}

		return (
			<CloudImage
				alt={fields.alt.value}
				height={fields.height.value}
				priority={fields.priority.value}
				src={src}
				width={fields.width.value}
			/>
		);
	},
	schema: {
		alt: fields.text({
			label: 'Alt text',
		}),
		height: fields.integer({
			label: 'Height',
		}),
		priority: fields.checkbox({
			defaultValue: false,
			description: 'Prioritize this image for loading.',
			label: 'Priority',
		}),
		src: fields.text({
			label: 'URL',
			validation: { length: { min: 1 } },
		}),
		width: fields.integer({
			label: 'Width',
		}),
	},
});
