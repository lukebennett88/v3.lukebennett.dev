import { fields, singleton } from '@keystatic/core';

import { content } from '../fields/content';

export const blogroll = singleton({
	entryLayout: 'form',
	format: {
		contentField: 'content',
	},
	label: 'Blogroll',
	path: 'content/blogroll',
	schema: {
		blogs: fields.array(
			fields.object({
				href: fields.url({
					label: 'URL',
					validation: {
						isRequired: true,
					},
				}),
				label: fields.text({
					label: 'Blog',
					validation: {
						isRequired: true,
					},
				}),
				links: fields.array(
					fields.object({
						href: fields.url({
							label: 'URL',
							validation: {
								isRequired: true,
							},
						}),
						label: fields.text({
							label: 'Label',
							validation: {
								isRequired: true,
							},
						}),
					}),
					{
						itemLabel: (props) => props.fields.label.value,
						label: 'Links',
					},
				),
				rss: fields.url({
					label: 'RSS Feed',
				}),
			}),
			{
				itemLabel: (props) => props.fields.label.value,
				label: 'Blogs',
			},
		),
		content,
	},
});
