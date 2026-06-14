const DEFAULT_IDENTIFIER = 'lukebennett.dev';

function getRkey(uri: string): string {
	const index = uri.lastIndexOf('/');
	return uri.slice(index + 1);
}

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

	const did = await resolveDid(identifier);
	const pds = await resolvePds(did);
	console.error(`Resolved ${identifier} → ${did}, PDS: ${pds}`);

	const sessionRes = await fetch(
		`${pds}/xrpc/com.atproto.server.createSession`,
		{
			body: JSON.stringify({ identifier, password }),
			headers: { 'Content-Type': 'application/json' },
			method: 'POST',
		},
	);
	if (!sessionRes.ok) {
		console.error(
			`Auth failed: ${sessionRes.status} ${await sessionRes.text()}`,
		);
		process.exit(1);
	}
	const session = (await sessionRes.json()) as { accessJwt: string };

	const deleteRes = await fetch(`${pds}/xrpc/com.atproto.repo.deleteRecord`, {
		body: JSON.stringify({
			collection: 'site.standard.document',
			repo: did,
			rkey,
		}),
		headers: {
			Authorization: `Bearer ${session.accessJwt}`,
			'Content-Type': 'application/json',
		},
		method: 'POST',
	});
	if (!deleteRes.ok) {
		console.error(
			`Delete failed: ${deleteRes.status} ${await deleteRes.text()}`,
		);
		process.exit(1);
	}

	console.log(`Deleted site.standard.document/${rkey}`);
}

main().catch((err) => {
	console.error(err.message);
	process.exit(1);
});
