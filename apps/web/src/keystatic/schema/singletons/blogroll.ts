import { fields, singleton } from '@keystatic/core';

import { content } from '~/keystatic/schema/fields/content';

export const blogroll = singleton({
	label: 'Blogroll',
	entryLayout: 'form',
	format: {
		contentField: 'content',
	},
	path: 'content/blogroll',
	schema: {
		content,
		blogs: fields.array(
			fields.object({
				label: fields.text({
					label: 'Blog',
					validation: {
						isRequired: true,
					},
				}),
				href: fields.url({
					label: 'URL',
					validation: {
						isRequired: true,
					},
				}),
				rss: fields.url({
					label: 'RSS Feed',
				}),
				links: fields.array(
					fields.object({
						label: fields.text({
							label: 'Label',
							validation: {
								isRequired: true,
							},
						}),
						href: fields.url({
							label: 'URL',
							validation: {
								isRequired: true,
							},
						}),
					}),
					{
						label: 'Links',
						itemLabel: (props) => props.fields.label.value,
					},
				),
			}),
			{
				label: 'Blogs',
				itemLabel: (props) => props.fields.label.value,
			},
		),
	},
});
