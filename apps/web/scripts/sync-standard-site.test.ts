import assert from 'node:assert/strict';
import test from 'node:test';
import {
	buildDocumentRecord,
	compareOwnedDocumentFields,
	extractPortableContent,
	getDocumentUri,
	isValidRecordKey,
	mergeOwnedDocumentFields,
	planReconciliation,
	toPlainText,
} from './sync-standard-site';

test('extractPortableContent returns body after frontmatter', () => {
	assert.equal(
		extractPortableContent(
			'hello-world.mdoc',
			`---
title: Hello World
publishedAt: 2024-01-20
isDraft: false
---
Hello [there](https://example.com).
`,
		),
		'Hello [there](https://example.com).\n',
	);
});

test('extractPortableContent rejects missing frontmatter boundary', () => {
	assert.throws(
		() => extractPortableContent('broken.mdoc', 'Hello world'),
		/broken.mdoc is missing frontmatter/,
	);
});

test('isValidRecordKey accepts current slug shape', () => {
	assert.equal(isValidRecordKey('top-picks-2024-february'), true);
	assert.equal(isValidRecordKey('uses'), true);
});

test('isValidRecordKey rejects invalid ATProto record keys', () => {
	assert.equal(isValidRecordKey('.'), false);
	assert.equal(isValidRecordKey('bad/slash'), false);
	assert.equal(isValidRecordKey(''), false);
});

test('buildDocumentRecord creates a Standard.site document record with Portable Content', () => {
	const record = buildDocumentRecord({
		portableContent: 'Hello [there](https://example.com).\n',
		publishedAt: '2024-01-20',
		slug: 'hello-world',
		title: 'Hello World',
	});

	assert.deepEqual(record, {
		$type: 'site.standard.document',
		content: {
			$type: 'at.markpub.markdown',
			text: {
				$type: 'at.markpub.text',
				markdown: 'Hello [there](https://example.com).\n',
			},
		},
		description: 'Hello there.',
		path: '/posts/hello-world',
		publishedAt: '2024-01-20T00:00:00.000Z',
		site: 'at://did:plc:3z5ja7l2rhnmtr2bni5dyfe7/site.standard.publication/3mnqwgvxn372f',
		textContent: 'Hello there.',
		title: 'Hello World',
	});
});

test('getDocumentUri uses raw slug as record key', () => {
	assert.equal(
		getDocumentUri('did:plc:example', 'hello-world'),
		'at://did:plc:example/site.standard.document/hello-world',
	);
});

test('compareOwnedDocumentFields ignores unknown remote fields', () => {
	const generated = buildDocumentRecord({
		portableContent: 'Hello.',
		publishedAt: '2024-01-20',
		slug: 'hello-world',
		title: 'Hello World',
	});

	assert.equal(
		compareOwnedDocumentFields(generated, {
			...generated,
			unknownFutureField: true,
		}),
		true,
	);
});

test('mergeOwnedDocumentFields preserves unknown remote fields', () => {
	const generated = buildDocumentRecord({
		portableContent: 'Hello.',
		publishedAt: '2024-01-20',
		slug: 'hello-world',
		title: 'Hello World',
	});

	assert.deepEqual(mergeOwnedDocumentFields({ extra: 'keep' }, generated), {
		...generated,
		extra: 'keep',
	});
});

test('planReconciliation creates missing records and deletes withdrawn post records', () => {
	const post = {
		portableContent: 'Hello.',
		publishedAt: '2024-01-20',
		slug: 'hello-world',
		title: 'Hello World',
	};

	const plan = planReconciliation({
		did: 'did:plc:example',
		existingRecords: [
			{
				uri: 'at://did:plc:example/site.standard.document/old-post',
				value: {
					$type: 'site.standard.document',
					path: '/posts/old-post',
					site: 'at://did:plc:3z5ja7l2rhnmtr2bni5dyfe7/site.standard.publication/3mnqwgvxn372f',
				},
			},
		],
		posts: [post],
	});

	assert.deepEqual(
		plan.creates.map((item) => item.slug),
		['hello-world'],
	);
	assert.deepEqual(
		plan.deletes.map((item) => item.slug),
		['old-post'],
	);
});

test('planReconciliation fails on unexpected existing record key', () => {
	assert.throws(
		() =>
			planReconciliation({
				did: 'did:plc:example',
				existingRecords: [
					{
						uri: 'at://did:plc:example/site.standard.document/generated-key',
						value: {
							$type: 'site.standard.document',
							path: '/posts/hello-world',
							site: 'at://did:plc:3z5ja7l2rhnmtr2bni5dyfe7/site.standard.publication/3mnqwgvxn372f',
						},
					},
				],
				posts: [
					{
						portableContent: 'Hello.',
						publishedAt: '2024-01-20',
						slug: 'hello-world',
						title: 'Hello World',
					},
				],
			}),
		/manual cleanup/,
	);
});

test('toPlainText strips Markdown links and Markdoc component blocks', () => {
	assert.equal(
		toPlainText(`Hello [there](https://example.com).

{% cloudImage src="https://example.com/image" /%}
`),
		'Hello there.',
	);
});
