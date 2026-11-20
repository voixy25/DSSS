/*
 * DSSS — integration layer.
 * Wires the renderer, camera, fluid simulation (js/fluid.js) and the GPGPU
 * particle cloud (js/particles.js) together, manages motion preferences,
 * visibility pausing, context recovery, and runs the frame loop.
 */
(function () {
  'use strict';

  const CONFIG = Object.freeze({
    clearColor: 0x071712,
    maxPixelRatio: 1.5,
    mobileQuery: '(pointer: coarse), (max-width: 760px)',
    reducedMotionQuery: '(prefers-reduced-motion: reduce)',
    motionStorageKey: 'dsss_motion',
    camera: Object.freeze({ fov: 30, near: 0.1, far: 1000 }),
    cameraBase: Object.freeze({ x: -1.17, y: 0, z: 6 }),
    gaze: Object.freeze({ xFactor: -0.5, yFactor: 0.42, lerp: 0.04 }),
    maxDt: 1 / 20,
    warmupSteps: 10,
    warmupDt: 1 / 60,
    // Portrait framing pulls back and shifts aim subtly downward; wide desktop shifts right of hero copy.
    portraitRefAspect: 1.05,
    portraitLookY: -0.22,
    portraitLookRamp: 0.35,
    wideLookX: -0.45,
    wideLookStartAspect: 1.05,
    wideLookRamp: 0.55,
  });

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function mapRange(value, inMin, inMax, outMin, outMax) {
    if (inMax === inMin) return (outMin + outMax) * 0.5;
    return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
  }

  function safeGetStorage(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (_) {
      return null;
    }
  }

  function safeSetStorage(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (_) {
      // Storage may be blocked in private contexts.
    }
  }

  function computeFraming(aspect) {
    const safeAspect = Math.max(0.2, aspect || 1);
    const distanceScale = Math.max(1, CONFIG.portraitRefAspect / safeAspect);
    const portraitRamp = clamp((CONFIG.portraitRefAspect - safeAspect) / CONFIG.portraitLookRamp, 0, 1);
    const wideRamp = clamp((safeAspect - CONFIG.wideLookStartAspect) / CONFIG.wideLookRamp, 0, 1);
    return {
      distanceScale,
      lookX: CONFIG.wideLookX * wideRamp,
      lookY: CONFIG.portraitLookY * portraitRamp * distanceScale,
    };
  }

  function getViewport() {
    return {
      width: Math.max(1, window.innerWidth),
      height: Math.max(1, window.innerHeight),
      dpr: Math.min(window.devicePixelRatio || 1, CONFIG.maxPixelRatio),
    };
  }

  function configureRenderer(renderer, viewport) {
    renderer.setPixelRatio(viewport.dpr);
    renderer.setSize(viewport.width, viewport.height, false);
    renderer.setClearColor(CONFIG.clearColor, 1);
  }

  function createRenderer(canvas, viewport) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
    configureRenderer(renderer, viewport);
    return renderer;
  }

  /**
   * Both simulations render into (half-)float targets; without WebGL2 and a
   * float-renderable extension those framebuffers are incomplete and the
   * canvas would silently stay blank, so fail loudly into the fallback.
   */
  function assertFloatTargets(renderer) {
    const ext = renderer.extensions;
    const floatRenderable = ext.has('EXT_color_buffer_float') || ext.has('EXT_color_buffer_half_float');
    if (!renderer.capabilities.isWebGL2 || !floatRenderable) {
      renderer.dispose();
      throw new Error('DSSS: WebGL2 float render targets unsupported');
    }
  }

  function applyBaseCameraPose(camera, framing) {
    camera.position.set(
      CONFIG.cameraBase.x * framing.distanceScale,
      CONFIG.cameraBase.y,
      CONFIG.cameraBase.z * framing.distanceScale
    );
    camera.lookAt(framing.lookX, framing.lookY, 0);
    camera.updateMatrixWorld();
  }

  function createCamera(viewport, framing) {
    const { fov, near, far } = CONFIG.camera;
    const camera = new THREE.PerspectiveCamera(fov, viewport.width / viewport.height, near, far);
    applyBaseCameraPose(camera, framing);
    return camera;
  }

  function gazeTarget(pointer, viewport, framing) {
    const nx = clamp(mapRange(pointer.x, 0, viewport.width, -1, 1), -1, 1);
    const ny = clamp(mapRange(pointer.y, 0, viewport.height, -1, 1), -1, 1);
    return {
      x: CONFIG.cameraBase.x * framing.distanceScale + nx * CONFIG.gaze.xFactor,
      y: CONFIG.cameraBase.y + ny * CONFIG.gaze.yFactor,
    };
  }

  function updateCamera(camera, pointer, viewport, framing) {
    const target = gazeTarget(pointer, viewport, framing);
    camera.position.x += (target.x - camera.position.x) * CONFIG.gaze.lerp;
    camera.position.y += (target.y - camera.position.y) * CONFIG.gaze.lerp;
    camera.position.z = CONFIG.cameraBase.z * framing.distanceScale;
    camera.lookAt(framing.lookX, framing.lookY, 0);
    camera.updateMatrixWorld();
  }

  function disposeSimulations(state) {
    if (!state) return;
    if (state.particles) {
      state.scene.remove(state.particles.object);
      state.particles.dispose();
      state.particles = null;
    }
    if (state.fluid) {
      state.fluid.dispose();
      state.fluid = null;
    }
  }

  function disposeState(state) {
    if (!state) return;
    stopLoop();
    disposeSimulations(state);
    if (state.renderer) {
      state.renderer.dispose();
      state.renderer = null;
    }
  }

  function enterNoWebGLFallback(error, state) {
    console.warn('DSSS WebGL background disabled:', error);
    disposeState(state || activeState);
    activeState = null;
    document.documentElement.classList.add('no-webgl');
    const canvas = document.getElementById('bg');
    if (canvas) canvas.style.display = 'none';
  }

  function readInitialMotion(reducedQuery) {
    const stored = safeGetStorage(CONFIG.motionStorageKey);
    if (stored === '0') return false;
    if (stored === '1') return true;
    return !reducedQuery.matches;
  }

  function emitMotionChange(enabled) {
    document.dispatchEvent(new CustomEvent('dsss:motionchange', {
      bubbles: true,
      detail: { enabled: Boolean(enabled) },
    }));
  }

  function createSimulationBundle(state) {
    const fluid = window.DSSS.createFluid(state.renderer, { isMobile: state.isMobile });
    const particles = window.DSSS.createParticles(state.renderer, {
      isMobile: state.isMobile,
      onReady: function () {
        if (state && !state.contextLost && !state.rafId && !document.hidden) {
          state.renderer.render(state.scene, state.camera);
        }
      },
    });
    state.fluid = fluid;
    state.particles = particles;
    state.scene.add(particles.object);
    fluid.resize(state.viewport.width, state.viewport.height);
    particles.resize(state.viewport.width, state.viewport.height, state.viewport.dpr);
  }

  function warmupAndRender(state) {
    if (!state.fluid || !state.particles || state.contextLost) return;
    for (let i = 0; i < CONFIG.warmupSteps; i++) {
      state.particles.update({
        dt: CONFIG.warmupDt,
        time: state.simTime,
        camera: state.camera,
        fluidVelocity: state.fluid.velocityTexture,
        fluidDensity: state.fluid.densityTexture,
      });
    }
    state.renderer.render(state.scene, state.camera);
  }

  const reducedQuery = window.matchMedia(CONFIG.reducedMotionQuery);
  let motionEnabled = readInitialMotion(reducedQuery);
  let activeState = null;

  function stopLoop() {
    if (!activeState || !activeState.rafId) return;
    cancelAnimationFrame(activeState.rafId);
    activeState.rafId = 0;
  }

  function renderFrame() {
    if (!activeState || !motionEnabled || document.hidden || activeState.contextLost) {
      if (activeState) activeState.rafId = 0;
      return;
    }
    const dt = Math.min(activeState.clock.getDelta(), CONFIG.maxDt);
    activeState.simTime += dt;
    updateCamera(activeState.camera, activeState.pointer, activeState.viewport, activeState.framing);
    activeState.fluid.update(dt);
    activeState.particles.update({
      dt,
      time: activeState.simTime,
      camera: activeState.camera,
      fluidVelocity: activeState.fluid.velocityTexture,
      fluidDensity: activeState.fluid.densityTexture,
    });
    activeState.renderer.render(activeState.scene, activeState.camera);
    activeState.rafId = requestAnimationFrame(renderFrame);
  }

  function startLoop() {
    if (!activeState || activeState.rafId || !motionEnabled || document.hidden || activeState.contextLost) {
      return;
    }
    // Discard elapsed delta from any paused/hidden interval before stepping.
    activeState.clock.getDelta();
    activeState.rafId = requestAnimationFrame(renderFrame);
  }

  function applyMotionState(next, persist) {
    const enabled = Boolean(next);
    if (persist) {
      safeSetStorage(CONFIG.motionStorageKey, enabled ? '1' : '0');
    }
    if (enabled === motionEnabled) return motionEnabled;
    motionEnabled = enabled;
    if (enabled) {
      startLoop();
    } else {
      stopLoop();
    }
    emitMotionChange(motionEnabled);
    return motionEnabled;
  }

  window.DSSS = window.DSSS || {};
  window.DSSS.motion = {
    isEnabled: function () { return motionEnabled; },
    setEnabled: function (enabled) { return applyMotionState(enabled, true); },
    toggle: function () { return applyMotionState(!motionEnabled, true); },
  };

  function onReducedMotionChange(event) {
    const stored = safeGetStorage(CONFIG.motionStorageKey);
    if (stored === '0' || stored === '1') return;
    applyMotionState(!event.matches, false);
  }

  if (typeof reducedQuery.addEventListener === 'function') {
    reducedQuery.addEventListener('change', onReducedMotionChange);
  } else if (typeof reducedQuery.addListener === 'function') {
    reducedQuery.addListener(onReducedMotionChange);
  }

  function bindEvents(canvas, state) {
    const onPointer = (e) => {
      if (e.isPrimary === false) return;
      state.pointer.x = e.clientX;
      state.pointer.y = e.clientY;
      if (motionEnabled && !state.contextLost && state.fluid) {
        state.fluid.pointerMove(e.clientX, e.clientY);
      }
    };
    const onPointerReset = (e) => {
      if (e.pointerType === 'mouse') return;
      if (state.fluid && state.fluid.pointerReset) {
        state.fluid.pointerReset();
      }
    };
    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('pointerdown', onPointer, { passive: true });
    window.addEventListener('pointerup', onPointerReset, { passive: true });
    window.addEventListener('pointercancel', onPointerReset, { passive: true });

    window.addEventListener('resize', () => {
      if (!state.renderer || state !== activeState) return;
      const viewport = getViewport();
      state.viewport = viewport;
      configureRenderer(state.renderer, viewport);
      state.camera.aspect = viewport.width / viewport.height;
      state.camera.updateProjectionMatrix();
      state.framing = computeFraming(state.camera.aspect);
      if (!motionEnabled) {
        applyBaseCameraPose(state.camera, state.framing);
      }
      if (!state.contextLost && state.fluid && state.particles) {
        state.fluid.resize(viewport.width, viewport.height);
        state.particles.resize(viewport.width, viewport.height, viewport.dpr);
        if (!motionEnabled && !document.hidden) {
          state.renderer.render(state.scene, state.camera);
        }
      }
    }, { passive: true });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stopLoop();
      } else if (motionEnabled && !state.contextLost) {
        startLoop();
      }
    });

    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      state.contextLost = true;
      stopLoop();
      disposeSimulations(state);
    });

    canvas.addEventListener('webglcontextrestored', () => {
      try {
        state.contextLost = false;
        state.viewport = getViewport();
        configureRenderer(state.renderer, state.viewport);
        assertFloatTargets(state.renderer);
        state.camera.aspect = state.viewport.width / state.viewport.height;
        state.camera.updateProjectionMatrix();
        state.framing = computeFraming(state.camera.aspect);
        applyBaseCameraPose(state.camera, state.framing);
        createSimulationBundle(state);
        warmupAndRender(state);
        if (motionEnabled && !document.hidden) {
          startLoop();
        }
      } catch (error) {
        enterNoWebGLFallback(error, state);
      }
    });
  }

  function init() {
    const canvas = document.getElementById('bg');
    if (!canvas) throw new Error('DSSS: canvas#bg not found');

    canvas.style.pointerEvents = 'none';

    if (typeof THREE === 'undefined') throw new Error('DSSS: three.js failed to load');
    if (!window.DSSS || !window.DSSS.createFluid || !window.DSSS.createParticles) {
      throw new Error('DSSS: fluid or particle module failed to load');
    }

    const viewport = getViewport();
    const isMobile = window.matchMedia(CONFIG.mobileQuery).matches;
    const renderer = createRenderer(canvas, viewport);
    assertFloatTargets(renderer);
    const framing = computeFraming(viewport.width / viewport.height);
    const camera = createCamera(viewport, framing);
    const scene = new THREE.Scene();

    const state = {
      renderer,
      camera,
      scene,
      fluid: null,
      particles: null,
      viewport,
      framing,
      isMobile,
      clock: new THREE.Clock(),
      simTime: 0,
      rafId: 0,
      contextLost: false,
      pointer: { x: viewport.width / 2, y: viewport.height / 2 },
    };

    activeState = state;
    createSimulationBundle(state);
    bindEvents(canvas, state);
    warmupAndRender(state);

    if (motionEnabled && !document.hidden) {
      startLoop();
    }
  }

  try {
    init();
  } catch (error) {
    enterNoWebGLFallback(error);
  }
})();
