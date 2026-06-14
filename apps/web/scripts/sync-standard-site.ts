import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as z from 'zod';

type PublishedPost = {
	portableContent: string;
	publishedAt: string;
	slug: string;
	title: string;
};

type DocumentRecord = {
	$type: typeof COLLECTION;
	content: {
		$type: 'at.markpub.markdown';
		text: {
			$type: 'at.markpub.text';
			markdown: string;
		};
	};
	description: string;
	path: `/posts/${string}`;
	publishedAt: string;
	site: typeof PUBLICATION_URI;
	textContent: string;
	title: string;
};

const SessionSchema = z.object({
	accessJwt: z.string(),
	did: z.string(),
});

type Session = z.infer<typeof SessionSchema>;

const ExistingRecordSchema = z.object({
	uri: z.string().startsWith('at://'),
	value: z.record(z.string(), z.unknown()),
});

type ExistingRecord = z.infer<typeof ExistingRecordSchema>;

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

const APP_DIR = new URL('..', import.meta.url);
const POSTS_DIR = new URL('content/posts/', APP_DIR);
const GENERATED_DIR = new URL('src/generated/', APP_DIR);
const MANIFEST_URL = new URL('src/generated/standard-site.json', APP_DIR);
const COLLECTION = 'site.standard.document';
const PUBLICATION_URI =
	'at://did:plc:3z5ja7l2rhnmtr2bni5dyfe7/site.standard.publication/3mnqwgvxn372f';
const DEFAULT_IDENTIFIER = 'lukebennett.dev';

export function extractPortableContent(
	filename: string,
	source: string,
): string {
	if (!source.startsWith('---\n')) {
		throw new Error(`${filename} is missing frontmatter`);
	}

	const frontmatterEnd = source.indexOf('\n---\n', 4);

	if (frontmatterEnd === -1) {
		throw new Error(`${filename} has invalid frontmatter`);
	}

	return source.slice(frontmatterEnd + '\n---\n'.length);
}

const RECORD_KEY_PATTERN = /^(?!\.\.?$)[A-Za-z0-9._:~-]{1,512}$/;

export function isValidRecordKey(value: string): boolean {
	return RECORD_KEY_PATTERN.test(value);
}

const OWNED_DOCUMENT_FIELDS = [
	'$type',
	'content',
	'description',
	'path',
	'publishedAt',
	'site',
	'textContent',
	'title',
] as const;

export function getDocumentUri(did: string, slug: string): string {
	if (!isValidRecordKey(slug)) {
		throw new Error(`${slug} is not a valid AT Protocol record key`);
	}

	return `at://${did}/site.standard.document/${slug}`;
}

export function assertExpectedDocumentUri(slug: string, uri: string): void {
	if (getRkey(uri) !== slug) {
		throw new Error(`${uri} has unexpected record key for ${slug}`);
	}
}

export function compareOwnedDocumentFields(
	generated: DocumentRecord,
	remote: Record<string, unknown>,
): boolean {
	return OWNED_DOCUMENT_FIELDS.every(
		(field) =>
			JSON.stringify(remote[field]) === JSON.stringify(generated[field]),
	);
}

export function mergeOwnedDocumentFields(
	remote: Record<string, unknown>,
	generated: DocumentRecord,
): Record<string, unknown> {
	return {
		...remote,
		...generated,
	};
}

type ReconciliationPlan = {
	creates: Array<{
		record: DocumentRecord;
		slug: string;
		uri: string;
	}>;
	deletes: Array<{ record: ExistingRecord; slug: string }>;
	noops: Array<{ record: ExistingRecord; slug: string; uri: string }>;
	updates: Array<{
		record: DocumentRecord;
		remote: ExistingRecord;
		slug: string;
		uri: string;
	}>;
};

export function planReconciliation({
	did,
	existingRecords,
	posts,
}: {
	did: string;
	existingRecords: Array<ExistingRecord>;
	posts: Array<PublishedPost>;
}): ReconciliationPlan {
	const postsByPath = new Map(
		posts.map((post) => [`/posts/${post.slug}`, post]),
	);
	const existingByPath = new Map<string, ExistingRecord>();

	for (const record of existingRecords) {
		const value = record.value ?? {};
		if (
			value.site !== PUBLICATION_URI ||
			typeof value.path !== 'string' ||
			!value.path.startsWith('/posts/')
		) {
			continue;
		}

		const slug = value.path.slice('/posts/'.length);

		if (getRkey(record.uri) !== slug) {
			throw new Error(
				`${record.uri} conflicts with ${value.path}; manual cleanup required`,
			);
		}

		existingByPath.set(value.path, record);
	}

	const plan: ReconciliationPlan = {
		creates: [],
		deletes: [],
		noops: [],
		updates: [],
	};

	for (const post of posts) {
		const record = buildDocumentRecord(post);
		const uri = getDocumentUri(did, post.slug);
		const remote = existingByPath.get(record.path);

		if (!remote) {
			plan.creates.push({ record, slug: post.slug, uri });
			continue;
		}

		assertExpectedDocumentUri(post.slug, remote.uri);

		if (compareOwnedDocumentFields(record, remote.value)) {
			plan.noops.push({ record: remote, slug: post.slug, uri: remote.uri });
			continue;
		}

		plan.updates.push({ record, remote, slug: post.slug, uri: remote.uri });
	}

	for (const [path, record] of existingByPath.entries()) {
		if (!postsByPath.has(path)) {
			plan.deletes.push({ record, slug: path.slice('/posts/'.length) });
		}
	}

	return plan;
}

export function buildDocumentRecord(post: PublishedPost): DocumentRecord {
	const textContent = toPlainText(post.portableContent);

	return {
		$type: COLLECTION,
		content: {
			$type: 'at.markpub.markdown',
			text: {
				$type: 'at.markpub.text',
				markdown: post.portableContent,
			},
		},
		description: truncateDescription(textContent),
		path: `/posts/${post.slug}`,
		publishedAt: new Date(`${post.publishedAt}T00:00:00.000Z`).toISOString(),
		site: PUBLICATION_URI,
		textContent,
		title: post.title,
	};
}

async function removeManifest(): Promise<void> {
	await rm(MANIFEST_URL, { force: true });
}

async function writeManifest(
	documentsBySlug: Map<string, string>,
): Promise<void> {
	await mkdir(GENERATED_DIR, { recursive: true });
	await writeFile(
		MANIFEST_URL,
		`${JSON.stringify(
			{
				publicationUri: PUBLICATION_URI,
				documentsBySlug: Object.fromEntries(
					[...documentsBySlug.entries()].sort(([a], [b]) => a.localeCompare(b)),
				),
			},
			null,
			2,
		)}\n`,
		'utf8',
	);
}

const FENCE_PATTERN = /```[\s\S]*?```/g;
const IMAGE_PATTERN = /!\[([^\]]*)\]\([^)]+\)/g;
const LINK_PATTERN = /\[([^\]]+)\]\([^)]+\)/g;
const INLINE_CODE_PATTERN = /`([^`]+)`/g;
const FORMATTING_CHARS_PATTERN = /[*_~>#]/g;
const TAG_PATTERN = /\{[%#][\s\S]*?[%#]\}/g;
const HARD_BREAK_PATTERN = /\\\n/g;
const EXCESS_NEWLINES_PATTERN = /\n{3,}/g;

export function toPlainText(markdoc: string): string {
	return markdoc
		.replaceAll(FENCE_PATTERN, '')
		.replaceAll(IMAGE_PATTERN, '$1')
		.replaceAll(LINK_PATTERN, '$1')
		.replaceAll(INLINE_CODE_PATTERN, '$1')
		.replaceAll(FORMATTING_CHARS_PATTERN, '')
		.replaceAll(TAG_PATTERN, '')
		.replaceAll(HARD_BREAK_PATTERN, '\n')
		.replaceAll(EXCESS_NEWLINES_PATTERN, '\n\n')
		.trim();
}

function truncateDescription(textContent: string): string {
	const maxLength = 180;
	if (textContent.length <= maxLength) {
		return textContent;
	}

	return `${textContent.slice(0, maxLength - 1).trimEnd()}…`;
}

export async function loadPublishedPosts(): Promise<Array<PublishedPost>> {
	const filenames = (await readdir(POSTS_DIR))
		.filter((filename) => filename.endsWith('.mdoc'))
		.sort();
	const posts: Array<PublishedPost> = [];

	for (const filename of filenames) {
		const source = await readFile(new URL(filename, POSTS_DIR), 'utf8');
		const slug = basename(filename, '.mdoc');

		if (!source.startsWith('---\n')) {
			continue;
		}

		const frontmatterEnd = source.indexOf('\n---\n', 4);
		if (frontmatterEnd === -1) {
			continue;
		}

		const frontmatter = source.slice(4, frontmatterEnd);
		const fields = parseSimpleFrontmatter(frontmatter);

		if (fields.isDraft === 'true') {
			continue;
		}

		const portableContent = source.slice(frontmatterEnd + '\n---\n'.length);

		if (!fields.publishedAt || !fields.title) {
			continue;
		}

		posts.push({
			portableContent,
			publishedAt: fields.publishedAt,
			slug,
			title: fields.title,
		});
	}

	return posts;
}

function parseSimpleFrontmatter(
	frontmatter: string,
): Record<string, string | undefined> {
	const fields: Record<string, string | undefined> = {};

	for (const line of frontmatter.split('\n')) {
		const separator = line.indexOf(':');
		if (separator === -1) {
			continue;
		}

		const key = line.slice(0, separator).trim();
		const rawValue = line.slice(separator + 1).trim();
		fields[key] = rawValue.replace(/^['"](.*)['"]$/, '$1');
	}

	return fields;
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

async function listRecords(
	pds: string,
	auth: Record<string, string>,
	repo: string,
	collection: string,
): Promise<Array<ExistingRecord>> {
	const records: Array<ExistingRecord> = [];
	let cursor: string | undefined;

	while (true) {
		const query = new URLSearchParams({
			collection,
			limit: '100',
			repo,
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
}

function getRkey(uri: string): string {
	const index = uri.lastIndexOf('/');
	return uri.slice(index + 1);
}

async function authenticate(
	identifier: string,
	password: string,
): Promise<{ auth: Record<string, string>; did: string; pds: string }> {
	const did = await resolveDid(identifier);
	const pds = await resolvePds(did);
	const session = await createSession(pds, identifier, password);
	return { auth: { Authorization: `Bearer ${session.accessJwt}` }, did, pds };
}

function printPlan(plan: ReconciliationPlan): void {
	for (const item of plan.creates) {
		console.log(`create ${item.slug}`);
	}
	for (const item of plan.updates) {
		console.log(`update ${item.slug}`);
	}
	for (const item of plan.deletes) {
		console.log(`delete ${item.slug}`);
	}
	for (const item of plan.noops) {
		console.log(`noop ${item.slug}`);
	}
	console.log(
		`${plan.creates.length} creates, ${plan.updates.length} updates, ${plan.deletes.length} deletes, ${plan.noops.length} noops`,
	);
}

async function executePlan(
	pds: string,
	auth: Record<string, string>,
	repo: string,
	plan: ReconciliationPlan,
): Promise<Map<string, string>> {
	const documentsBySlug = new Map<string, string>();

	for (const item of plan.creates) {
		const result = await xrpc(
			pds,
			'com.atproto.repo.createRecord',
			WriteRecordResponseSchema,
			{
				body: JSON.stringify({
					collection: COLLECTION,
					record: item.record,
					repo,
					rkey: item.slug,
					validate: false,
				}),
				headers: auth,
				method: 'POST',
			},
		);
		documentsBySlug.set(item.slug, result.uri);
	}

	for (const item of plan.updates) {
		const result = await xrpc(
			pds,
			'com.atproto.repo.putRecord',
			WriteRecordResponseSchema,
			{
				body: JSON.stringify({
					collection: COLLECTION,
					record: mergeOwnedDocumentFields(item.remote.value, item.record),
					repo,
					rkey: getRkey(item.remote.uri),
					validate: false,
				}),
				headers: auth,
				method: 'POST',
			},
		);
		documentsBySlug.set(item.slug, result.uri);
	}

	for (const item of plan.deletes) {
		await xrpcVoid(pds, 'com.atproto.repo.deleteRecord', {
			body: JSON.stringify({
				collection: COLLECTION,
				repo,
				rkey: getRkey(item.record.uri),
			}),
			headers: auth,
			method: 'POST',
		});
	}

	for (const item of plan.noops) {
		documentsBySlug.set(item.slug, item.uri);
	}

	return documentsBySlug;
}

async function main(): Promise<void> {
	const args = new Set(process.argv.slice(2));

	if (args.has('--help')) {
		console.log('Usage: pnpm standard-site:sync [-- --report | -- --write]');
		return;
	}

	if (!args.has('--report') && !args.has('--write')) {
		const posts = await loadPublishedPosts();
		for (const post of posts) {
			console.log(`${post.slug} /posts/${post.slug}`);
		}
		console.log(`published posts: ${posts.length}`);
		return;
	}

	const password = process.env.STANDARD_SITE_APP_PASSWORD;
	if (!password) {
		throw new Error('Set STANDARD_SITE_APP_PASSWORD');
	}

	const identifier = process.env.ATPROTO_IDENTIFIER ?? DEFAULT_IDENTIFIER;
	const { auth, did, pds } = await authenticate(identifier, password);
	const posts = await loadPublishedPosts();
	const existingRecords = await listRecords(pds, auth, did, COLLECTION);
	const plan = planReconciliation({ did, existingRecords, posts });

	if (args.has('--report')) {
		printPlan(plan);
		return;
	}

	if (args.has('--write')) {
		await removeManifest();
		const documentsBySlug = await executePlan(pds, auth, did, plan);
		await writeManifest(documentsBySlug);
		printPlan(plan);
	}
}

if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(process.argv[1]).href
) {
	main().catch((error) => {
		console.error(error.message);
		process.exit(1);
	});
}
