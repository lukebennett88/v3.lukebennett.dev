import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

export const standardSitePublicationUri =
	'at://did:plc:3z5ja7l2rhnmtr2bni5dyfe7/site.standard.publication/3mnqwgvxn372f';

const StandardSiteManifestSchema = z
	.object({
		publicationUri: z.literal(standardSitePublicationUri),
		documentsBySlug: z.record(z.string(), z.string().startsWith('at://')),
	})
	.readonly();

type StandardSiteManifest = z.infer<typeof StandardSiteManifestSchema>;

type ManifestOptions = {
	manifestPath?: string;
	requireManifest?: boolean;
};

const defaultManifestPath = fileURLToPath(
	new URL('../generated/standard-site.json', import.meta.url),
);

export function loadStandardSiteManifest({
	manifestPath = defaultManifestPath,
	requireManifest = process.env.CONTEXT === 'production',
}: ManifestOptions = {}): StandardSiteManifest {
	if (!existsSync(manifestPath)) {
		if (requireManifest) {
			throw new Error(`Record Manifest artifact is required: ${manifestPath}`);
		}

		return {
			documentsBySlug: {},
			publicationUri: standardSitePublicationUri,
		};
	}

	let parsed: unknown;

	try {
		parsed = JSON.parse(readFileSync(manifestPath, 'utf8'));
	} catch (error) {
		throw new Error(`Record Manifest artifact is malformed: ${manifestPath}`, {
			cause: error,
		});
	}

	const result = StandardSiteManifestSchema.safeParse(parsed);

	if (!result.success) {
		throw new Error(`Record Manifest artifact is malformed: ${manifestPath}`, {
			cause: result.error,
		});
	}

	return result.data;
}

export function getStandardSiteDocumentUri(
	slug: string,
	options?: ManifestOptions,
) {
	return loadStandardSiteManifest(options).documentsBySlug[slug];
}
