(function () {
  'use strict';

  var INDEX_URL = '/assets/search-index.json';
  var indexCache = null;

  function loadIndex() {
    if (indexCache) return Promise.resolve(indexCache);
    return fetch(INDEX_URL)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        indexCache = data;
        return data;
      })
      .catch(function () {
        indexCache = [];
        return indexCache;
      });
  }

  function normalize(str) {
    return (str || '').toLowerCase().replace(/ё/g, 'е').trim();
  }

  function searchItems(query, items) {
    var words = normalize(query).split(/\s+/).filter(Boolean);
    if (!words.length) return [];

    return items.filter(function (item) {
      var haystack = normalize(item.title + ' ' + (item.keywords || ''));
      return words.every(function (word) { return haystack.indexOf(word) !== -1; });
    });
  }

  function ensureOverlay() {
    var overlay = document.getElementById('baza-site-search');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'baza-site-search';
    overlay.className = 'baza-site-search';
    overlay.innerHTML =
      '<div class="baza-site-search__backdrop" data-close></div>' +
      '<div class="baza-site-search__panel" role="dialog" aria-modal="true" aria-label="Поиск по сайту">' +
        '<button type="button" class="baza-site-search__close" aria-label="Закрыть">&times;</button>' +
        '<form class="baza-site-search__form">' +
          '<input type="search" class="baza-site-search__input" placeholder="Поиск по сайту…" autocomplete="off" aria-label="Поиск">' +
        '</form>' +
        '<ul class="baza-site-search__results"></ul>' +
      '</div>';

    document.body.appendChild(overlay);

    var input = overlay.querySelector('.baza-site-search__input');
    var results = overlay.querySelector('.baza-site-search__results');

    function close() {
      overlay.classList.remove('is-open');
      document.body.classList.remove('baza-site-search-open');
      input.value = '';
      results.innerHTML = '';
    }

    function open() {
      overlay.classList.add('is-open');
      document.body.classList.add('baza-site-search-open');
      input.focus();
    }

    function render(query) {
      loadIndex().then(function (items) {
        var matches = searchItems(query, items);
        results.innerHTML = '';

        if (!normalize(query)) return;

        if (!matches.length) {
          results.innerHTML = '<li class="baza-site-search__empty">Ничего не найдено</li>';
          return;
        }

        matches.slice(0, 12).forEach(function (item) {
          var li = document.createElement('li');
          var a = document.createElement('a');
          a.href = item.url;
          a.textContent = item.title;
          li.appendChild(a);
          results.appendChild(li);
        });
      });
    }

    overlay.querySelector('[data-close]').addEventListener('click', close);
    overlay.querySelector('.baza-site-search__close').addEventListener('click', close);

    overlay.querySelector('.baza-site-search__form').addEventListener('submit', function (e) {
      e.preventDefault();
      var first = results.querySelector('a');
      if (first) window.location.href = first.href;
    });

    input.addEventListener('input', function () {
      render(input.value);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('is-open')) close();
    });

    overlay._bazaOpen = open;
    overlay._bazaClose = close;
    return overlay;
  }

  function bindSearchButtons() {
    document.querySelectorAll('.header-search').forEach(function (btn) {
      if (btn.dataset.bazaSearchBound) return;
      btn.dataset.bazaSearchBound = '1';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        var overlay = ensureOverlay();
        if (overlay.classList.contains('is-open')) {
          overlay._bazaClose();
        } else {
          overlay._bazaOpen();
        }
      }, true);
    });
  }

  function fixGalleryZoomIcon() {
    document.querySelectorAll('.woocommerce-product-gallery__trigger').forEach(function (trigger) {
      var span = trigger.querySelector('span[aria-hidden="true"]');
      if (!span) {
        span = document.createElement('span');
        span.setAttribute('aria-hidden', 'true');
        trigger.appendChild(span);
      }
      if (span.textContent !== '🔍') {
        span.textContent = '🔍';
      }
    });
  }

  function init() {
    bindSearchButtons();
    fixGalleryZoomIcon();

    var gallery = document.querySelector('.woocommerce-product-gallery');
    if (gallery && typeof MutationObserver !== 'undefined') {
      var observer = new MutationObserver(function () {
        observer.disconnect();
        fixGalleryZoomIcon();
        observer.observe(gallery, { childList: true, subtree: true });
      });
      observer.observe(gallery, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
