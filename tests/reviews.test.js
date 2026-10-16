import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PATIENT_REVIEWS } from '../assets/js/clinic-data.js';
import { renderPatientReviews, validatePatientReview } from '../assets/js/reviews.js';

// Synthetic test fixtures only; production PATIENT_REVIEWS stays empty.
const fixture = {
  name: 'Test Author', quote: 'Test-only quote',
  sourceUrl: 'https://example.invalid/reviews/1', approved: true,
};

function documentFixture({ missingContainer = false } = {}) {
  const sourceNote = { textContent: 'No approved source-linked reviews yet.' };
  const container = {
    children: [sourceNote], replacements: 0,
    replaceChildren(...children) {
      this.children = children;
      this.replacements += 1;
    },
  };
  const doc = {
    getElementById(id) {
      assert.equal(id, 'patient-reviews');
      return missingContainer ? null : container;
    },
    createElement(tag) {
      return {
        tagName: tag.toUpperCase(), children: [],
        append(...children) { this.children.push(...children); },
        set innerHTML(_) { throw new Error('Review text must not be interpreted as HTML'); },
      };
    },
  };
  return { doc, container, sourceNote };
}

test('production reviews are empty and preserve the existing honest source note', () => {
  assert.deepEqual(PATIENT_REVIEWS, []);
  const { doc, container, sourceNote } = documentFixture();
  renderPatientReviews(doc);
  assert.equal(container.replacements, 0);
  assert.deepEqual(container.children, [sourceNote]);
});

test('review validation trims text, normalizes the URL, and does not mutate the entry', () => {
  const input = { ...fixture, name: ' Test Author ', quote: ' Test-only quote ', sourceUrl: ' HTTPS://EXAMPLE.INVALID/reviews/1 ' };
  const original = { ...input };
  assert.deepEqual(validatePatientReview(input), fixture);
  assert.deepEqual(input, original);
});

test('review validation requires explicit boolean approval', () => {
  for (const approved of [undefined, null, false, 0, 1, 'true']) {
    assert.equal(validatePatientReview({ ...fixture, approved }), null);
  }
});

test('review validation rejects malformed entries and blank or non-string required fields', () => {
  for (const entry of [undefined, null, [], true, 1, 'review']) {
    assert.equal(validatePatientReview(entry), null);
  }
  for (const field of ['name', 'quote', 'sourceUrl']) {
    for (const value of [undefined, null, '', ' \n ', 42, {}]) {
      assert.equal(validatePatientReview({ ...fixture, [field]: value }), null);
    }
  }
});

test('review sources must be absolute HTTP(S) URLs, without credentials', () => {
  for (const sourceUrl of [
    'javascript:alert(1)', 'data:text/html,review', 'file:///review', 'ftp://example.invalid/review',
    '//example.invalid/review', '/review', 'example.invalid/review', 'https:example.invalid/review',
    'https://', 'https://[invalid', 'https://?review=1',
    'https://user:password@example.invalid/review',
  ]) {
    assert.equal(validatePatientReview({ ...fixture, sourceUrl }), null, sourceUrl);
  }
  for (const sourceUrl of ['http://example.invalid/review', 'https://example.invalid/review?a=1&b=2#source']) {
    assert.equal(validatePatientReview({ ...fixture, sourceUrl }).sourceUrl, sourceUrl);
  }
});

test('unconfigured, invalid, or unapproved entries never replace the source note', () => {
  for (const entries of [[], null, {}, [null], [{ ...fixture, approved: false }], [{ ...fixture, sourceUrl: 'javascript:alert(1)' }]]) {
    const { doc, container, sourceNote } = documentFixture();
    renderPatientReviews(doc, entries);
    assert.equal(container.replacements, 0);
    assert.deepEqual(container.children, [sourceNote]);
  }
});

test('review rendering is safe when the optional container does not exist', () => {
  const { doc } = documentFixture({ missingContainer: true });
  assert.doesNotThrow(() => renderPatientReviews(doc, [fixture]));
});

test('multiple valid reviews render in configured order, skipping invalid entries', () => {
  const second = { ...fixture, name: 'Second Test Author', quote: 'Second test-only quote', sourceUrl: 'https://example.invalid/reviews/2' };
  const { doc, container } = documentFixture();
  renderPatientReviews(doc, [fixture, { ...fixture, approved: false }, null, second]);
  assert.equal(container.replacements, 1);
  assert.equal(container.children.length, 2);
  assert.deepEqual(container.children.map(card => card.children[1].textContent), [fixture.name, second.name]);
  assert.deepEqual(container.children.map(card => card.children[0].textContent), [fixture.quote, second.quote]);
});

test('review cards use the exact semantic/style contract and secure source links without ratings', () => {
  const { doc, container } = documentFixture();
  renderPatientReviews(doc, [{ ...fixture, rating: 5, stars: 5 }]);
  const [card] = container.children;
  assert.equal(card.tagName, 'ARTICLE');
  assert.equal(card.className, 'review-card');
  assert.deepEqual(card.children.map(child => child.tagName), ['BLOCKQUOTE', 'P', 'A']);
  const [quote, author, source] = card.children;
  assert.equal(quote.className, 'review-quote font-headline');
  assert.equal(quote.textContent, fixture.quote);
  assert.equal(quote.cite, fixture.sourceUrl);
  assert.equal(author.className, 'review-author');
  assert.equal(author.textContent, fixture.name);
  assert.equal(source.className, 'review-source');
  assert.equal(source.textContent, 'Lihat sumber');
  assert.equal(source.href, fixture.sourceUrl);
  assert.equal(source.target, '_blank');
  assert.equal(source.rel, 'noopener noreferrer');
});

test('names and quotes containing markup stay literal text, never HTML', () => {
  const review = { ...fixture, name: '<img src=x onerror=alert(1)>', quote: '<script>alert(1)</script> & text' };
  const { doc, container } = documentFixture();
  renderPatientReviews(doc, [review]);
  const [quote, author] = container.children[0].children;
  assert.equal(quote.textContent, review.quote);
  assert.equal(author.textContent, review.name);
});
