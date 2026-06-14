import { config as createConfig } from '@keystatic/core';
import { links } from './src/lib/keystatic/schema/collections/links';
import { posts } from './src/lib/keystatic/schema/collections/posts';
import { blogroll } from './src/lib/keystatic/schema/singletons/blogroll';
import { homepage } from './src/lib/keystatic/schema/singletons/homepage';

export const config = createConfig({
	cloud: {
		project: 'luke-bennett/lukebennett-com-au',
	},
	collections: {
		links,
		posts,
	},
	singletons: {
		blogroll,
		homepage,
	},
	storage:
		process.env.NODE_ENV === 'production'
			? {
					kind: 'cloud',
					pathPrefix: 'apps/web',
				}
			: {
					kind: 'local',
				},
});

export default config;
