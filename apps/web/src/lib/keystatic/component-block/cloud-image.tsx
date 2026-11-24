import { component, fields } from '@keystatic/core';
import { CloudImage } from '../renderers/cloud-image';

export const cloudImage = component({
	label: 'Cloud Image',
	preview(props) {
		const src = props.fields.src.value;

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
				alt={props.fields.alt.value}
				height={props.fields.height.value}
				priority={props.fields.priority.value}
				src={src}
				width={props.fields.width.value}
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
