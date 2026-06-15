import assert from 'node:assert/strict';
import test from 'node:test';
import { createInMemoryAtprotoRepo, getRkey } from './atproto.ts';
import {
	buildDocumentRecord,
	executePlan,
	planReconciliation,
} from './sync-standard-site.ts';

test('getRkey extracts the last path segment of an at:// uri', () => {
	assert.equal(
		getRkey('at://did:plc:example/site.standard.document/hello-world'),
		'hello-world',
	);
});

test('createInMemoryAtprotoRepo lists seeded records', async () => {
	const repo = createInMemoryAtprotoRepo({
		did: 'did:plc:example',
		records: [
			{
				uri: 'at://did:plc:example/site.standard.document/hello-world',
				value: { path: '/posts/hello-world' },
			},
		],
	});

	const records = await repo.listRecords('site.standard.document');
	assert.deepEqual(records, [
		{
			uri: 'at://did:plc:example/site.standard.document/hello-world',
			value: { path: '/posts/hello-world' },
		},
	]);
});

test('createInMemoryAtprotoRepo reflects created records', async () => {
	const repo = createInMemoryAtprotoRepo({ did: 'did:plc:example' });

	const result = await repo.createRecord({
		collection: 'site.standard.document',
		record: { path: '/posts/new-post' },
		rkey: 'new-post',
	});

	assert.equal(
		result.uri,
		'at://did:plc:example/site.standard.document/new-post',
	);
	assert.deepEqual(await repo.listRecords('site.standard.document'), [
		{
			uri: 'at://did:plc:example/site.standard.document/new-post',
			value: { path: '/posts/new-post' },
		},
	]);
});

test('createInMemoryAtprotoRepo removes deleted records', async () => {
	const repo = createInMemoryAtprotoRepo({
		did: 'did:plc:example',
		records: [
			{
				uri: 'at://did:plc:example/site.standard.document/hello-world',
				value: { path: '/posts/hello-world' },
			},
		],
	});

	await repo.deleteRecord({
		collection: 'site.standard.document',
		rkey: 'hello-world',
	});

	assert.deepEqual(await repo.listRecords('site.standard.document'), []);
});

test('executePlan applies creates and deletes against an in-memory repo', async () => {
	const did = 'did:plc:example';
	const post = {
		portableContent: 'Hello.',
		publishedAt: '2024-01-20',
		slug: 'hello-world',
		title: 'Hello World',
	};

	const repo = createInMemoryAtprotoRepo({
		did,
		records: [
			{
				uri: 'at://did:plc:example/site.standard.document/old-post',
				value: {
					$type: 'site.standard.document',
					path: '/posts/old-post',
					site: 'at://did:plc:3z5ja7l2rhnmtr2bni5dyfe7/site.standard.publication/3mnqwgvxn372f',
				},
			},
		],
	});

	const plan = planReconciliation({
		did,
		existingRecords: await repo.listRecords('site.standard.document'),
		posts: [post],
	});

	const documentsBySlug = await executePlan(repo, plan);

	assert.deepEqual(Object.fromEntries(documentsBySlug), {
		'hello-world': 'at://did:plc:example/site.standard.document/hello-world',
	});

	const records = await repo.listRecords('site.standard.document');
	assert.deepEqual(records, [
		{
			uri: 'at://did:plc:example/site.standard.document/hello-world',
			value: buildDocumentRecord(post),
		},
	]);
});

test('executePlan updates owned fields while preserving unknown remote fields', async () => {
	const did = 'did:plc:example';
	const slug = 'hello-world';
	const uri = `at://${did}/site.standard.document/${slug}`;

	const stalePost = {
		portableContent: 'Old body.',
		publishedAt: '2024-01-20',
		slug,
		title: 'Old Title',
	};
	const currentPost = {
		portableContent: 'New body.',
		publishedAt: '2024-02-15',
		slug,
		title: 'New Title',
	};

	const repo = createInMemoryAtprotoRepo({
		did,
		records: [
			{
				uri,
				value: {
					...buildDocumentRecord(stalePost),
					title: 'Stale Title Override',
					unknownFutureField: 'preserve-me',
				},
			},
		],
	});

	const plan = planReconciliation({
		did,
		existingRecords: await repo.listRecords('site.standard.document'),
		posts: [currentPost],
	});

	assert.equal(plan.updates.length, 1);
	assert.equal(plan.creates.length, 0);

	const documentsBySlug = await executePlan(repo, plan);

	assert.deepEqual(Object.fromEntries(documentsBySlug), {
		[slug]: uri,
	});

	const records = await repo.listRecords('site.standard.document');
	assert.deepEqual(records, [
		{
			uri,
			value: {
				...buildDocumentRecord(currentPost),
				unknownFutureField: 'preserve-me',
			},
		},
	]);
});
