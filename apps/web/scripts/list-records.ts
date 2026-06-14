const DEFAULT_IDENTIFIER = 'lukebennett.dev';

async function resolveDid(identifier: string): Promise<string> {
	if (identifier.startsWith('did:')) return identifier;

	const response = await fetch(
		`https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(identifier)}`,
	);
	const body = (await response.json()) as { did: string };
	if (!response.ok || !body.did) {
		throw new Error(`Could not resolve ${identifier}`);
	}
	return body.did;
}

async function resolvePds(did: string): Promise<string> {
	const response = await fetch(`https://plc.directory/${did}`);
	const body = (await response.json()) as {
		service?: Array<{ type: string; serviceEndpoint: string }>;
	};
	const service = body.service?.find(
		(item) => item.type === 'AtprotoPersonalDataServer',
	);
	if (!service?.serviceEndpoint) {
		throw new Error(`${did} has no PDS`);
	}
	return service.serviceEndpoint;
}

async function main() {
	const identifier = process.env.ATPROTO_IDENTIFIER ?? DEFAULT_IDENTIFIER;
	const password = process.env.STANDARD_SITE_APP_PASSWORD;
	if (!password) {
		console.error('Set STANDARD_SITE_APP_PASSWORD');
		process.exit(1);
	}

	const did = await resolveDid(identifier);
	const pds = await resolvePds(did);
	console.error(`Resolved ${identifier} → ${did}, PDS: ${pds}`);

	const sessionRes = await fetch(
		`${pds}/xrpc/com.atproto.server.createSession`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ identifier, password }),
		},
	);
	if (!sessionRes.ok) {
		console.error(
			`Auth failed: ${sessionRes.status} ${await sessionRes.text()}`,
		);
		process.exit(1);
	}
	const session = (await sessionRes.json()) as { accessJwt: string };
	const auth = `Bearer ${session.accessJwt}`;

	const records: Array<{ uri: string; value: Record<string, unknown> }> = [];
	let cursor: string | undefined;

	while (true) {
		const query = new URLSearchParams({
			collection: 'site.standard.document',
			limit: '100',
			repo: did,
		});
		if (cursor) query.set('cursor', cursor);

		const res = await fetch(
			`${pds}/xrpc/com.atproto.repo.listRecords?${query}`,
			{ headers: { Authorization: auth } },
		);
		const body = (await res.json()) as {
			cursor?: string;
			records: Array<{ uri: string; value: Record<string, unknown> }>;
		};
		records.push(...body.records);
		if (!body.cursor) break;
		cursor = body.cursor;
	}

	for (const record of records) {
		const rkey = record.uri.slice(record.uri.lastIndexOf('/') + 1);
		const path = (record.value as Record<string, unknown>)?.path ?? '(no path)';
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
