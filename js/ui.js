(function () {
  'use strict';

  var tagsEl = document.querySelector('.tags');
  var listEl = document.querySelector('.list');
  if (!tagsEl || !listEl) return;

  var buttons = Array.prototype.slice.call(tagsEl.querySelectorAll('button'));
  var cards = Array.prototype.slice.call(listEl.querySelectorAll('.card'));
  var ALL = 'Vse';

  function matches(card, tag) {
    if (tag === ALL) return true;
    var tags = (card.getAttribute('data-tags') || '').split(/\s+/);
    return tags.indexOf(tag) !== -1;
  }

  function select(selected) {
    var tag = selected.textContent.trim();
    buttons.forEach(function (btn) {
      var on = btn === selected;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    cards.forEach(function (card) {
      card.classList.toggle('is-hidden', !matches(card, tag));
    });
  }

  // The list is display:none on narrow screens; preload="none" + no autoplay
  // means hidden videos never download. Play only when the list is visible.
  var videos = Array.prototype.slice.call(listEl.querySelectorAll('video'));
  var narrow = window.matchMedia('(max-width: 760px)');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  function listen(query) {
    if (query.addEventListener) query.addEventListener('change', syncVideos);
    else query.addListener(syncVideos);
  }

  function syncVideos() {
    videos.forEach(function (video) {
      if (narrow.matches || reduced.matches) {
        video.pause();
        return;
      }
      // Autoplay can be refused; the poster stays visible then.
      var played = video.play();
      if (played) played.catch(function () {});
    });
  }

  syncVideos();
  listen(narrow);
  listen(reduced);

  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () { select(btn); });
  });
})();
