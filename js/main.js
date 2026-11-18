/*
 * DSSS — integration layer.
 * Wires the renderer, camera, fluid simulation (js/fluid.js) and the GPGPU
 * particle cloud (js/particles.js) together and runs the frame loop.
 */
(function () {
  'use strict';

  const CONFIG = Object.freeze({
    clearColor: 0x071712,
    maxPixelRatio: 2,
    mobileQuery: '(pointer: coarse), (max-width: 760px)',
    camera: Object.freeze({ fov: 30, near: 0.1, far: 1000 }),
    cameraBase: Object.freeze({ x: -1.17, y: 0, z: 6 }),
    gaze: Object.freeze({ xFactor: -1, yFactor: 2, lerp: 0.05 }),
    maxDt: 1 / 20,
    // Portrait framing: pull the camera back so the ring fits the width, and
    // aim below the origin so the ring sits above the bottom text column.
    portraitRefAspect: 1.05,
    portraitLookY: -0.35,
    // Aspect range below portraitRefAspect over which the downward aim ramps in.
    portraitLookRamp: 0.3,
  });

  function computeFraming(aspect) {
    const distanceScale = Math.max(1, CONFIG.portraitRefAspect / aspect);
    const ramp = Math.min(1, Math.max(0, (CONFIG.portraitRefAspect - aspect) / CONFIG.portraitLookRamp));
    const lookY = CONFIG.portraitLookY * ramp * distanceScale;
    return { distanceScale, lookY };
  }

  function mapRange(value, inMin, inMax, outMin, outMax) {
    return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
  }

  function getViewport() {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      dpr: Math.min(window.devicePixelRatio || 1, CONFIG.maxPixelRatio),
    };
  }

  function createRenderer(canvas, viewport) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
    renderer.setPixelRatio(viewport.dpr);
    renderer.setSize(viewport.width, viewport.height, false);
    renderer.setClearColor(CONFIG.clearColor, 1);
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

  function createCamera(viewport, framing) {
    const { fov, near, far } = CONFIG.camera;
    const camera = new THREE.PerspectiveCamera(fov, viewport.width / viewport.height, near, far);
    camera.position.set(
      CONFIG.cameraBase.x * framing.distanceScale,
      CONFIG.cameraBase.y,
      CONFIG.cameraBase.z * framing.distanceScale
    );
    camera.lookAt(0, framing.lookY, 0);
    return camera;
  }

  function gazeTarget(pointer, viewport, framing) {
    const nx = mapRange(pointer.x, 0, viewport.width, -1, 1);
    const ny = mapRange(pointer.y, 0, viewport.height, -1, 1);
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
    camera.lookAt(0, framing.lookY, 0);
    camera.updateMatrixWorld();
  }

  function bindPointer(state, fluid) {
    const move = (x, y) => {
      state.pointer = { x, y };
      fluid.pointerMove(x, y);
    };
    window.addEventListener('mousemove', (e) => move(e.clientX, e.clientY), { passive: true });
    const onTouch = (e) => {
      const touch = e.touches[0];
      if (touch) move(touch.clientX, touch.clientY);
    };
    window.addEventListener('touchstart', onTouch, { passive: true });
    window.addEventListener('touchmove', onTouch, { passive: true });
  }

  function bindResize(state) {
    window.addEventListener('resize', () => {
      const viewport = getViewport();
      state.viewport = viewport;
      state.renderer.setPixelRatio(viewport.dpr);
      state.renderer.setSize(viewport.width, viewport.height, false);
      state.camera.aspect = viewport.width / viewport.height;
      state.camera.updateProjectionMatrix();
      state.framing = computeFraming(state.camera.aspect);
      state.fluid.resize(viewport.width, viewport.height);
      state.particles.resize(viewport.width, viewport.height, viewport.dpr);
    });
  }

  function startLoop(state) {
    const clock = new THREE.Clock();
    const frame = () => {
      const dt = Math.min(clock.getDelta(), CONFIG.maxDt);
      const time = clock.elapsedTime;
      updateCamera(state.camera, state.pointer, state.viewport, state.framing);
      state.fluid.update(dt);
      state.particles.update({
        dt,
        time,
        camera: state.camera,
        fluidVelocity: state.fluid.velocityTexture,
        fluidDensity: state.fluid.densityTexture,
      });
      state.renderer.render(state.scene, state.camera);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  function init() {
    const canvas = document.getElementById('bg');
    if (!canvas) throw new Error('DSSS: canvas#bg not found');
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
    const fluid = window.DSSS.createFluid(renderer, { isMobile });
    const particles = window.DSSS.createParticles(renderer, { isMobile });

    scene.add(particles.object);
    fluid.resize(viewport.width, viewport.height);
    particles.resize(viewport.width, viewport.height, viewport.dpr);

    const state = {
      renderer, camera, scene, fluid, particles, viewport, framing,
      pointer: { x: viewport.width / 2, y: viewport.height / 2 },
    };
    bindPointer(state, fluid);
    bindResize(state);
    startLoop(state);
  }

  try {
    init();
  } catch (error) {
    // The UI stays usable without WebGL; surface the cause for debugging.
    console.error('DSSS background disabled:', error);
    const canvas = document.getElementById('bg');
    if (canvas) canvas.style.display = 'none';
  }
})();
