import type { APIRoute } from 'astro';
import { standardSitePublicationUri } from '../../lib/standard-site';

export const GET: APIRoute = () => {
	if (!standardSitePublicationUri) {
		return new Response(null, { status: 404 });
	}

	return new Response(standardSitePublicationUri, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
		},
	});
};
