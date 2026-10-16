import { PATIENT_REVIEWS } from './clinic-data.js';

/** Return a normalized, approved source-linked review, or null. */
export function validatePatientReview(entry) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry) || entry.approved !== true) return null;
  if (['name', 'quote', 'sourceUrl'].some(field => typeof entry[field] !== 'string' || !entry[field].trim())) return null;

  const source = entry.sourceUrl.trim();
  if (!/^https?:\/\//i.test(source)) return null;
  let url;
  try {
    url = new URL(source);
  } catch {
    return null;
  }
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) return null;
  return {
    name: entry.name.trim(), quote: entry.quote.trim(), sourceUrl: url.href, approved: true,
  };
}

export function renderPatientReviews(doc = document, entries = PATIENT_REVIEWS) {
  const container = doc.getElementById('patient-reviews');
  if (!container || !Array.isArray(entries)) return;
  const reviews = entries.map(validatePatientReview).filter(Boolean);
  // Preserve the honest HTML source note unless publishable reviews exist.
  if (!reviews.length) return;

  const cards = reviews.map(review => {
    const article = doc.createElement('article');
    article.className = 'review-card';
    const quote = doc.createElement('blockquote');
    quote.className = 'review-quote font-headline';
    quote.textContent = review.quote;
    quote.cite = review.sourceUrl;
    const author = doc.createElement('p');
    author.className = 'review-author';
    author.textContent = review.name;
    const source = doc.createElement('a');
    source.className = 'review-source';
    source.href = review.sourceUrl;
    source.target = '_blank';
    source.rel = 'noopener noreferrer';
    source.textContent = 'Lihat sumber';
    article.append(quote, author, source);
    return article;
  });
  container.replaceChildren(...cards);
}
