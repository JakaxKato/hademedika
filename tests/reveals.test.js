import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initScrollReveals } from '../assets/js/reveals.js';

function target(top, children = []) {
  const classes = new Set();
  return {
    classList: {
      add: name => classes.add(name),
      remove: name => classes.delete(name),
      contains: name => classes.has(name),
    },
    contains(node) { return node === this || children.includes(node); },
    getBoundingClientRect: () => ({ top }),
  };
}

function eventSource() {
  const listeners = new Map();
  return {
    addEventListener(type, callback) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(callback);
    },
    removeEventListener(type, callback) { listeners.get(type)?.delete(callback); },
    emit(type, event) { listeners.get(type)?.forEach(callback => callback(event)); },
  };
}

function browser(targets, { reduced = false, supported = true, activeElement = null, failObserve = false } = {}) {
  const motion = Object.assign(eventSource(), { matches: reduced });
  const doc = Object.assign(eventSource(), { activeElement, querySelectorAll: () => targets });
  const observers = [];
  class Observer {
    constructor(callback) {
      this.callback = callback;
      this.observed = new Set();
      this.disconnected = false;
      observers.push(this);
    }
    observe(node) {
      if (failObserve) throw new Error('Observer unavailable');
      this.observed.add(node);
    }
    unobserve(node) { this.observed.delete(node); }
    disconnect() {
      this.disconnected = true;
      this.observed.clear();
    }
  }
  const view = {
    innerHeight: 800,
    matchMedia: () => motion,
    IntersectionObserver: supported ? Observer : undefined,
  };
  return {
    doc, view, motion, observers,
    init() { initScrollReveals(doc, view); },
    focus(node) {
      doc.activeElement = node;
      doc.emit('focusin', { target: node });
    },
    intersect(node, isIntersecting = true) {
      observers[0].callback([{ target: node, isIntersecting }]);
    },
    reduceMotion() {
      motion.matches = true;
      motion.emit('change', { matches: true });
    },
  };
}

function assertImmediatelyVisible(node) {
  assert.equal(node.classList.contains('is-visible'), true);
  assert.equal(node.classList.contains('reveal-ready'), false);
}

test('above-fold and already-passed targets are never initially hidden', () => {
  const above = target(-300);
  const visible = target(100);
  const partiallyVisible = target(799);
  const below = target(1000);
  const page = browser([above, visible, partiallyVisible, below]);
  page.init();
  [above, visible, partiallyVisible].forEach(assertImmediatelyVisible);
  assert.equal(below.classList.contains('reveal-ready'), true);
  assert.equal(below.classList.contains('is-visible'), false);
  assert.deepEqual([...page.observers[0].observed], [below]);
});

test('a target containing initial keyboard focus is not hidden even below the fold', () => {
  const button = {};
  const card = target(1000, [button]);
  const page = browser([card], { activeElement: button });
  page.init();
  assertImmediatelyVisible(card);
  assert.equal(page.observers[0].observed.size, 0);
});

test('focus reveals a below-fold doctor card immediately, before the observer runs', () => {
  const button = {};
  const card = target(1000, [button]);
  const page = browser([card]);
  page.init();
  assert.equal(card.classList.contains('reveal-ready'), true);
  page.focus(button);
  assertImmediatelyVisible(card);
  assert.equal(page.observers[0].observed.has(card), false);
});

test('focus reveals every animated ancestor, not just the nearest card', () => {
  const button = {};
  const wrapper = target(1000, [button]);
  const card = target(1100, [button]);
  const unrelated = target(2000);
  const page = browser([wrapper, card, unrelated]);
  page.init();
  page.focus(button);
  [wrapper, card].forEach(assertImmediatelyVisible);
  assert.equal(unrelated.classList.contains('reveal-ready'), true);
  assert.equal(unrelated.classList.contains('is-visible'), false);
});

test('focus on a reveal target itself also bypasses the animation', () => {
  const card = target(1000);
  const page = browser([card]);
  page.init();
  page.focus(card);
  assertImmediatelyVisible(card);
});

test('intersection reveals remain one-shot and do not reveal unrelated targets', () => {
  const card = target(1000);
  const other = target(2000);
  const page = browser([card, other]);
  page.init();
  page.intersect(card, false);
  assert.equal(card.classList.contains('is-visible'), false);
  page.intersect(card);
  assert.equal(card.classList.contains('is-visible'), true);
  assert.equal(card.classList.contains('reveal-ready'), true);
  assert.equal(page.observers[0].observed.has(card), false);
  assert.equal(page.observers[0].observed.has(other), true);
  assert.equal(other.classList.contains('is-visible'), false);
  // A later keyboard visit also cancels any remaining reveal transition.
  page.focus(card);
  assertImmediatelyVisible(card);
});

test('reduced-motion users get no hiding classes or observers', () => {
  const card = target(1000);
  const page = browser([card], { reduced: true });
  page.init();
  assert.equal(card.classList.contains('reveal-ready'), false);
  assert.equal(page.observers.length, 0);
});

test('unsupported IntersectionObserver leaves content naturally visible', () => {
  const card = target(1000);
  const page = browser([card], { supported: false });
  page.init();
  assert.equal(card.classList.contains('reveal-ready'), false);
  assert.equal(page.observers.length, 0);
});

test('enabling reduced motion makes every pending target visible without transitions', () => {
  const cards = [target(1000), target(2000)];
  const page = browser(cards);
  page.init();
  page.reduceMotion();
  cards.forEach(assertImmediatelyVisible);
  assert.equal(page.observers[0].disconnected, true);
});

test('observer setup failure cannot leave any content hidden', () => {
  const cards = [target(1000), target(2000)];
  const page = browser(cards, { failObserve: true });
  assert.doesNotThrow(() => page.init());
  cards.forEach(assertImmediatelyVisible);
  assert.equal(page.observers[0].disconnected, true);
});
