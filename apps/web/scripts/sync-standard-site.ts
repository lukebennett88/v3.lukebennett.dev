import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
	type AtprotoRepo,
	connectAtprotoRepo,
	type ExistingRecord,
	getRkey,
} from './atproto.ts';

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
		throw new Error(`Expected document URI for ${slug}, received ${uri}`);
	}
}

export function recordSyncedDocumentUri(
	documentsBySlug: Map<string, string>,
	slug: string,
	uri: string,
): void {
	assertExpectedDocumentUri(slug, uri);
	documentsBySlug.set(slug, uri);
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
				documentsBySlug: Object.fromEntries(
					[...documentsBySlug.entries()].sort(([a], [b]) => a.localeCompare(b)),
				),
				publicationUri: PUBLICATION_URI,
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
		const post = parsePublishedPost(filename, source);
		if (post) posts.push(post);
	}

	return posts;
}

export function parsePublishedPost(
	filename: string,
	source: string,
): PublishedPost | null {
	const slug = basename(filename, '.mdoc');
	if (!isValidRecordKey(slug)) {
		throw new Error(`${filename} has an invalid ATProto record key`);
	}

	if (!source.startsWith('---\n')) {
		throw new Error(`${filename} is missing frontmatter`);
	}

	const frontmatterEnd = source.indexOf('\n---\n', 4);
	if (frontmatterEnd === -1) {
		throw new Error(`${filename} is missing frontmatter`);
	}

	const frontmatter = source.slice(4, frontmatterEnd);
	const fields = parseSimpleFrontmatter(frontmatter);

	if (fields.isDraft === 'true') {
		return null;
	}

	if (!fields.title) {
		throw new Error(`${filename} is missing title`);
	}
	if (!fields.publishedAt) {
		throw new Error(`${filename} is missing publishedAt`);
	}

	return {
		portableContent: source.slice(frontmatterEnd + '\n---\n'.length),
		publishedAt: fields.publishedAt,
		slug,
		title: fields.title,
	};
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

export async function executePlan(
	repo: AtprotoRepo,
	plan: ReconciliationPlan,
): Promise<Map<string, string>> {
	const documentsBySlug = new Map<string, string>();

	for (const item of plan.creates) {
		const result = await repo.createRecord({
			collection: COLLECTION,
			record: item.record,
			rkey: item.slug,
		});
		recordSyncedDocumentUri(documentsBySlug, item.slug, result.uri);
	}

	for (const item of plan.updates) {
		const result = await repo.putRecord({
			collection: COLLECTION,
			record: mergeOwnedDocumentFields(item.remote.value, item.record),
			rkey: getRkey(item.remote.uri),
		});
		recordSyncedDocumentUri(documentsBySlug, item.slug, result.uri);
	}

	for (const item of plan.deletes) {
		await repo.deleteRecord({
			collection: COLLECTION,
			rkey: getRkey(item.record.uri),
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
	const repo = await connectAtprotoRepo({ identifier, password });
	const posts = await loadPublishedPosts();
	const existingRecords = await repo.listRecords(COLLECTION);
	const plan = planReconciliation({ did: repo.did, existingRecords, posts });

	if (args.has('--report')) {
		printPlan(plan);
		return;
	}

	if (args.has('--write')) {
		await removeManifest();
		const documentsBySlug = await executePlan(repo, plan);
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
