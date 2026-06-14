import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
	getStandardSiteDocumentUri,
	loadStandardSiteManifest,
	standardSitePublicationUri,
} from './standard-site.ts';

test('keeps committed publication URI available', () => {
	assert.equal(
		standardSitePublicationUri,
		'at://did:plc:3z5ja7l2rhnmtr2bni5dyfe7/site.standard.publication/3mnqwgvxn372f',
	);
});

test('returns an empty document map when manifest is missing outside production', () => {
	const manifest = loadStandardSiteManifest({
		manifestPath: join(tmpdir(), 'missing-standard-site.json'),
		requireManifest: false,
	});

	assert.deepEqual(manifest.documentsBySlug, {});
});

test('throws when manifest is required and missing', () => {
	assert.throws(
		() =>
			loadStandardSiteManifest({
				manifestPath: join(tmpdir(), 'missing-standard-site.json'),
				requireManifest: true,
			}),
		/Record Manifest artifact is required/,
	);
});

test('throws when manifest JSON is malformed', async () => {
	const dir = await mkdtemp(join(tmpdir(), 'standard-site-'));
	const manifestPath = join(dir, 'standard-site.json');

	try {
		await writeFile(manifestPath, '{bad json', 'utf8');

		assert.throws(
			() =>
				loadStandardSiteManifest({
					manifestPath,
					requireManifest: false,
				}),
			/Record Manifest artifact is malformed/,
		);
	} finally {
		await rm(dir, { force: true, recursive: true });
	}
});

test('reads document URIs from valid manifest', async () => {
	const dir = await mkdtemp(join(tmpdir(), 'standard-site-'));
	const manifestPath = join(dir, 'standard-site.json');
	const documentUri =
		'at://did:plc:3z5ja7l2rhnmtr2bni5dyfe7/site.standard.document/3testrecord';

	try {
		await writeFile(
			manifestPath,
			JSON.stringify({
				documentsBySlug: {
					'hello-world': documentUri,
				},
				publicationUri: standardSitePublicationUri,
			}),
			'utf8',
		);

		const manifest = loadStandardSiteManifest({
			manifestPath,
			requireManifest: false,
		});

		assert.equal(manifest.documentsBySlug['hello-world'], documentUri);
		assert.equal(
			getStandardSiteDocumentUri('hello-world', {
				manifestPath,
				requireManifest: false,
			}),
			documentUri,
		);
	} finally {
		await rm(dir, { force: true, recursive: true });
	}
});
