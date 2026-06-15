import { connectAtprotoRepo, getRkey } from './atproto.ts';

const DEFAULT_IDENTIFIER = 'lukebennett.dev';

async function main() {
	const identifier = process.env.ATPROTO_IDENTIFIER ?? DEFAULT_IDENTIFIER;
	const password = process.env.STANDARD_SITE_APP_PASSWORD;
	if (!password) {
		console.error('Set STANDARD_SITE_APP_PASSWORD');
		process.exit(1);
	}

	const repo = await connectAtprotoRepo({ identifier, password });
	const records = await repo.listRecords('site.standard.document');

	for (const record of records) {
		const rkey = getRkey(record.uri);
		const path = record.value?.path ?? '(no path)';
		const expectedRkey =
			typeof path === 'string' && path.startsWith('/posts/')
				? path.slice('/posts/'.length)
				: null;
		const match = expectedRkey === rkey ? '' : ' ← WRONG KEY';
		console.log(`${rkey}  ${path}${match}`);
	}
	console.log(`\n${records.length} records`);
}

main().catch((err) => {
	console.error(err.message);
	process.exit(1);
});
