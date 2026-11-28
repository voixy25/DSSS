/*
 * DSSS — interactive UI controller.
 * Handles mobile drawer, 3D motion toggle, project filtering & JSON sync,
 * desktop-only hover video for Dimet, case-study & privacy dialogs,
 * service pre-fill, email copy, and AJAX contact form with anti-spam.
 */
(function () {
  'use strict';

  var CONTACT_EMAIL = 'info@skomina.si';
  var FORMSUBMIT_ENDPOINT = 'https://formsubmit.co/ajax/42d51ea038188ae0320032b465d14834';
  var MIN_SUBMIT_MS = 2000;
  var formLoadedAt = Date.now();

  var DEFAULT_PROJECTS = {
    'vina-skomina': {
      id: 'vina-skomina',
      title: 'Vina Skomina',
      kicker: 'VINARSTVO',
      domain: 'vina.skomina.si',
      url: 'https://vina.skomina.si',
      github: 'https://github.com/Voixy25/VinaSkomina',
      image: 'media/vina.jpg',
      imageWebp: 'media/vina.webp',
      imageAlt: 'Predogled spletne strani Vina Skomina: degustacije vin v Vipavski dolini',
      tags: ['Splet', 'Optimizacija', 'Interaktivna grafika'],
      tech: ['HTML5 / CSS3', 'Vanilla JS', 'Leaflet', 'SVG animacije', 'SL / EN / IT', 'Schema.org'],
      challenge: 'Družinska vinska klet je potrebovala pregledno trojezično predstavitev vin in degustacij s prikazom vinogradov ter enostavnim povpraševanjem brez zapletenih rezervacijskih sistemov ali počasnih večstranskih predlog.',
      solution: 'Zgrajen je bil lahek statični splet brez zunanjih ogrodij: preklapljanje med slovenščino, angleščino in italijanščino s hreflang vstopnimi stranmi, animirana SVG trta ob drsenju, zakasnjena inicializacija zemljevida Leaflet prek IntersectionObserverja in koledar za rezervacije z zanesljivim e-poštnim nadomestilom.',
      result: 'Enotna statična stran z WebP slikami, prednostnim nalaganjem hero fotografije in neposredno oddajo povpraševanj za degustacije ter nakup vina brez vzdrževanja zalednega strežnika.',
      deliverables: [
        'Trojezična izvedba (SL / EN / IT) s hreflang vstopnimi stranmi',
        'Animirana SVG trta ob drsenju in zakasnjena inicializacija zemljevida Leaflet',
        'Koledar ter obrazec za povpraševanja glede degustacij z e-poštnim nadomestilom',
        'Optimizirane WebP fotografije in prednostno nalaganje hero slike'
      ]
    },
    'dimet': {
      id: 'dimet',
      title: 'Dimet d.o.o.',
      kicker: 'STORITVE & KATALOG',
      domain: 'dimet.skomina.si',
      url: 'https://dimet.skomina.si',
      github: 'https://github.com/Voixy25/Dimet',
      image: 'media/dimet.jpg',
      imageWebp: 'media/dimet.webp',
      imageAlt: 'Predogled statične različice kataloga Dimet: industrijska guma, cevi in pnevmatike',
      hoverVideo: 'media/dimet.mp4',
      tags: ['Splet', 'Optimizacija'],
      tech: ['Python SSG', 'Tailwind CSS', 'Vanilla JS', 'JSON', 'SEO & CLS'],
      challenge: 'Trgovina dimet.si na WordPressu in WooCommercu je odvisna od vtičnikov, baze podatkov in vzdrževanja strežnika. Cilj statične različice je pregleden katalog izdelkov z neposrednim povpraševanjem brez teh odvisnosti.',
      solution: 'Vsebina 11 kategorij, 33 izdelkov in novic je bila prenesena v strukturiran JSON vir, iz katerega Python generator in Tailwind CSS sestavijo popolnoma statične strani s premerjenimi dimenzijami slik proti zamikom postavitve (CLS) in takojšnjim iskanjem po katalogu v brskalniku.',
      result: 'Statična različica na dimet.skomina.si deluje brez PHP-ja, baze podatkov in zunanjih JS ogrodij, z enim minimiziranim CSS paketom in hitrim filtriranjem po kategorijah. Spletno mesto dimet.si še teče na WordPressu.',
      deliverables: [
        'Prenos 11 kategorij, 33 izdelkov in novic iz WordPressa v strukturiran JSON',
        'Python SSG gradilni skript in en minimiziran Tailwind CSS paket',
        'Takojšnje iskanje in filtriranje po katalogu v brskalniku',
        'Premerjene dimenzije slik proti zamikom postavitve (CLS)'
      ]
    },
    'skomina-hub': {
      id: 'skomina-hub',
      title: 'Skomina Hub',
      kicker: 'OSEBNI HUB & WEBGL',
      domain: 'skomina.si',
      url: 'https://skomina.si',
      github: 'https://github.com/Voixy25/skomina-hub',
      image: 'media/hub.jpg',
      imageWebp: 'media/hub.webp',
      imageAlt: 'Predogled spletnega središča skomina.si z interaktivno 3D stekleno prizmo in lomom svetlobe',
      tags: ['Splet', 'Optimizacija', 'Interaktivna grafika'],
      tech: ['WebGL2', 'GLSL Shaders', '2D Optics', 'SL / EN', 'ES moduli'],
      challenge: 'Ustvariti prepoznavno osebno spletno vozlišče z realističnim lomom svetlobe skozi 3D prizmo, ki deluje gladko tudi na brskalnikih z različnimi grafičnimi omejitvami in brez težkih 3D paketov.',
      solution: 'Dvostopenjski grafični cevovod v čistih ES modulih, večinoma prenesen iz odprtokodnega vercel-labs/vgpu (MIT):2D spektralno sledenje žarkov čez 72 valovnih dolžin s Cauchyjevo disperzijo in WebGL2 senčilnik steklene prizme, opremljen s samodejnim preklopom na 2D platno, premorom animacije izven zaslona in dvojezičnim SL/EN vmesnikom.',
      result: 'Odzivna 3D optična izkušnja brez zunanjih JS odvisnosti, ki podpira upravljanje s kazalcem ali sledilno ploščico.',
      deliverables: [
        'Dvostopenjski WebGL2 / GLSL in Canvas 2D cevovod brez zunanjih JS knjižnic',
        '2D spektralno sledenje žarkov čez 72 valovnih dolžin s Cauchyjevo disperzijo',
        'Samodejni preklop na 2D platno in premor animacije izven zaslona',
        'Dvojezični SL/EN vmesnik'
      ]
    }
  };

  var projectsById = Object.create(null);
  Object.keys(DEFAULT_PROJECTS).forEach(function (key) {
    projectsById[key] = DEFAULT_PROJECTS[key];
  });

  function track(eventName, props) {
    if (window.DSSS && window.DSSS.analytics && typeof window.DSSS.analytics.track === 'function') {
      window.DSSS.analytics.track(eventName, props);
    }
  }

  function slugify(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /* ------------------------------------------------------------------
   * Mobile Navigation Drawer
   * ------------------------------------------------------------------ */
  function initMobileNav() {
    var toggle = document.getElementById('nav-toggle');
    var drawer = document.getElementById('mobile-nav');
    var header = document.getElementById('site-header');
    if (!toggle || !drawer) return;

    function setOpen(open) {
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Zapri navigacijski meni' : 'Odpri navigacijski meni');
      if (open) {
        drawer.removeAttribute('hidden');
      } else {
        drawer.setAttribute('hidden', '');
      }
    }

    toggle.addEventListener('click', function () {
      var isOpen = toggle.getAttribute('aria-expanded') === 'true';
      setOpen(!isOpen);
    });

    drawer.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        setOpen(false);
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });

    document.addEventListener('click', function (e) {
      if (
        toggle.getAttribute('aria-expanded') === 'true' &&
        header &&
        !header.contains(e.target)
      ) {
        setOpen(false);
      }
    });

    var desktopQuery = window.matchMedia('(min-width: 901px)');
    function onDesktop(e) {
      if (e.matches) setOpen(false);
    }
    if (desktopQuery.addEventListener) desktopQuery.addEventListener('change', onDesktop);
    else if (desktopQuery.addListener) desktopQuery.addListener(onDesktop);
  }

  /* ------------------------------------------------------------------
   * 3D Background Motion Toggle
   * ------------------------------------------------------------------ */
  function initMotionToggle() {
    var btn = document.getElementById('motion-toggle');
    if (!btn) return;
    var labelEl = btn.querySelector('.motion-label');
    var reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    function getApi() {
      return window.DSSS && window.DSSS.motion ? window.DSSS.motion : null;
    }

    function readInitialState() {
      var api = getApi();
      if (api && typeof api.isEnabled === 'function') {
        return Boolean(api.isEnabled());
      }
      if (api && typeof api.enabled === 'boolean') {
        return api.enabled;
      }
      return !reducedQuery.matches;
    }

    var motionEnabled = readInitialState();

    function syncUI(enabled) {
      motionEnabled = Boolean(enabled);
      btn.setAttribute('aria-pressed', motionEnabled ? 'true' : 'false');
      if (labelEl) {
        labelEl.textContent = motionEnabled ? '3D vklopljen' : '3D izklopljen';
      }
      document.body.classList.toggle('motion-paused', !motionEnabled);
    }

    syncUI(motionEnabled);

    btn.addEventListener('click', function () {
      var api = getApi();
      if (api && typeof api.toggle === 'function') {
        var result = api.toggle();
        if (typeof result === 'boolean') {
          motionEnabled = result;
        } else if (typeof api.isEnabled === 'function') {
          motionEnabled = Boolean(api.isEnabled());
        } else {
          motionEnabled = !motionEnabled;
        }
      } else {
        motionEnabled = !motionEnabled;
      }
      syncUI(motionEnabled);
      track('motion_toggle', { enabled: motionEnabled });
    });

    document.addEventListener('dsss:motionchange', function (e) {
      if (e && e.detail && typeof e.detail.enabled === 'boolean') {
        syncUI(e.detail.enabled);
      }
    });

    function onReducedChange(e) {
      if (getApi()) return;
      syncUI(!e.matches);
    }
    if (reducedQuery.addEventListener) reducedQuery.addEventListener('change', onReducedChange);
    else if (reducedQuery.addListener) reducedQuery.addListener(onReducedChange);
  }

  /* ------------------------------------------------------------------
   * Image Fallback Handlers (CSP-safe, no inline onerror)
   * ------------------------------------------------------------------ */
  function bindImageFallback(img) {
    if (!img || img.dataset.fallbackBound === '1') return;
    img.dataset.fallbackBound = '1';

    img.addEventListener('error', function () {
      img.classList.add('is-fallback');
    });

    img.addEventListener('load', function () {
      img.classList.remove('is-fallback');
    });

    if (img.complete && img.naturalWidth === 0) {
      img.classList.add('is-fallback');
    }
  }

  /* ------------------------------------------------------------------
   * Desktop-Only Hover Video (Dimet only)
   * ------------------------------------------------------------------ */
  var hoverEnvListenersBound = false;

  function initHoverVideos() {
    var hoverQuery = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 769px)');
    var reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    var thumbs = Array.prototype.slice.call(document.querySelectorAll('.project-thumb[data-hover-video]'));

    function canPlayHoverVideo() {
      return hoverQuery.matches && !reducedQuery.matches;
    }

    function teardownVideo(thumb) {
      thumb.dataset.isHovered = '0';
      var video = thumb.querySelector('video');
      if (video) {
        video.pause();
        video.classList.remove('is-ready');
      }
    }

    function teardownAll() {
      Array.prototype.slice.call(document.querySelectorAll('.project-thumb[data-hover-video]')).forEach(function (thumb) {
        thumb.dataset.isHovered = '0';
        var video = thumb.querySelector('video');
        if (video && video.parentNode) {
          video.pause();
          video.removeAttribute('src');
          video.load();
          video.parentNode.removeChild(video);
        }
      });
    }

    thumbs.forEach(function (thumb) {
      if (thumb.dataset.hoverBound === '1') return;
      thumb.dataset.hoverBound = '1';

      thumb.addEventListener('mouseenter', function () {
        thumb.dataset.isHovered = '1';
        if (!canPlayHoverVideo()) return;
        var src = thumb.getAttribute('data-hover-video');
        if (!src) return;

        var video = thumb.querySelector('video');
        if (!video) {
          video = document.createElement('video');
          video.muted = true;
          video.loop = true;
          video.playsInline = true;
          video.preload = 'metadata';
          video.setAttribute('aria-hidden', 'true');
          video.src = src;
          video.addEventListener('canplay', function () {
            if (thumb.dataset.isHovered === '1' && canPlayHoverVideo() && !video.paused) {
              video.classList.add('is-ready');
            }
          });
          thumb.appendChild(video);
        }

        var playPromise = video.play();
        if (playPromise && typeof playPromise.then === 'function') {
          playPromise.then(function () {
            if (thumb.dataset.isHovered === '1' && video.readyState >= 2) {
              video.classList.add('is-ready');
            }
          }).catch(function () {});
        } else if (video.readyState >= 2) {
          video.classList.add('is-ready');
        }
      });

      thumb.addEventListener('mouseleave', function () {
        teardownVideo(thumb);
      });
    });

    if (!hoverEnvListenersBound) {
      hoverEnvListenersBound = true;
      var onEnvChange = function () {
        if (!canPlayHoverVideo()) teardownAll();
      };
      if (hoverQuery.addEventListener) hoverQuery.addEventListener('change', onEnvChange);
      else if (hoverQuery.addListener) hoverQuery.addListener(onEnvChange);

      if (reducedQuery.addEventListener) reducedQuery.addEventListener('change', onEnvChange);
      else if (reducedQuery.addListener) reducedQuery.addListener(onEnvChange);
    }
  }

  /* ------------------------------------------------------------------
   * Projects: Filtering, Counter, Dynamic JSON Sync & Safe Rendering
   * ------------------------------------------------------------------ */
  var activeFilter = 'all';

  function parseTags(str) {
    if (!str) return [];
    var sep = str.indexOf('|') !== -1 ? '|' : (str.indexOf(',') !== -1 ? ',' : ' ');
    return str.split(sep).map(function (t) {
      return t.trim();
    }).filter(Boolean);
  }

  function applyProjectFilter(filterValue) {
    activeFilter = filterValue || 'all';
    var grid = document.getElementById('projects-grid');
    var countEl = document.getElementById('project-count');
    var emptyEl = document.getElementById('projects-empty');
    if (!grid) return;

    var cards = Array.prototype.slice.call(grid.querySelectorAll('.project-card'));
    var visibleCount = 0;

    cards.forEach(function (card) {
      var tags = parseTags(card.getAttribute('data-tags') || '');
      var matches = activeFilter === 'all' || tags.indexOf(activeFilter) !== -1;
      card.classList.toggle('is-hidden', !matches);
      if (matches) visibleCount++;
    });

    if (countEl) {
      var formatted = String(visibleCount);
      countEl.textContent = formatted;
      countEl.setAttribute('aria-label', 'Število prikazanih projektov: ' + formatted);
    }

    if (emptyEl) {
      if (visibleCount === 0) emptyEl.removeAttribute('hidden');
      else emptyEl.setAttribute('hidden', '');
    }
  }

  function initProjectFilters() {
    var bar = document.querySelector('.filter-bar');
    if (!bar) return;
    var chips = Array.prototype.slice.call(bar.querySelectorAll('.filter-chip'));

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        var filter = chip.getAttribute('data-filter') || 'all';
        chips.forEach(function (c) {
          var active = c === chip;
          c.classList.toggle('is-active', active);
          c.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        applyProjectFilter(filter);
      });
    });

    applyProjectFilter('all');
  }

  function normalizeProject(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var id = raw.id || raw.slug || slugify(raw.title || raw.name || raw.domain);
    if (!id) return null;

    var existing = projectsById[id] || {};
    var cs = raw.caseStudy && typeof raw.caseStudy === 'object' ? raw.caseStudy : {};
    var rawKicker = raw.kicker || raw.category || existing.kicker || 'Projekt';
    var hasHoverVideo = Object.prototype.hasOwnProperty.call(raw, 'hoverVideo');

    return {
      id: id,
      title: raw.title || raw.name || existing.title || id,
      kicker: String(rawKicker),
      domain: raw.domain || existing.domain || '',
      url: raw.url || raw.liveUrl || existing.url || '#',
      github: raw.github || raw.repo || raw.repoUrl || raw.githubUrl || existing.github || '',
      image: raw.image || raw.imageFallback || raw.poster || existing.image || '',
      imageWebp: raw.imageWebp || raw.webp || existing.imageWebp || '',
      imageAlt: raw.imageAlt || raw.alt || existing.imageAlt || ('Predogled projekta ' + (raw.title || existing.title || id)),
      hoverVideo: hasHoverVideo ? (raw.hoverVideo || '') : (existing.hoverVideo || ''),
      tags: Array.isArray(raw.tags) ? raw.tags : (Array.isArray(raw.categories) ? raw.categories : (existing.tags || ['Splet'])),
      tech: Array.isArray(raw.tech) ? raw.tech : (Array.isArray(raw.stack) ? raw.stack : (existing.tech || [])),
      challenge: cs.challenge || raw.challenge || raw.izziv || existing.challenge || '',
      solution: cs.solution || raw.solution || raw.resitev || existing.solution || '',
      result: cs.result || raw.result || raw.rezultat || existing.result || '',
      deliverables: Array.isArray(raw.deliverables) ? raw.deliverables : (existing.deliverables || [])
    };
  }

  function createProjectCardElement(project) {
    var article = document.createElement('article');
    article.className = 'project-card';
    article.setAttribute('data-project-id', project.id);
    article.setAttribute('data-tags', (project.tags || ['Splet']).join('|'));

    var thumb = document.createElement('div');
    thumb.className = 'project-thumb';
    if (project.hoverVideo) {
      thumb.setAttribute('data-hover-video', project.hoverVideo);
    }

    var fallback = document.createElement('div');
    fallback.className = 'thumb-fallback';
    fallback.setAttribute('aria-hidden', 'true');
    var fallbackDomain = document.createElement('span');
    fallbackDomain.textContent = project.domain || project.title;
    var fallbackSub = document.createElement('small');
    fallbackSub.textContent = project.kicker || 'Projekt';
    fallback.appendChild(fallbackDomain);
    fallback.appendChild(fallbackSub);
    thumb.appendChild(fallback);

    if (project.image || project.imageWebp) {
      var picture = document.createElement('picture');
      if (project.imageWebp) {
        var source = document.createElement('source');
        source.type = 'image/webp';
        source.srcset = project.imageWebp;
        picture.appendChild(source);
      }
      var img = document.createElement('img');
      img.src = project.image || project.imageWebp;
      img.width = 1200;
      img.height = 750;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.alt = project.imageAlt || ('Predogled projekta ' + project.title);
      bindImageFallback(img);
      picture.appendChild(img);
      thumb.appendChild(picture);
    }

    var body = document.createElement('div');
    body.className = 'project-body';

    var top = document.createElement('div');
    top.className = 'project-top';
    var kicker = document.createElement('span');
    kicker.className = 'project-kicker';
    kicker.textContent = project.kicker;
    var domain = document.createElement('span');
    domain.className = 'project-domain';
    domain.textContent = project.domain;
    top.appendChild(kicker);
    top.appendChild(domain);

    var title = document.createElement('h3');
    title.className = 'project-title';
    title.textContent = project.title;

    var techList = document.createElement('ul');
    techList.className = 'tech-list';
    techList.setAttribute('aria-label', 'Uporabljene tehnologije');
    (project.tech || []).forEach(function (item) {
      var li = document.createElement('li');
      li.textContent = item;
      techList.appendChild(li);
    });

    var dl = document.createElement('dl');
    dl.className = 'case-mini';
    [
      ['Izziv', project.challenge],
      ['Rešitev', project.solution],
      ['Rezultat', project.result]
    ].forEach(function (pair) {
      if (!pair[1]) return;
      var row = document.createElement('div');
      row.className = 'case-mini-row';
      var dt = document.createElement('dt');
      dt.textContent = pair[0];
      var dd = document.createElement('dd');
      dd.textContent = pair[1];
      row.appendChild(dt);
      row.appendChild(dd);
      dl.appendChild(row);
    });

    var actions = document.createElement('div');
    actions.className = 'project-actions';

    var liveLink = document.createElement('a');
    liveLink.className = 'btn btn-secondary btn-sm';
    liveLink.href = project.url || '#';
    liveLink.target = '_blank';
    liveLink.rel = 'noopener noreferrer';
    liveLink.setAttribute('data-track-project', project.id);
    liveLink.textContent = 'Ogled projekta ';
    var arrow = document.createElement('span');
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '↗';
    liveLink.appendChild(arrow);

    var modalBtn = document.createElement('button');
    modalBtn.type = 'button';
    modalBtn.className = 'btn btn-ghost btn-sm';
    modalBtn.setAttribute('data-project-modal', project.id);
    modalBtn.textContent = 'Več o projektu';

    actions.appendChild(liveLink);
    actions.appendChild(modalBtn);

    body.appendChild(top);
    body.appendChild(title);
    body.appendChild(techList);
    body.appendChild(dl);
    body.appendChild(actions);

    article.appendChild(thumb);
    article.appendChild(body);
    return article;
  }

  function syncExistingCardMedia(card, project) {
    if (Array.isArray(project.tags) && project.tags.length) {
      card.setAttribute('data-tags', project.tags.join('|'));
    }
    var titleEl = card.querySelector('.project-title');
    if (titleEl && project.title && titleEl.textContent !== project.title) {
      titleEl.textContent = project.title;
    }
    var img = card.querySelector('.project-thumb img');
    var source = card.querySelector('.project-thumb source[type="image/webp"]');
    if (source && project.imageWebp && source.getAttribute('srcset') !== project.imageWebp) {
      source.setAttribute('srcset', project.imageWebp);
    }
    if (img && project.image && img.getAttribute('src') !== project.image) {
      img.classList.remove('is-fallback');
      img.setAttribute('src', project.image);
    }
  }

  function loadProjectsJson() {
    if (typeof window.fetch !== 'function') return;

    fetch('data/projects.json?v=20261128', { headers: { Accept: 'application/json' } })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (payload) {
        var list = Array.isArray(payload)
          ? payload
          : (payload && Array.isArray(payload.projects) ? payload.projects : []);
        if (!list.length) return;

        var grid = document.getElementById('projects-grid');
        var appended = false;

        list.forEach(function (raw) {
          var normalized = normalizeProject(raw);
          if (!normalized) return;
          projectsById[normalized.id] = normalized;

          if (!grid) return;
          var existingCard = grid.querySelector('[data-project-id="' + normalized.id + '"]');
          if (existingCard) {
            syncExistingCardMedia(existingCard, normalized);
          } else {
            grid.appendChild(createProjectCardElement(normalized));
            appended = true;
          }
        });

        if (appended) {
          initHoverVideos();
        }
        applyProjectFilter(activeFilter);
      })
      .catch(function () {
        // Pre-rendered HTML cards and embedded project data stay active if JSON is absent.
      });
  }

  /* ------------------------------------------------------------------
   * Accessible Modals (<dialog>)
   * ------------------------------------------------------------------ */
  function initModals() {
    var projectModal = document.getElementById('project-modal');
    var privacyModal = document.getElementById('privacy-modal');
    var lastTrigger = null;

    function openDialog(dialog, trigger) {
      if (!dialog) return;
      lastTrigger = trigger || document.activeElement;
      document.body.classList.add('modal-open');
      if (typeof dialog.showModal === 'function') {
        dialog.showModal();
      } else {
        dialog.setAttribute('open', '');
      }
      dialog.scrollTop = 0;
    }

    function closeDialog(dialog) {
      if (!dialog) return;
      document.body.classList.remove('modal-open');
      if (typeof dialog.close === 'function' && dialog.open) {
        dialog.close();
      } else {
        dialog.removeAttribute('open');
      }
      if (lastTrigger && typeof lastTrigger.focus === 'function') {
        lastTrigger.focus();
      }
      lastTrigger = null;
    }

    [projectModal, privacyModal].forEach(function (dialog) {
      if (!dialog) return;

      dialog.addEventListener('click', function (e) {
        if (e.target.closest('[data-close-modal]')) {
          closeDialog(dialog);
          return;
        }
        if (e.target === dialog && (e.clientX || e.clientY)) {
          var rect = dialog.getBoundingClientRect();
          if (
            e.clientX < rect.left ||
            e.clientX > rect.right ||
            e.clientY < rect.top ||
            e.clientY > rect.bottom
          ) {
            closeDialog(dialog);
          }
        }
      });

      dialog.addEventListener('cancel', function () {
        document.body.classList.remove('modal-open');
      });

      dialog.addEventListener('close', function () {
        document.body.classList.remove('modal-open');
        if (lastTrigger && typeof lastTrigger.focus === 'function') {
          lastTrigger.focus();
        }
        lastTrigger = null;
      });
    });

    function openProjectModal(projectId, trigger) {
      var project = projectsById[projectId];
      if (!project || !projectModal) return;

      var kickerEl = document.getElementById('project-modal-kicker');
      var titleEl = document.getElementById('project-modal-title');
      var domainFallbackEl = document.getElementById('project-modal-fallback-domain');
      var webpEl = document.getElementById('project-modal-webp');
      var imgEl = document.getElementById('project-modal-img');
      var techEl = document.getElementById('project-modal-tech');
      var challengeEl = document.getElementById('project-modal-challenge');
      var solutionEl = document.getElementById('project-modal-solution');
      var resultEl = document.getElementById('project-modal-result');
      var deliverablesEl = document.getElementById('project-modal-deliverables');
      var liveEl = document.getElementById('project-modal-live');
      var githubEl = document.getElementById('project-modal-github');

      if (kickerEl) kickerEl.textContent = project.kicker + (project.domain ? ' · ' + project.domain : '');
      if (titleEl) titleEl.textContent = project.title;
      if (domainFallbackEl) domainFallbackEl.textContent = project.domain || project.title;

      if (webpEl) {
        if (project.imageWebp) {
          webpEl.srcset = project.imageWebp;
        } else {
          webpEl.removeAttribute('srcset');
        }
      }

      if (imgEl) {
        bindImageFallback(imgEl);
        imgEl.classList.remove('is-fallback');
        imgEl.src = project.imageFallback || project.image || project.imageWebp || '';
        imgEl.alt = project.imageAlt || ('Predogled projekta ' + project.title);
        if (!imgEl.getAttribute('src')) {
          imgEl.classList.add('is-fallback');
        }
      }

      if (techEl) {
        techEl.textContent = '';
        (project.tech || []).forEach(function (item) {
          var li = document.createElement('li');
          li.textContent = item;
          techEl.appendChild(li);
        });
      }

      if (challengeEl) challengeEl.textContent = project.challenge || '';
      if (solutionEl) solutionEl.textContent = project.solution || '';
      if (resultEl) resultEl.textContent = project.result || '';

      if (deliverablesEl) {
        deliverablesEl.textContent = '';
        (project.deliverables || []).forEach(function (item) {
          var li = document.createElement('li');
          li.textContent = item;
          deliverablesEl.appendChild(li);
        });
      }

      if (liveEl) {
        liveEl.href = project.url || '#';
        liveEl.setAttribute('data-track-project', project.id);
      }

      if (githubEl) {
        if (project.github) {
          githubEl.href = project.github;
          githubEl.removeAttribute('hidden');
        } else {
          githubEl.setAttribute('hidden', '');
        }
      }

      track('project_details', { project: project.id });
      openDialog(projectModal, trigger);
    }

    document.addEventListener('click', function (e) {
      var modalTrigger = e.target.closest('[data-project-modal]');
      if (modalTrigger) {
        openProjectModal(modalTrigger.getAttribute('data-project-modal'), modalTrigger);
        return;
      }

      var privacyTrigger = e.target.closest('[data-open-privacy]');
      if (privacyTrigger) {
        openDialog(privacyModal, privacyTrigger);
      }
    });
  }

  /* ------------------------------------------------------------------
   * Service Prefill, CTA Tracking & Email Copy
   * ------------------------------------------------------------------ */
  function initInteractions() {
    var projectTypeSelect = document.getElementById('contact-type');
    var copyBtn = document.getElementById('copy-email-btn');
    var copyStatus = document.getElementById('copy-email-status');
    var copyTimer = null;

    document.addEventListener('click', function (e) {
      var serviceCta = e.target.closest('[data-prefill-service]');
      if (serviceCta && projectTypeSelect) {
        var desired = serviceCta.getAttribute('data-prefill-service');
        for (var i = 0; i < projectTypeSelect.options.length; i++) {
          if (projectTypeSelect.options[i].value === desired) {
            projectTypeSelect.selectedIndex = i;
            break;
          }
        }
      }

      var ctaEl = e.target.closest('[data-track-cta]');
      if (ctaEl) {
        track('cta_click', { cta: ctaEl.getAttribute('data-track-cta') });
      }

      var projLink = e.target.closest('[data-track-project]');
      if (projLink) {
        track('project_visit', { project: projLink.getAttribute('data-track-project') });
      }

      var mailLink = e.target.closest('a[href^="mailto:"]');
      if (mailLink) {
        track('email_click', { email: CONTACT_EMAIL });
      }
    });

    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        var email = copyBtn.getAttribute('data-email') || CONTACT_EMAIL;

        function showCopied() {
          if (copyStatus) {
            copyStatus.textContent = 'E-pošta kopirana: ' + email;
          }
          track('email_copy', { email: email });
          if (copyTimer) window.clearTimeout(copyTimer);
          copyTimer = window.setTimeout(function () {
            if (copyStatus) copyStatus.textContent = '';
          }, 3000);
        }

        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          navigator.clipboard.writeText(email).then(showCopied).catch(function () {
            fallbackCopy(email, showCopied);
          });
        } else {
          fallbackCopy(email, showCopied);
        }
      });
    }

    function fallbackCopy(text, onDone) {
      var temp = document.createElement('textarea');
      temp.value = text;
      temp.setAttribute('readonly', '');
      temp.className = 'sr-honeypot';
      document.body.appendChild(temp);
      temp.select();
      try {
        document.execCommand('copy');
        onDone();
      } catch (e) {
        if (copyStatus) {
          copyStatus.textContent = 'Kopiranje ni na voljo. Pišite na ' + text;
        }
      }
      document.body.removeChild(temp);
    }
  }

  /* ------------------------------------------------------------------
   * Cloudflare Turnstile Widget (Explicit Render + Lifecycle Reset)
   * ------------------------------------------------------------------ */
  var turnstileWidgetId = null;
  var turnstileToken = '';
  var turnstileLoadFailed = false;

  function resetTurnstile() {
    turnstileToken = '';
    if (!window.turnstile || typeof window.turnstile.reset !== 'function') return;
    try {
      if (turnstileWidgetId != null) {
        window.turnstile.reset(turnstileWidgetId);
      } else {
        window.turnstile.reset();
      }
    } catch (err) {
      // Ignore Turnstile reset errors
    }
  }

  function initTurnstileIfConfigured() {
    var slot = document.getElementById('turnstile-widget');
    if (!slot) return;
    var sitekey = (slot.getAttribute('data-turnstile-sitekey') || '').trim();
    if (!sitekey) return;
    var action = (slot.getAttribute('data-turnstile-action') || 'contact').trim();

    function renderWidget() {
      if (turnstileWidgetId != null) return;
      if (!window.turnstile || typeof window.turnstile.render !== 'function') return;
      var renderedId = window.turnstile.render(slot, {
        sitekey: sitekey,
        action: action,
        theme: 'dark',
        callback: function (token) {
          turnstileToken = token || '';
        },
        'expired-callback': function () {
          turnstileToken = '';
        },
        'error-callback': function () {
          turnstileToken = '';
        }
      });
      if (renderedId != null) {
        turnstileWidgetId = renderedId;
      }
    }

    if (window.turnstile && typeof window.turnstile.render === 'function') {
      renderWidget();
      return;
    }

    var script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.addEventListener('load', renderWidget);
    script.addEventListener('error', function () {
      turnstileLoadFailed = true;
    });
    document.head.appendChild(script);
  }

  function initContactForm() {
    var form = document.getElementById('contact-form');
    if (!form) return;

    var nameInput = document.getElementById('contact-name');
    var emailInput = document.getElementById('contact-email');
    var typeInput = document.getElementById('contact-type');
    var messageInput = document.getElementById('contact-message');
    var honeyInput = document.getElementById('contact-honey');
    var submitBtn = document.getElementById('contact-submit');
    var statusEl = document.getElementById('form-status');
    var turnstileSlot = document.getElementById('turnstile-widget');

    var errorEls = {
      name: document.getElementById('error-name'),
      email: document.getElementById('error-email'),
      message: document.getElementById('error-message')
    };

    var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    function setFieldError(input, errorEl, msg) {
      if (errorEl) errorEl.textContent = msg || '';
      if (input) {
        if (msg) input.setAttribute('aria-invalid', 'true');
        else input.removeAttribute('aria-invalid');
      }
    }

    function clearStatus() {
      if (!statusEl) return;
      statusEl.className = 'form-status';
      statusEl.textContent = '';
    }

    function showSuccess(text) {
      if (!statusEl) return;
      statusEl.className = 'form-status is-success';
      statusEl.textContent = text;
    }

    function showError(text) {
      if (!statusEl) return;
      statusEl.className = 'form-status is-error';
      statusEl.textContent = text;
    }

    function showFallbackError(nameVal, emailVal, typeVal, msgVal) {
      if (!statusEl) return;
      statusEl.className = 'form-status is-error';
      statusEl.textContent = 'Pošiljanje preko obrazca trenutno ni uspelo. Sporočilo lahko takoj pošljete neposredno na ';

      var subject = encodeURIComponent('Povpraševanje z DSSS portfolia — ' + (typeVal || 'Projekt'));
      var body = encodeURIComponent(
        'Ime: ' + nameVal + '\n' +
        'E-pošta: ' + emailVal + '\n' +
        'Tip projekta: ' + typeVal + '\n\n' +
        msgVal
      );

      var link = document.createElement('a');
      link.href = 'mailto:' + CONTACT_EMAIL + '?subject=' + subject + '&body=' + body;
      link.textContent = CONTACT_EMAIL;
      statusEl.appendChild(link);
      statusEl.appendChild(document.createTextNode('.'));
    }

    [
      [nameInput, errorEls.name],
      [emailInput, errorEls.email],
      [messageInput, errorEls.message]
    ].forEach(function (pair) {
      if (!pair[0]) return;
      pair[0].addEventListener('input', function () {
        setFieldError(pair[0], pair[1], '');
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      clearStatus();

      var nameVal = nameInput ? nameInput.value.trim() : '';
      var emailVal = emailInput ? emailInput.value.trim() : '';
      var typeVal = typeInput ? typeInput.value : 'Spletna stran';
      var msgVal = messageInput ? messageInput.value.trim() : '';
      var honeyVal = honeyInput ? honeyInput.value.trim() : '';

      // Silently ignore spam bots filling the honeypot.
      if (honeyVal) {
        form.reset();
        showSuccess('Hvala! Povpraševanje je zabeleženo.');
        return;
      }

      var firstInvalid = null;

      if (nameVal.length < 2) {
        setFieldError(nameInput, errorEls.name, 'Prosimo, vnesite svoje ime ali naziv podjetja.');
        firstInvalid = firstInvalid || nameInput;
      } else {
        setFieldError(nameInput, errorEls.name, '');
      }

      if (!EMAIL_RE.test(emailVal)) {
        setFieldError(emailInput, errorEls.email, 'Prosimo, vnesite veljaven e-poštni naslov.');
        firstInvalid = firstInvalid || emailInput;
      } else {
        setFieldError(emailInput, errorEls.email, '');
      }

      if (msgVal.length < 10) {
        setFieldError(messageInput, errorEls.message, 'Prosimo, napišite kratek opis projekta (najmanj 10 znakov).');
        firstInvalid = firstInvalid || messageInput;
      } else {
        setFieldError(messageInput, errorEls.message, '');
      }

      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }

      if (Date.now() - formLoadedAt < MIN_SUBMIT_MS) {
        showError('Prosimo, počakajte trenutek in poskusite znova.');
        return;
      }

      var payload = {
        name: nameVal,
        email: emailVal,
        project_type: typeVal,
        message: msgVal,
        _subject: 'Novo povpraševanje z DSSS portfolia — ' + typeVal,
        _template: 'table'
      };

      var turnstileKey = turnstileSlot ? (turnstileSlot.getAttribute('data-turnstile-sitekey') || '').trim() : '';
      if (turnstileKey) {
        if (turnstileLoadFailed) {
          showFallbackError(nameVal, emailVal, typeVal, msgVal);
          return;
        }
        var tokenField = form.querySelector('[name="cf-turnstile-response"]');
        var token = turnstileWidgetId != null ? turnstileToken : (turnstileToken || (tokenField ? tokenField.value : ''));
        if (!token) {
          showError('Prosimo, dokončajte varnostno potrditev pred pošiljanjem.');
          return;
        }
        payload['cf-turnstile-response'] = token;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Pošiljam povpraševanje ...';
      }

      fetch(FORMSUBMIT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.json();
        })
        .then(function (data) {
          if (data && (data.success === false || data.success === 'false')) {
            throw new Error('FormSubmit rejected submission');
          }
          form.reset();
          track('form_submit', { status: 'success', project_type: typeVal });
          showSuccess('Hvala za povpraševanje! Sporočilo je poslano, odgovorim v 1–2 delovnih dneh.');
        })
        .catch(function () {
          track('form_submit', { status: 'error', project_type: typeVal });
          showFallbackError(nameVal, emailVal, typeVal, msgVal);
        })
        .finally(function () {
          if (turnstileKey) {
            resetTurnstile();
          }
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Pošlji povpraševanje';
          }
        });
    });
  }

  /* ------------------------------------------------------------------
   * Bootstrap
   * ------------------------------------------------------------------ */
  function init() {
    Array.prototype.slice.call(document.querySelectorAll('.project-thumb img')).forEach(bindImageFallback);
    initMobileNav();
    initMotionToggle();
    initProjectFilters();
    initHoverVideos();
    initModals();
    initInteractions();
    initTurnstileIfConfigured();
    initContactForm();
    loadProjectsJson();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
