export function initScrollReveals(doc = document, view = window) {
  const motion = view.matchMedia('(prefers-reduced-motion: reduce)');
  if (motion.matches || typeof view.IntersectionObserver !== 'function') return;
  const targets = [...doc.querySelectorAll('section h2, .doctor-card, section .hover-lift, [data-reveal]')];
  let observer;

  const reveal = (target, immediate = false) => {
    // Removing the animation hook makes focused content visible without a fade.
    if (immediate) target.classList.remove('reveal-ready');
    target.classList.add('is-visible');
    observer?.unobserve(target);
  };
  const onFocus = event => {
    targets.forEach(target => {
      if (target.contains(event.target)) reveal(target, true);
    });
  };

  try {
    observer = new view.IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) reveal(entry.target);
      });
    }, { threshold: 0.08 });
    doc.addEventListener('focusin', onFocus);
    targets.forEach(target => {
      // Do not flash-hide content already in view, above it, or holding focus.
      if (target.getBoundingClientRect().top < view.innerHeight || target.contains(doc.activeElement)) {
        reveal(target, true);
      } else {
        observer.observe(target);
        target.classList.add('reveal-ready');
      }
    });
    motion.addEventListener('change', event => {
      if (!event.matches) return;
      observer.disconnect();
      targets.forEach(target => reveal(target, true));
      doc.removeEventListener('focusin', onFocus);
    });
  } catch {
    observer?.disconnect();
    targets.forEach(target => reveal(target, true));
    doc.removeEventListener('focusin', onFocus);
  }
}
