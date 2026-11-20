(function () {
  'use strict';

  window.DSSS = window.DSSS || {};

  if (typeof THREE === 'undefined') {
    window.DSSS.createFluid = function () {
      throw new Error('DSSS.createFluid: global THREE (three.js r150) is not loaded.');
    };
    return;
  }

  const CONFIG = Object.freeze({
    SIM_RES: 256,
    DYE_RES: 512,
    VELOCITY_DISSIPATION: 0.955,
    DENSITY_DISSIPATION: 0.94,
    PRESSURE_DISSIPATION: 0.95,
    PRESSURE_ITERATIONS: 5,
    CURL: 30,
    SIM_DT: 1 / 60,
    MAX_STEPS_PER_FRAME: 3,
    VORTICITY_CLAMP: 32,
    IDLE_RESET_MS: 50,
    MIN_MOVE_PX: 0.01,
    MAX_JUMP_PX: 260,
    RADIUS_LEN_MAX: 5,
    RADIUS_PX_MAX: 26,
    RADIUS_SCALE_DESKTOP: 0.55,
    RADIUS_SCALE_MOBILE: 0.7,
    SPEED_LEN_MAX: 55,
    FORCE_MAX: 14,
    RADIUS_UV_DIVISOR: 200,
    MASK_MAX_DPR: 1,
    MASK_MAX_SIZE: 2048
  });

  // ---------- shaders ----------

  const VERTEX = [
    'varying vec2 vUv;',
    'void main() {',
    '  vUv = uv;',
    '  gl_Position = vec4(position.xy, 0.0, 1.0);',
    '}'
  ].join('\n');

  const SANITIZE_GLSL = [
    'bool isFiniteFloat(float x) {',
    '  return (x >= -65504.0 && x <= 65504.0);',
    '}',
    'vec2 sanitizeVel(vec2 v) {',
    '  vec2 safe = vec2(isFiniteFloat(v.x) ? v.x : 0.0, isFiniteFloat(v.y) ? v.y : 0.0);',
    '  return clamp(safe, vec2(-32.0), vec2(32.0));',
    '}',
    'vec3 sanitizeVec3(vec3 v) {',
    '  vec3 safe = vec3(',
    '    isFiniteFloat(v.x) ? v.x : 0.0,',
    '    isFiniteFloat(v.y) ? v.y : 0.0,',
    '    isFiniteFloat(v.z) ? v.z : 0.0',
    '  );',
    '  return clamp(safe, vec3(-32.0), vec3(32.0));',
    '}'
  ].join('\n');

  const NEIGHBOURS = [
    'vec2 vL = vUv - vec2(uTexelSize.x, 0.0);',
    'vec2 vR = vUv + vec2(uTexelSize.x, 0.0);',
    'vec2 vT = vUv + vec2(0.0, uTexelSize.y);',
    'vec2 vB = vUv - vec2(0.0, uTexelSize.y);'
  ].join('\n');

  const FRAG_SPLAT = [
    'varying vec2 vUv;',
    'uniform sampler2D uTarget;',
    'uniform vec2 uA;',
    'uniform vec2 uB;',
    'uniform vec3 uColor;',
    'uniform float uRadius;',
    'uniform float uAspect;',
    SANITIZE_GLSL,
    'void main() {',
    '  vec2 p = vUv - uA;',
    '  vec2 ba = uB - uA;',
    '  p.x *= uAspect;',
    '  ba.x *= uAspect;',
    '  float h = clamp(dot(p, ba) / max(dot(ba, ba), 1e-8), 0.0, 1.0);',
    '  vec2 d = p - ba * h;',
    '  float r2 = max(uRadius * uRadius, 1e-8);',
    '  vec3 splat = exp(-dot(d, d) / r2) * uColor;',
    '  vec3 base = sanitizeVec3(texture2D(uTarget, vUv).xyz);',
    '  vec3 next = sanitizeVec3(base + splat);',
    '  gl_FragColor = vec4(next, 1.0);',
    '}'
  ].join('\n');

  const FRAG_CURL = [
    'varying vec2 vUv;',
    'uniform sampler2D uVelocity;',
    'uniform vec2 uTexelSize;',
    'void main() {',
    NEIGHBOURS,
    '  float L = texture2D(uVelocity, vL).y;',
    '  float R = texture2D(uVelocity, vR).y;',
    '  float T = texture2D(uVelocity, vT).x;',
    '  float B = texture2D(uVelocity, vB).x;',
    '  gl_FragColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);',
    '}'
  ].join('\n');

  const FRAG_VORTICITY = [
    'varying vec2 vUv;',
    'uniform sampler2D uVelocity;',
    'uniform sampler2D uCurl;',
    'uniform vec2 uTexelSize;',
    'uniform float uCurlStrength;',
    'uniform float uDt;',
    'uniform float uClamp;',
    SANITIZE_GLSL,
    'void main() {',
    NEIGHBOURS,
    '  float L = texture2D(uCurl, vL).x;',
    '  float R = texture2D(uCurl, vR).x;',
    '  float T = texture2D(uCurl, vT).x;',
    '  float B = texture2D(uCurl, vB).x;',
    '  float C = texture2D(uCurl, vUv).x;',
    '  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));',
    '  force /= length(force) + 0.0001;',
    '  force *= uCurlStrength * C;',
    '  force.y *= -1.0;',
    '  vec2 cur = sanitizeVel(texture2D(uVelocity, vUv).xy);',
    '  vec2 vel = sanitizeVel(cur + force * uDt);',
    '  vel = clamp(vel, vec2(-uClamp), vec2(uClamp));',
    '  gl_FragColor = vec4(vel, 0.0, 1.0);',
    '}'
  ].join('\n');

  const FRAG_DIVERGENCE = [
    'varying vec2 vUv;',
    'uniform sampler2D uVelocity;',
    'uniform vec2 uTexelSize;',
    'void main() {',
    NEIGHBOURS,
    '  float L = texture2D(uVelocity, vL).x;',
    '  float R = texture2D(uVelocity, vR).x;',
    '  float T = texture2D(uVelocity, vT).y;',
    '  float B = texture2D(uVelocity, vB).y;',
    '  vec2 C = texture2D(uVelocity, vUv).xy;',
    '  if (vL.x < 0.0) { L = -C.x; }',
    '  if (vR.x > 1.0) { R = -C.x; }',
    '  if (vT.y > 1.0) { T = -C.y; }',
    '  if (vB.y < 0.0) { B = -C.y; }',
    '  gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);',
    '}'
  ].join('\n');

  const FRAG_CLEAR = [
    'varying vec2 vUv;',
    'uniform sampler2D uTexture;',
    'uniform float uValue;',
    'void main() {',
    '  gl_FragColor = uValue * texture2D(uTexture, vUv);',
    '}'
  ].join('\n');

  const FRAG_PRESSURE = [
    'varying vec2 vUv;',
    'uniform sampler2D uPressure;',
    'uniform sampler2D uDivergence;',
    'uniform vec2 uTexelSize;',
    'void main() {',
    NEIGHBOURS,
    '  float L = texture2D(uPressure, vL).x;',
    '  float R = texture2D(uPressure, vR).x;',
    '  float T = texture2D(uPressure, vT).x;',
    '  float B = texture2D(uPressure, vB).x;',
    '  float div = texture2D(uDivergence, vUv).x;',
    '  gl_FragColor = vec4((L + R + B + T - div) * 0.25, 0.0, 0.0, 1.0);',
    '}'
  ].join('\n');

  const FRAG_GRADIENT = [
    'varying vec2 vUv;',
    'uniform sampler2D uPressure;',
    'uniform sampler2D uVelocity;',
    'uniform vec2 uTexelSize;',
    SANITIZE_GLSL,
    'void main() {',
    NEIGHBOURS,
    '  float L = texture2D(uPressure, vL).x;',
    '  float R = texture2D(uPressure, vR).x;',
    '  float T = texture2D(uPressure, vT).x;',
    '  float B = texture2D(uPressure, vB).x;',
    '  vec2 vel = sanitizeVel(texture2D(uVelocity, vUv).xy - vec2(R - L, T - B));',
    '  gl_FragColor = vec4(vel, 0.0, 1.0);',
    '}'
  ].join('\n');

  const FRAG_ADVECT = [
    'varying vec2 vUv;',
    'uniform sampler2D uVelocity;',
    'uniform sampler2D uSource;',
    'uniform vec2 uTexelSize;',
    'uniform float uDt;',
    'uniform float uDissipation;',
    SANITIZE_GLSL,
    'void main() {',
    '  vec2 vel = sanitizeVel(texture2D(uVelocity, vUv).xy);',
    '  vec2 coord = clamp(vUv - uDt * vel * uTexelSize, 0.0, 1.0);',
    '  vec3 src = sanitizeVec3(texture2D(uSource, coord).xyz);',
    '  gl_FragColor = vec4(sanitizeVec3(uDissipation * src), 1.0);',
    '}'
  ].join('\n');

  const FRAG_DISPLAY = [
    'varying vec2 vUv;',
    'uniform sampler2D uDye;',
    SANITIZE_GLSL,
    'void main() {',
    '  vec3 c = sanitizeVec3(texture2D(uDye, vUv).rgb);',
    '  float a = clamp(max(c.r, max(c.g, c.b)), 0.0, 1.0);',
    '  gl_FragColor = vec4(a, a, a, a);',
    '}'
  ].join('\n');

  // ---------- helpers ----------

  function clampMap(x, a, b, c, d) {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * (d - c) + c;
  }

  function createTarget(width, height) {
    return new THREE.WebGLRenderTarget(width, height, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      depthBuffer: false,
      stencilBuffer: false
    });
  }

  function createDoubleTarget(size) {
    const pair = { a: createTarget(size, size), b: createTarget(size, size) };
    return {
      get read() { return pair.a; },
      get write() { return pair.b; },
      swap() {
        const t = pair.a;
        pair.a = pair.b;
        pair.b = t;
      },
      dispose() {
        pair.a.dispose();
        pair.b.dispose();
      }
    };
  }

  function createMaterial(fragmentShader, uniforms) {
    return new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: fragmentShader,
      uniforms: uniforms,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NoBlending,
      transparent: false
    });
  }

  function createTriangle() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(
      new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(
      new Float32Array([0, 0, 2, 0, 0, 2]), 2));
    return geometry;
  }

  function createMaterials() {
    const sim = () => ({ value: new THREE.Vector2(1 / CONFIG.SIM_RES, 1 / CONFIG.SIM_RES) });
    return {
      splat: createMaterial(FRAG_SPLAT, {
        uTarget: { value: null },
        uA: { value: new THREE.Vector2() },
        uB: { value: new THREE.Vector2() },
        uColor: { value: new THREE.Vector3() },
        uRadius: { value: 0.01 },
        uAspect: { value: 1 }
      }),
      curl: createMaterial(FRAG_CURL, { uVelocity: { value: null }, uTexelSize: sim() }),
      vorticity: createMaterial(FRAG_VORTICITY, {
        uVelocity: { value: null },
        uCurl: { value: null },
        uTexelSize: sim(),
        uCurlStrength: { value: CONFIG.CURL },
        uDt: { value: CONFIG.SIM_DT },
        uClamp: { value: CONFIG.VORTICITY_CLAMP }
      }),
      divergence: createMaterial(FRAG_DIVERGENCE, { uVelocity: { value: null }, uTexelSize: sim() }),
      clear: createMaterial(FRAG_CLEAR, {
        uTexture: { value: null },
        uValue: { value: CONFIG.PRESSURE_DISSIPATION }
      }),
      pressure: createMaterial(FRAG_PRESSURE, {
        uPressure: { value: null },
        uDivergence: { value: null },
        uTexelSize: sim()
      }),
      gradient: createMaterial(FRAG_GRADIENT, {
        uPressure: { value: null },
        uVelocity: { value: null },
        uTexelSize: sim()
      }),
      advect: createMaterial(FRAG_ADVECT, {
        uVelocity: { value: null },
        uSource: { value: null },
        uTexelSize: sim(),
        uDt: { value: CONFIG.SIM_DT },
        uDissipation: { value: 1 }
      }),
      display: createMaterial(FRAG_DISPLAY, { uDye: { value: null } })
    };
  }

  // ---------- fluid ----------

  function createFluid(renderer, options) {
    const isMobile = !!(options && options.isMobile);

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const scene = new THREE.Scene();
    const geometry = createTriangle();
    const mesh = new THREE.Mesh(geometry, null);
    mesh.frustumCulled = false;
    scene.add(mesh);

    const materials = createMaterials();
    const velocity = createDoubleTarget(CONFIG.SIM_RES);
    const dye = createDoubleTarget(CONFIG.DYE_RES);
    const pressure = createDoubleTarget(CONFIG.SIM_RES);
    const divergence = createTarget(CONFIG.SIM_RES, CONFIG.SIM_RES);
    const curl = createTarget(CONFIG.SIM_RES, CONFIG.SIM_RES);
    let mask = createTarget(2, 2);

    const savedColor = new THREE.Color();
    const pointer = { has: false, x: 0, y: 0, prevX: 0, prevY: 0 };
    let viewWidth = window.innerWidth || 1;
    let viewHeight = window.innerHeight || 1;
    let lastMoveTime = 0;
    let disposed = false;
    let resetStroke = false;
    let accumulator = 0;

    function withSavedState(fn) {
      const prevTarget = renderer.getRenderTarget();
      const prevAutoClear = renderer.autoClear;
      const prevAlpha = renderer.getClearAlpha();
      renderer.getClearColor(savedColor);
      renderer.autoClear = false;
      try {
        fn();
      } finally {
        renderer.autoClear = prevAutoClear;
        renderer.setClearColor(savedColor, prevAlpha);
        renderer.setRenderTarget(prevTarget);
      }
    }

    function clearInitialTargets() {
      withSavedState(() => {
        renderer.setClearColor(0x000000, 0);
        [velocity.read, velocity.write, dye.read, dye.write, pressure.read, pressure.write, mask].forEach((target) => {
          renderer.setRenderTarget(target);
          renderer.clear(true, false, false);
        });
      });
    }

    function blit(material, target) {
      mesh.material = material;
      renderer.setRenderTarget(target);
      renderer.render(scene, camera);
    }

    function splat(target, ax, ay, bx, by, color, radius) {
      const u = materials.splat.uniforms;
      u.uTarget.value = target.read.texture;
      u.uA.value.set(ax / viewWidth, 1 - ay / viewHeight);
      u.uB.value.set(bx / viewWidth, 1 - by / viewHeight);
      u.uColor.value.set(color[0], color[1], color[2]);
      u.uRadius.value = radius;
      u.uAspect.value = viewWidth / viewHeight;
      blit(materials.splat, target.write);
      target.swap();
    }

    function applyPointer() {
      if (!pointer.has) return;
      const cx = pointer.x;
      const cy = pointer.y;
      const dx = cx - pointer.prevX;
      const dy = cy - pointer.prevY;
      const len = Math.hypot(dx, dy);
      if (len <= CONFIG.MIN_MOVE_PX) return;
      if (len > CONFIG.MAX_JUMP_PX) {
        pointer.prevX = cx;
        pointer.prevY = cy;
        return;
      }
      const sx = pointer.prevX;
      const sy = pointer.prevY;
      const nx = dx / len;
      const ny = dy / len;
      const speed = clampMap(len, 0, CONFIG.SPEED_LEN_MAX, 0, 1.0);
      const strength = speed * CONFIG.FORCE_MAX;
      const scale = isMobile ? CONFIG.RADIUS_SCALE_MOBILE : CONFIG.RADIUS_SCALE_DESKTOP;
      const radiusPx = clampMap(len, 0, CONFIG.RADIUS_LEN_MAX, 0, CONFIG.RADIUS_PX_MAX) * scale;
      const radius = radiusPx / CONFIG.RADIUS_UV_DIVISOR;
      if (radius > 0) {
        splat(velocity, sx, sy, cx, cy, [nx * strength, -ny * strength, 0], radius);
        splat(dye, sx, sy, cx, cy, [1, 1, 1], radius);
      }
      pointer.prevX = cx;
      pointer.prevY = cy;
    }

    function computeVorticity() {
      materials.curl.uniforms.uVelocity.value = velocity.read.texture;
      blit(materials.curl, curl);

      const v = materials.vorticity.uniforms;
      v.uVelocity.value = velocity.read.texture;
      v.uCurl.value = curl.texture;
      blit(materials.vorticity, velocity.write);
      velocity.swap();
    }

    function solvePressure() {
      materials.divergence.uniforms.uVelocity.value = velocity.read.texture;
      blit(materials.divergence, divergence);

      materials.clear.uniforms.uTexture.value = pressure.read.texture;
      blit(materials.clear, pressure.write);
      pressure.swap();

      const p = materials.pressure.uniforms;
      p.uDivergence.value = divergence.texture;
      for (let i = 0; i < CONFIG.PRESSURE_ITERATIONS; i++) {
        p.uPressure.value = pressure.read.texture;
        blit(materials.pressure, pressure.write);
        pressure.swap();
      }

      const g = materials.gradient.uniforms;
      g.uPressure.value = pressure.read.texture;
      g.uVelocity.value = velocity.read.texture;
      blit(materials.gradient, velocity.write);
      velocity.swap();
    }

    function advect(target, dissipation) {
      const a = materials.advect.uniforms;
      a.uVelocity.value = velocity.read.texture;
      a.uSource.value = target.read.texture;
      a.uDissipation.value = dissipation;
      blit(materials.advect, target.write);
      target.swap();
    }

    function renderMask() {
      materials.display.uniforms.uDye.value = dye.read.texture;
      blit(materials.display, mask);
    }

    function step(withPointer) {
      if (withPointer) applyPointer();
      computeVorticity();
      solvePressure();
      advect(velocity, CONFIG.VELOCITY_DISSIPATION);
      advect(dye, CONFIG.DENSITY_DISSIPATION);
    }

    // Fixed-step accumulator: simulation speed is independent of display rate.
    function runSteps(dt) {
      accumulator += dt;
      let steps = 0;
      while (accumulator >= CONFIG.SIM_DT && steps < CONFIG.MAX_STEPS_PER_FRAME) {
        step(steps === 0);
        accumulator -= CONFIG.SIM_DT;
        steps++;
      }
      if (steps === CONFIG.MAX_STEPS_PER_FRAME) accumulator = 0;
      if (steps > 0) {
        renderMask();
      }
    }

    clearInitialTargets();

    return {
      pointerMove(clientX, clientY) {
        if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return;
        const now = performance.now();
        if (!pointer.has || resetStroke || now - lastMoveTime > CONFIG.IDLE_RESET_MS) {
          pointer.has = true;
          resetStroke = false;
          pointer.prevX = clientX;
          pointer.prevY = clientY;
        }
        lastMoveTime = now;
        pointer.x = clientX;
        pointer.y = clientY;
      },

      pointerReset() {
        resetStroke = true;
      },

      update(dt) {
        if (disposed || !pointer.has) return;
        withSavedState(() => runSteps(dt));
      },

      resize(width, height) {
        if (disposed) return;
        viewWidth = Math.max(1, width);
        viewHeight = Math.max(1, height);
        const dpr = Math.min(renderer.getPixelRatio(), CONFIG.MASK_MAX_DPR);
        let w = viewWidth * dpr;
        let h = viewHeight * dpr;
        const over = Math.max(w, h) / CONFIG.MASK_MAX_SIZE;
        if (over > 1) {
          w /= over;
          h /= over;
        }
        const targetW = Math.max(1, Math.round(w));
        const targetH = Math.max(1, Math.round(h));
        if (mask.width === targetW && mask.height === targetH) return;
        // setSize disposes and reallocates the texture (empty), so immediately re-render the mask.
        mask.setSize(targetW, targetH);
        withSavedState(renderMask);
      },

      get velocityTexture() { return velocity.read.texture; },
      get densityTexture() { return mask.texture; },

      dispose() {
        if (disposed) return;
        disposed = true;
        velocity.dispose();
        dye.dispose();
        pressure.dispose();
        divergence.dispose();
        curl.dispose();
        mask.dispose();
        Object.keys(materials).forEach((k) => materials[k].dispose());
        geometry.dispose();
      }
    };
  }

  window.DSSS.createFluid = createFluid;
})();
