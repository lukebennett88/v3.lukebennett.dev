import * as z from 'zod';

const SessionSchema = z.object({
	accessJwt: z.string(),
	did: z.string(),
});

type Session = z.infer<typeof SessionSchema>;

const ExistingRecordSchema = z.object({
	uri: z.string().startsWith('at://'),
	value: z.record(z.string(), z.unknown()),
});

export type ExistingRecord = z.infer<typeof ExistingRecordSchema>;

const ListRecordsResponseSchema = z.object({
	cursor: z.string().optional(),
	records: z.array(ExistingRecordSchema),
});

const WriteRecordResponseSchema = z.object({
	uri: z.string().startsWith('at://'),
});

const DidDocumentSchema = z.object({
	service: z
		.array(
			z.object({
				serviceEndpoint: z.string().optional(),
				type: z.string().optional(),
			}),
		)
		.optional(),
});

const DidResponseSchema = z.object({
	did: z.string().optional(),
});

export interface AtprotoRepo {
	createRecord(input: {
		collection: string;
		rkey: string;
		record: unknown;
		validate?: boolean;
	}): Promise<{ uri: string }>;
	deleteRecord(input: { collection: string; rkey: string }): Promise<void>;
	readonly did: string;
	listRecords(collection: string): Promise<Array<ExistingRecord>>;
	putRecord(input: {
		collection: string;
		rkey: string;
		record: unknown;
		validate?: boolean;
	}): Promise<{ uri: string }>;
}

async function xrpc<ResponseBody>(
	pds: string,
	path: string,
	schema: z.ZodType<ResponseBody>,
	init: RequestInit = {},
): Promise<ResponseBody> {
	const response = await fetch(`${pds}/xrpc/${path}`, {
		...init,
		headers: {
			'Content-Type': 'application/json',
			...init.headers,
		},
	});
	const text = await response.text();

	if (!response.ok) {
		throw new Error(`${response.status} ${response.statusText}: ${text}`);
	}

	return schema.parse(JSON.parse(text));
}

async function xrpcVoid(
	pds: string,
	path: string,
	init: RequestInit = {},
): Promise<void> {
	const response = await fetch(`${pds}/xrpc/${path}`, {
		...init,
		headers: {
			'Content-Type': 'application/json',
			...init.headers,
		},
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`${response.status} ${response.statusText}: ${text}`);
	}
}

async function resolveDid(identifier: string): Promise<string> {
	if (identifier.startsWith('did:')) {
		return identifier;
	}

	const response = await fetch(
		`https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(identifier)}`,
	);
	const body = DidResponseSchema.parse(await response.json());

	if (!response.ok) {
		throw new Error(`Could not resolve ${identifier}: ${JSON.stringify(body)}`);
	}

	if (!body.did) {
		throw new Error(`Could not resolve ${identifier}`);
	}

	return body.did;
}

async function resolvePds(did: string): Promise<string> {
	const response = await fetch(`https://plc.directory/${did}`);
	const body = DidDocumentSchema.parse(await response.json());

	if (!response.ok) {
		throw new Error(`Could not resolve DID document for ${did}`);
	}

	const service = body.service?.find(
		(item) => item.type === 'AtprotoPersonalDataServer',
	);
	if (!service?.serviceEndpoint) {
		throw new Error(`${did} has no AT Protocol PDS service`);
	}

	return service.serviceEndpoint.replace(/\/$/, '');
}

async function createSession(
	pds: string,
	identifier: string,
	password: string,
): Promise<Session> {
	return xrpc(pds, 'com.atproto.server.createSession', SessionSchema, {
		body: JSON.stringify({ identifier, password }),
		method: 'POST',
	});
}

export function getRkey(uri: string): string {
	const index = uri.lastIndexOf('/');
	return uri.slice(index + 1);
}

export async function connectAtprotoRepo(input: {
	identifier: string;
	password: string;
}): Promise<AtprotoRepo> {
	const did = await resolveDid(input.identifier);
	const pds = await resolvePds(did);
	const session = await createSession(pds, input.identifier, input.password);
	const auth = { Authorization: `Bearer ${session.accessJwt}` };

	return {
		did,
		async listRecords(collection: string): Promise<Array<ExistingRecord>> {
			const records: Array<ExistingRecord> = [];
			let cursor: string | undefined;

			while (true) {
				const query = new URLSearchParams({
					collection,
					limit: '100',
					repo: did,
				});
				if (cursor) {
					query.set('cursor', cursor);
				}

				const body = await xrpc(
					pds,
					`com.atproto.repo.listRecords?${query}`,
					ListRecordsResponseSchema,
					{
						headers: auth,
					},
				);
				records.push(...body.records);
				if (!body.cursor) break;
				cursor = body.cursor;
			}

			return records;
		},
		async createRecord(input: {
			collection: string;
			rkey: string;
			record: unknown;
			validate?: boolean;
		}): Promise<{ uri: string }> {
			return xrpc(
				pds,
				'com.atproto.repo.createRecord',
				WriteRecordResponseSchema,
				{
					body: JSON.stringify({
						collection: input.collection,
						record: input.record,
						repo: did,
						rkey: input.rkey,
						validate: input.validate ?? false,
					}),
					headers: auth,
					method: 'POST',
				},
			);
		},
		async putRecord(input: {
			collection: string;
			rkey: string;
			record: unknown;
			validate?: boolean;
		}): Promise<{ uri: string }> {
			return xrpc(
				pds,
				'com.atproto.repo.putRecord',
				WriteRecordResponseSchema,
				{
					body: JSON.stringify({
						collection: input.collection,
						record: input.record,
						repo: did,
						rkey: input.rkey,
						validate: input.validate ?? false,
					}),
					headers: auth,
					method: 'POST',
				},
			);
		},
		async deleteRecord(input: {
			collection: string;
			rkey: string;
		}): Promise<void> {
			await xrpcVoid(pds, 'com.atproto.repo.deleteRecord', {
				body: JSON.stringify({
					collection: input.collection,
					repo: did,
					rkey: input.rkey,
				}),
				headers: auth,
				method: 'POST',
			});
		},
	};
}

export function createInMemoryAtprotoRepo(input?: {
	did?: string;
	records?: Array<ExistingRecord>;
}): AtprotoRepo {
	const did = input?.did ?? 'did:plc:inmemory';
	const records = new Map<string, ExistingRecord>();

	for (const record of input?.records ?? []) {
		records.set(record.uri, record);
	}

	function buildUri(collection: string, rkey: string): string {
		return `at://${did}/${collection}/${rkey}`;
	}

	return {
		did,
		async listRecords(collection: string): Promise<Array<ExistingRecord>> {
			const prefix = `at://${did}/${collection}/`;
			return [...records.values()].filter((record) =>
				record.uri.startsWith(prefix),
			);
		},
		async createRecord(input: {
			collection: string;
			rkey: string;
			record: unknown;
			validate?: boolean;
		}): Promise<{ uri: string }> {
			const uri = buildUri(input.collection, input.rkey);
			if (records.has(uri)) {
				throw new Error(`Record already exists at ${uri}`);
			}
			const stored = ExistingRecordSchema.parse({ uri, value: input.record });
			records.set(stored.uri, stored);
			return { uri: stored.uri };
		},
		async putRecord(input: {
			collection: string;
			rkey: string;
			record: unknown;
			validate?: boolean;
		}): Promise<{ uri: string }> {
			const uri = buildUri(input.collection, input.rkey);
			const stored = ExistingRecordSchema.parse({ uri, value: input.record });
			records.set(stored.uri, stored);
			return { uri: stored.uri };
		},
		async deleteRecord(input: {
			collection: string;
			rkey: string;
		}): Promise<void> {
			records.delete(buildUri(input.collection, input.rkey));
		},
	};
}
