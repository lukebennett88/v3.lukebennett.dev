/** @jsxRuntime classic */
import { component, fields } from '@keystatic/core';
// biome-ignore lint/correctness/noUnusedImports: React is used by the classic JSX runtime.
import * as React from 'react';

export const cloudImage = component({
	label: 'Cloud Image',
	preview({ fields }) {
		const src = fields.src.value;

		return (
			<figure style={{ margin: 0 }}>
				<img
					alt={fields.alt.value}
					src={src}
					style={{
						display: 'block',
						maxHeight: 368,
						maxWidth: '100%',
						objectFit: 'contain',
					}}
				/>
				{fields.priority.value ? (
					<figcaption style={{ fontSize: 12, marginTop: 8 }}>
						Priority image
					</figcaption>
				) : null}
			</figure>
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
