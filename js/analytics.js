/*
 * DSSS — lightweight, cookie-free analytics wrapper.
 * Stores minimal session counters in memory and forwards events
 * to Plausible or Google Analytics (gtag) when configured.
 */
(function () {
  'use strict';

  var SESSION_LIMIT = 50;
  var counts = Object.create(null);
  var events = [];

  function sanitizeProps(props) {
    if (!props || typeof props !== 'object') return {};
    var clean = {};
    var keys = Object.keys(props);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var val = props[key];
      if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
        clean[key] = val;
      }
    }
    return clean;
  }

  function track(eventName, props) {
    if (typeof eventName !== 'string' || !eventName) return;

    var safeProps = sanitizeProps(props);
    counts[eventName] = (counts[eventName] || 0) + 1;

    if (events.length >= SESSION_LIMIT) {
      events.shift();
    }
    events.push({
      name: eventName,
      props: safeProps,
      timestamp: Date.now()
    });

    if (typeof window.plausible === 'function') {
      try {
        window.plausible(eventName, { props: safeProps });
      } catch (e) {
        // Ignore third-party analytics runtime errors
      }
    }

    if (typeof window.gtag === 'function') {
      try {
        window.gtag('event', eventName, safeProps);
      } catch (e) {
        // Ignore third-party analytics runtime errors
      }
    }
  }

  function getSessionStats() {
    var summary = {};
    var keys = Object.keys(counts);
    for (var i = 0; i < keys.length; i++) {
      summary[keys[i]] = counts[keys[i]];
    }
    return {
      counts: summary,
      recent: events.slice()
    };
  }

  window.DSSS = window.DSSS || {};
  window.DSSS.analytics = {
    track: track,
    getSessionStats: getSessionStats
  };
})();
