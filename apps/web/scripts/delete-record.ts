import { connectAtprotoRepo, getRkey } from './atproto.ts';

const DEFAULT_IDENTIFIER = 'lukebennett.dev';

async function main() {
	const raw = process.argv[2];
	if (!raw) {
		console.error(
			'Usage: STANDARD_SITE_APP_PASSWORD=xxx node --experimental-strip-types scripts/delete-record.ts <rkey or at:// URI>',
		);
		console.error('  ATPROTO_IDENTIFIER: defaults to lukebennett.dev');
		process.exit(1);
	}

	const rkey = raw.startsWith('at://') ? getRkey(raw) : raw;
	const identifier = process.env.ATPROTO_IDENTIFIER ?? DEFAULT_IDENTIFIER;
	const password = process.env.STANDARD_SITE_APP_PASSWORD;
	if (!password) {
		console.error('Set STANDARD_SITE_APP_PASSWORD');
		process.exit(1);
	}

	const repo = await connectAtprotoRepo({ identifier, password });
	await repo.deleteRecord({ collection: 'site.standard.document', rkey });

	console.log(`Deleted site.standard.document/${rkey}`);
}

main().catch((err) => {
	console.error(err.message);
	process.exit(1);
});
