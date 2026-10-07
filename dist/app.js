"use strict";
const envelope = document.getElementById('envelope');
const closed = document.getElementById('closed');
const greeting = document.getElementById('greeting');
const stage = document.getElementById('stage');
const intro = document.getElementById('intro');
const nextPage = document.getElementById('next-page');
const title = document.getElementById('title');
const typed = document.getElementById('typed');
const nextLink = document.getElementById('next-link');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const animations = new Set();
let opening = false;
let opened = false;
let run = 0;

// Reserve the full line before typing so the layout never jumps.
const glyphs = Array.from(typed.textContent, character => {
  const span = document.createElement('span');
  span.className = 'glyph';
  span.textContent = character;
  return span;
});
typed.replaceChildren(...glyphs);

function cancelAnimations() {
  for (const animation of animations) animation.cancel();
  animations.clear();
}
function finishText() {
  for (const glyph of glyphs) glyph.classList.add('shown');
  nextLink.classList.remove('pending');
  nextLink.removeAttribute('tabindex');
}
function revealLetter() {
  opening = false;
  opened = true;
  stage.classList.add('is-open');
  greeting.inert = false;
  greeting.setAttribute('aria-hidden', 'false');
  closed.inert = true;
  closed.setAttribute('aria-hidden', 'true');
  envelope.disabled = true;
  envelope.setAttribute('aria-expanded', 'true');
  cancelAnimations();
}
function showLetter(focus = false) {
  run++;
  revealLetter();
  finishText();
  if (focus && !document.hidden && location.hash !== '#next') title.focus({ preventScroll: true });
}
function animate(element, keyframes, duration, easing = 'cubic-bezier(.22, 1, .36, 1)') {
  const animation = element.animate(keyframes, { duration, easing, fill: 'forwards' });
  animations.add(animation);
  return animation.finished.catch(() => {});
}
async function typeGreeting(current) {
  for (const glyph of glyphs) {
    if (run !== current) return;
    glyph.classList.add('shown');
    await new Promise(resolve => setTimeout(resolve, 65));
  }
  if (run === current) finishText();
}
envelope.addEventListener('click', async () => {
  if (opening || opened) return;
  opening = true;
  const current = ++run;
  envelope.disabled = true;
  envelope.setAttribute('aria-expanded', 'true');
  if (motion.matches || typeof envelope.animate !== 'function') {
    showLetter(true);
    return;
  }
  try {
    const seal = envelope.querySelector('.seal');
    const flap = envelope.querySelector('.flap');
    const paper = envelope.querySelector('.paper');
    animate(closed.querySelector('.hint'), [{ opacity: 1 }, { opacity: 0 }], 180);
    await animate(seal, [{ opacity: 1 }, { opacity: 0 }], 180);
    if (run !== current) return;
    await animate(flap, [{ transform: 'rotateX(0deg)' }, { transform: 'rotateX(-180deg)' }], 620, 'cubic-bezier(.45, 0, .2, 1)');
    if (run !== current) return;
    flap.style.zIndex = '1';
    await animate(paper, [{ transform: 'translateY(0)' }, { transform: 'translateY(-78px)' }], 420);
    if (run !== current) return;
    await Promise.all([
      animate(closed, [{ opacity: 1 }, { opacity: 0 }], 420),
      animate(greeting, [{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'translateY(0)' }], 500)
    ]);
    if (run !== current) return;
    revealLetter();
    if (!document.hidden) title.focus({ preventScroll: true });
    await typeGreeting(current);
  } catch {
    if (run === current) showLetter(true);
  }
});
motion.addEventListener('change', () => {
  if (motion.matches && (opening || opened)) showLetter(location.hash !== '#next');
});
const main = document.querySelector('main');
const board = document.getElementById('cork-board');
const photoDialog = document.getElementById('photo-dialog');
const fullPhoto = document.getElementById('full-photo');
const photoClose = document.getElementById('photo-close');
const viewAnimations = new Set();
let routeRun = 0;
let photoOpener = null;

function cancelViewAnimations() {
  for (const animation of viewAnimations) animation.cancel();
  viewAnimations.clear();
}

function animateView(element, frames, duration) {
  const animation = element.animate(frames, {
    duration, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'both'
  });
  viewAnimations.add(animation);
  return animation.finished.catch(() => {});
}

function switchView(isNext) {
  intro.hidden = isNext;
  nextPage.hidden = !isNext;
  intro.inert = false;
  nextPage.inert = false;
  main.classList.toggle('board-screen', isNext);
  board.classList.toggle('reveal', isNext);
}

function focusView(isNext) {
  const target = isNext ? document.getElementById('next-title') : opened ? title : envelope;
  target.focus({ preventScroll: true });
}

async function route(event) {
  const isNext = location.hash === '#next';
  const destination = isNext ? nextPage : intro;
  const previous = intro.hidden ? nextPage : intro;
  const current = ++routeRun;
  cancelViewAnimations();
  if (photoDialog.open) photoDialog.close();
  if (isNext || location.hash === '#letter') showLetter();
  document.title = isNext ? 'С др, друн · Витя' : 'Витя, с днём рождения';
  if (!event || previous === destination || motion.matches || typeof destination.animate !== 'function') {
    switchView(isNext);
    main.classList.remove('is-transitioning');
    if (event) {
      window.scrollTo(0, 0);
      focusView(isNext);
    }
    return;
  }
  main.classList.add('is-transitioning');
  previous.inert = true;
  try {
    await animateView(previous, [
      { opacity: 1, transform: 'translateY(0) scale(1)', filter: 'blur(0)' },
      { opacity: 0, transform: 'translateY(-12px) scale(.985)', filter: 'blur(4px)' }
    ], 180);
    if (routeRun !== current) return;
    cancelViewAnimations();
    switchView(isNext);
    window.scrollTo(0, 0);
    destination.inert = true;
    await animateView(destination, [
      { opacity: 0, transform: 'translateY(16px) scale(.99)', filter: 'blur(3px)' },
      { opacity: 1, transform: 'translateY(0) scale(1)', filter: 'blur(0)' }
    ], 360);
  } catch {
    // Finish the requested navigation even if a browser rejects an effect.
  } finally {
    if (routeRun === current) {
      cancelViewAnimations();
      switchView(isNext);
      main.classList.remove('is-transitioning');
      focusView(isNext);
    }
  }
}

document.querySelectorAll('.photo-card').forEach(button => {
  button.addEventListener('click', () => {
    const image = button.querySelector('img');
    if (typeof photoDialog.showModal !== 'function') {
      window.open(button.dataset.photo, '_blank', 'noopener');
      return;
    }
    fullPhoto.src = button.dataset.photo;
    fullPhoto.alt = image.alt;
    photoOpener = button;
    document.body.classList.add('photo-open');
    photoDialog.showModal();
    photoClose.focus({ preventScroll: true });
  });
});
photoClose.addEventListener('click', () => photoDialog.close());
photoDialog.addEventListener('click', event => {
  if (event.target !== photoDialog) return;
  const bounds = photoDialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) photoDialog.close();
});
photoDialog.addEventListener('close', () => {
  document.body.classList.remove('photo-open');
  if (!nextPage.hidden && photoOpener) photoOpener.focus({ preventScroll: true });
  photoOpener = null;
});
motion.addEventListener('change', () => {
  if (motion.matches && viewAnimations.size) route();
});
window.addEventListener('hashchange', route);
route();
