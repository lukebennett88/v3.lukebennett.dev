import { collection, fields } from '@keystatic/core';

import { content } from '../fields/content';

export const posts = collection({
	entryLayout: 'content',
	format: {
		contentField: 'content',
	},
	label: 'Posts',
	path: 'content/posts/*',
	schema: {
		content,
		isDraft: fields.checkbox({
			defaultValue: false,
			description: 'Check this box to prevent this post from being published',
			label: 'Do not publish',
		}),
		publishedAt: fields.date({
			label: 'Published at',
			validation: {
				isRequired: true,
			},
		}),
		title: fields.slug({
			name: {
				label: 'Title',
			},
		}),
	},
	slugField: 'title',
});
