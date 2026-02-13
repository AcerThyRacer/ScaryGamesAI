/* ============================================
   ScaryGamesAI — Image Optimizer Runtime Pattern
   Phase 1.1: AVIF/WebP fallback + lazy defaults
   ============================================ */

(function () {
  function applyLazyDefaults(root) {
    const imgs = root.querySelectorAll('img');
    imgs.forEach((img) => {
      if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
      if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
      if (!img.hasAttribute('fetchpriority')) img.setAttribute('fetchpriority', 'low');
    });
  }

  function wireModernPicturePattern(root) {
    const targets = root.querySelectorAll('img[data-img-base]');

    targets.forEach((img) => {
      if (img.closest('picture')) return;

      const base = img.getAttribute('data-img-base');
      const fallbackExt = img.getAttribute('data-fallback-ext') || 'png';
      const fallbackSrc = `${base}.${fallbackExt}`;

      const picture = document.createElement('picture');

      const avif = document.createElement('source');
      avif.type = 'image/avif';
      avif.srcset = `${base}.avif`;

      const webp = document.createElement('source');
      webp.type = 'image/webp';
      webp.srcset = `${base}.webp`;

      img.src = img.getAttribute('src') || fallbackSrc;

      img.parentNode.insertBefore(picture, img);
      picture.appendChild(avif);
      picture.appendChild(webp);
      picture.appendChild(img);
    });
  }

  function init() {
    applyLazyDefaults(document);
    wireModernPicturePattern(document);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
