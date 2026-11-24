/**
 * View-transition names apply only inside `data-vt-active`, which detail
 * pages set in markup. Activate the clicked card when opening a page and
 * the card matching the previous page when returning to a list.
 */

const ACTIVE = 'data-vt-active';
const TITLE = `[${ACTIVE}] [data-vt-part='title']`;

const MIN_DURATION = 300;
const MAX_DURATION = 500;
const BASE_DURATION = 260;
const MS_PER_PIXEL = 0.35;

let outgoingTitleSize: number | undefined;

function activateCard(root: ParentNode, card: Element | null | undefined) {
	for (const stale of root.querySelectorAll(`[data-vt-card][${ACTIVE}]`)) {
		stale.removeAttribute(ACTIVE);
	}
	card?.setAttribute(ACTIVE, '');
}

function titleFontSize(): number | undefined {
	const title = document.querySelector(TITLE);
	return title
		? Number.parseFloat(getComputedStyle(title).fontSize)
		: undefined;
}

function translationOf(transform: unknown) {
	if (typeof transform !== 'string') return { x: 0, y: 0 };
	try {
		const matrix = new DOMMatrixReadOnly(transform);
		return { x: matrix.m41, y: matrix.m42 };
	} catch {
		return { x: 0, y: 0 };
	}
}

/** Distance a view-transition group animation moves its snapshot, in px. */
function distanceOf(animation: Animation) {
	if (!(animation.effect instanceof KeyframeEffect)) return 0;
	const keyframes = animation.effect.getKeyframes();
	const from = translationOf(keyframes[0]?.transform);
	const to = translationOf(keyframes.at(-1)?.transform);
	return Math.hypot(to.x - from.x, to.y - from.y);
}

function pseudoElementOf(animation: Animation) {
	return animation.effect instanceof KeyframeEffect
		? (animation.effect.pseudoElement ?? '')
		: '';
}

/**
 * Use the longest travel distance to set one duration for all shared groups
 * and title scaling, keeping position and size in sync.
 */
function paceSharedElements() {
	const animations = document.getAnimations();
	const groups = animations.filter((animation) =>
		pseudoElementOf(animation).startsWith('::view-transition-group(shared-'),
	);
	if (groups.length === 0) return;

	const distance = Math.max(...groups.map(distanceOf));
	const duration = Math.min(
		MAX_DURATION,
		Math.max(MIN_DURATION, BASE_DURATION + distance * MS_PER_PIXEL),
	);

	const titleScaling = animations.filter(
		(animation) =>
			animation instanceof CSSAnimation &&
			animation.animationName.startsWith('shared-title-scale'),
	);
	for (const animation of [...groups, ...titleScaling]) {
		animation.effect?.updateTiming({ duration });
	}
}

document.addEventListener('astro:before-preparation', (event) => {
	const card = event.sourceElement?.closest('[data-vt-card]');
	const opensThisCard =
		card?.getAttribute('data-vt-card') === event.to.pathname;
	activateCard(document, opensThisCard ? card : null);
	outgoingTitleSize = titleFontSize();
});

document.addEventListener('astro:before-swap', (event) => {
	const card = event.newDocument.querySelector(
		`[data-vt-card="${CSS.escape(event.from.pathname)}"]`,
	);
	activateCard(event.newDocument, card);
	event.viewTransition.ready.then(paceSharedElements, () => {});
});

document.addEventListener('astro:after-swap', () => {
	// Measure the incoming title after Astro swaps the DOM and replaces <html>'s attributes.
	const incomingTitleSize = titleFontSize();
	const root = document.documentElement;
	if (outgoingTitleSize && incomingTitleSize) {
		root.style.setProperty(
			'--vt-title-scale',
			String(incomingTitleSize / outgoingTitleSize),
		);
	} else {
		root.style.removeProperty('--vt-title-scale');
	}
	outgoingTitleSize = undefined;
});
