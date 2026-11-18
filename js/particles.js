(function () {
  'use strict';

  var CONFIG = Object.freeze({
    DESKTOP_SIZE: 512,
    MOBILE_SIZE: 128,
    GROUP_POSITION: Object.freeze([0.343, 0.16, -1]),
    GROUP_ROTATION_DEG: Object.freeze([-28.4, 390, 4.92]),
    GROUP_SCALE: Object.freeze([5, 5, 6]),
    BOUNDING_RADIUS: 10,
    FRAMES_PER_SECOND: 60,
    MOUSE_STRENGTH: 0.12,
    MAX_PUSH: 0.0018,
    MATCAP_URI: 'data:image/png;base64,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'
  });

  var COMMON_GLSL = [
    'vec3 safeNormalize(vec3 v) { return v / max(length(v), 1e-6); }'
  ].join('\n');

  var SIM_VERTEX = [
    'varying vec2 vUv;',
    'void main() {',
    '  vUv = uv;',
    '  gl_Position = vec4(position.xy, 0.0, 1.0);',
    '}'
  ].join('\n');

  var COPY_FRAGMENT = [
    'precision highp float;',
    'uniform sampler2D uSource;',
    'varying vec2 vUv;',
    'void main() { gl_FragColor = texture2D(uSource, vUv); }'
  ].join('\n');

  var CURL_GLSL = [
    // gradient of a 3-term sinusoidal scalar potential
    'vec3 potentialGrad(vec3 p, vec3 k1, vec3 k2, vec3 k3, vec3 ph) {',
    '  return k1 * cos(dot(k1, p) + ph.x)',
    '       + k2 * cos(dot(k2, p) + ph.y) * 0.6',
    '       + k3 * cos(dot(k3, p) + ph.z) * 0.35;',
    '}',
    'vec3 curlNoise(vec3 p) {',
    '  vec3 gx = potentialGrad(p, vec3(0.0, 2.1, 1.3), vec3(1.7, 0.0, 3.1), vec3(2.9, 1.1, 0.0), vec3(0.4, 1.9, 4.2));',
    '  vec3 gy = potentialGrad(p, vec3(1.9, 0.0, 2.3), vec3(0.0, 3.3, 1.1), vec3(1.3, 2.7, 2.2), vec3(2.2, 0.7, 5.1));',
    '  vec3 gz = potentialGrad(p, vec3(2.4, 1.6, 0.0), vec3(1.1, 0.0, 2.8), vec3(0.0, 2.2, 3.4), vec3(3.3, 5.5, 1.2));',
    // curl(psi) = (dPz/dy - dPy/dz, dPx/dz - dPz/dx, dPy/dx - dPx/dy)
    '  vec3 c = vec3(gz.y - gy.z, gx.z - gz.x, gy.x - gx.y);',
    '  return safeNormalize(c);',
    '}'
  ].join('\n');

  // Shape space (after mirror + quat rotation): p.x is the mirrored depth axis, p.x >= ~0.037.
  var SDF_GLSL = [
    'float smin(float a, float b, float k) {',
    '  float h = max(k - abs(a - b), 0.0) / k;',
    '  return min(a, b) - h * h * k * 0.25;',
    '}',
    'float smax(float a, float b, float k) { return -smin(-a, -b, k); }',
    'vec3 rotateByQuat(vec3 v, vec4 q) {',
    '  return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);',
    '}',
    // bent, tapered torus with a gap: ring in xz-plane around axis y
    'float bentRing(vec3 p) {',
    '  const vec2 C = vec2(0.14, 0.0);',
    '  const float R = 0.27;',
    '  vec2 d = p.xz - C;',
    '  float a = atan(d.y, d.x);',
    '  p.y += 0.09 * cos(2.0 * a + 0.6);',
    '  float tube = 0.07 + 0.032 * sin(a * 1.0 + 1.2) + 0.012 * sin(a * 3.0);',
    '  float ring = length(vec2(length(d) - R, p.y)) - tube;',
    '  vec3 gap = vec3(C.x + R * cos(2.6), 0.0, C.y + R * sin(2.6));',
    '  return smax(ring, -(length(p - gap) - 0.17), 0.06);',
    '}',
    // thinner twisted secondary ribbon-ring, perpendicular, blended softly
    'float twistRing(vec3 p) {',
    '  vec2 d = p.xy - vec2(0.2, 0.0);',
    '  float a = atan(d.y, d.x);',
    '  p.z += 0.07 * sin(2.0 * a + 1.0);',
    '  float tube = 0.028 + 0.012 * sin(a * 2.0);',
    '  return length(vec2(length(d) - 0.19, p.z)) - tube;',
    '}',
    'float sdfShape(vec3 p) {',
    '  p.z = sqrt(p.z * p.z + 0.0215) - sqrt(0.012);',
    '  p = rotateByQuat(p, vec4(0.5, 0.5, 0.5, 0.5));',
    '  if (length(p) > 0.8) return length(p) - 0.7;',
    // Uniform shrink so the ring (~0.7 diameter) fits beside the UI columns.
    '  const float S = 0.62;',
    '  vec3 q = p / S;',
    '  return smin(bentRing(q), twistRing(q), 0.08) * S;',
    '}',
    'vec3 sdfNormal(vec3 p) {',
    '  const float e = 0.001;',
    '  vec2 k = vec2(1.0, -1.0);',
    '  return safeNormalize(',
    '    k.xyy * sdfShape(p + k.xyy * e) + k.yyx * sdfShape(p + k.yyx * e) +',
    '    k.yxy * sdfShape(p + k.yxy * e) + k.xxx * sdfShape(p + k.xxx * e));',
    '}'
  ].join('\n');

  var SIM_MAIN_GLSL = [
    'vec3 applyFluid(vec3 pos) {',
    '  vec4 clip = uProjection * uView * uModel * vec4(pos, 1.0);',
    '  if (clip.w <= 0.0) return pos;',
    '  vec2 screenUV = clip.xy / clip.w * 0.5 + 0.5;',
    '  if (screenUV.x < 0.0 || screenUV.x > 1.0 || screenUV.y < 0.0 || screenUV.y > 1.0) return pos;',
    '  vec3 flow = vec3(texture2D(uFluidVelocity, screenUV).xy, 0.0);',
    '  flow = uModelInverseRotation * (uCameraRotation * flow);',
    '  float density = texture2D(uFluidDensity, screenUV).r;',
    '  vec3 push = flow * 0.0001 * uHZ * uMouseStrength * density;',
    '  float m = length(push);',
    '  float maxPush = uMaxPush * uHZ;',
    '  if (m > maxPush) push *= maxPush / m;',
    '  return pos + push;',
    '}',
    'void main() {',
    '  vec3 pos = texture2D(uPositions, vUv).xyz;',
    '  vec3 origin = texture2D(uOrigin, vUv).xyz;',
    '  if (length(pos) > 0.7) pos /= 2.0;',
    '  pos += curlNoise(pos * 0.1 + uTime * 0.05) * 1.0 * 0.0002 * uHZ;',
    '  vec3 gradient = sdfNormal(pos);',
    '  float sdf = sdfShape(pos);',
    '  pos += cross(safeNormalize(pos), gradient) * 0.0005 * uHZ;',
    '  float attract = 1.0 - pow(0.5, uHZ);',
    '  pos += -gradient * sdf * attract;',
    '  pos += (origin - pos) * 0.0002 * uHZ;',
    '  pos = applyFluid(pos);',
    '  gl_FragColor = vec4(pos, 1.0);',
    '}'
  ].join('\n');

  var SIM_FRAGMENT = [
    'precision highp float;',
    'uniform sampler2D uPositions;',
    'uniform sampler2D uOrigin;',
    'uniform sampler2D uFluidVelocity;',
    'uniform sampler2D uFluidDensity;',
    'uniform float uTime;',
    'uniform float uHZ;',
    'uniform float uMouseStrength;',
    'uniform float uMaxPush;',
    'uniform mat4 uProjection;',
    'uniform mat4 uView;',
    'uniform mat4 uModel;',
    'uniform mat3 uCameraRotation;',
    'uniform mat3 uModelInverseRotation;',
    'varying vec2 vUv;',
    COMMON_GLSL,
    CURL_GLSL,
    SDF_GLSL,
    SIM_MAIN_GLSL
  ].join('\n');

  var POINT_VERTEX = [
    'uniform sampler2D uPositions;',
    'uniform float uDPR;',
    'attribute vec4 random;',
    'varying vec4 vRandom;',
    'varying float vScale;',
    'void main() {',
    '  vec3 pos = texture2D(uPositions, position.xy).xyz;',
    '  pos *= mix(1.0, 1.5, pow(random.y, 150.0));',
    '  vec4 mv = modelViewMatrix * vec4(pos, 1.0);',
    '  float distToCamera = length(mv.xyz);',
    '  float scale = smoothstep(3.0, 15.0, distToCamera) * mix(0.5, 1.0, random.z);',
    '  gl_PointSize = 0.04 * uDPR * 2.0 * scale * (1000.0 / distToCamera);',
    '  gl_Position = projectionMatrix * mv;',
    '  vRandom = random;',
    '  vScale = scale;',
    '}'
  ].join('\n');

  var POINT_FRAGMENT = [
    'uniform sampler2D uMatcap;',
    'uniform float uTime;',
    'varying vec4 vRandom;',
    'varying float vScale;',
    'vec3 softLight(vec3 a, vec3 b) {',
    '  vec3 low = 2.0 * a * b + a * a * (1.0 - 2.0 * b);',
    '  vec3 high = sqrt(a) * (2.0 * b - 1.0) + 2.0 * a * (1.0 - b);',
    '  return mix(low, high, step(0.5, b));',
    '}',
    'vec3 overlay(vec3 a, vec3 b) {',
    '  vec3 low = 2.0 * a * b;',
    '  vec3 high = 1.0 - 2.0 * (1.0 - a) * (1.0 - b);',
    '  return mix(low, high, step(0.5, a));',
    '}',
    'vec2 rotateUv(vec2 uv, float angle) {',
    '  float s = sin(angle); float c = cos(angle);',
    '  vec2 d = uv - 0.5;',
    '  return vec2(c * d.x - s * d.y, s * d.x + c * d.y) + 0.5;',
    '}',
    'void main() {',
    '  if (length(gl_PointCoord - 0.5) > 0.5) discard;',
    '  if (vScale < 0.1) discard;',
    '  vec3 bone = vec3(0.91, 0.89, 0.84) * mix(0.15, 0.45, vRandom.x);',
    '  vec3 vermillon = vec3(0.89, 0.26, 0.20) * 1.8;',
    '  vec3 color = mix(bone, vermillon, pow(vRandom.z, 90.0));',
    '  float sparkle = 0.5 + (0.4 + sin(uTime * 4.0 + vRandom.y * 20.0)) * pow(vRandom.z, 10.0) * 2.5;',
    '  color *= sparkle;',
    '  float angle = sin(uTime + vRandom.z * 20.0) * 0.5 + 1.0;',
    '  vec3 m = texture2D(uMatcap, rotateUv(gl_PointCoord, angle)).rgb;',
    '  color = mix(color, softLight(color, m), 0.8);',
    '  color = mix(color, overlay(color, m), 0.2);',
    '  gl_FragColor = vec4(color, 1.0);',
    '}'
  ].join('\n');

  function requireThree() {
    if (typeof THREE === 'undefined') {
      throw new Error('DSSS.createParticles: global THREE is not defined; load three.js before particles.js.');
    }
  }

  function pickTargetType(renderer) {
    return renderer.extensions.has('EXT_color_buffer_float') ? THREE.FloatType : THREE.HalfFloatType;
  }

  function createTarget(size, type) {
    return new THREE.WebGLRenderTarget(size, size, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: type,
      depthBuffer: false,
      stencilBuffer: false
    });
  }

  function createOriginTexture(size) {
    var count = size * size;
    var data = new Float32Array(count * 4);
    for (var i = 0; i < count; i++) {
      data[i * 4] = Math.random() * 2 - 1;
      data[i * 4 + 1] = Math.random() * 2 - 1;
      data[i * 4 + 2] = Math.random() * 2 - 1;
      data[i * 4 + 3] = 1;
    }
    var tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.FloatType);
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    return tex;
  }

  function createGeometry(size) {
    var count = size * size;
    var position = new Float32Array(count * 3);
    var random = new Float32Array(count * 4);
    for (var i = 0; i < count; i++) {
      position[i * 3] = ((i % size) + 0.5) / size;
      position[i * 3 + 1] = (Math.floor(i / size) + 0.5) / size;
      random[i * 4] = Math.random();
      random[i * 4 + 1] = Math.random();
      random[i * 4 + 2] = Math.random();
      random[i * 4 + 3] = Math.random();
    }
    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
    geometry.setAttribute('random', new THREE.BufferAttribute(random, 4));
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), CONFIG.BOUNDING_RADIUS);
    return geometry;
  }

  function createGroup() {
    var group = new THREE.Group();
    var rot = CONFIG.GROUP_ROTATION_DEG.map(function (d) { return THREE.MathUtils.degToRad(d); });
    group.position.fromArray(CONFIG.GROUP_POSITION);
    group.rotation.set(rot[0], rot[1], rot[2]);
    group.scale.fromArray(CONFIG.GROUP_SCALE);
    group.updateMatrixWorld(true);
    return group;
  }

  function createMatcapTexture() {
    return new THREE.TextureLoader().load(CONFIG.MATCAP_URI);
  }

  function createSimMaterial(originTexture) {
    var blank = new THREE.Texture();
    return new THREE.ShaderMaterial({
      uniforms: {
        uPositions: { value: null },
        uOrigin: { value: originTexture },
        uTime: { value: 0 },
        uHZ: { value: 1 },
        uMouseStrength: { value: CONFIG.MOUSE_STRENGTH },
        uMaxPush: { value: CONFIG.MAX_PUSH },
        uFluidVelocity: { value: blank },
        uFluidDensity: { value: blank },
        uProjection: { value: new THREE.Matrix4() },
        uView: { value: new THREE.Matrix4() },
        uModel: { value: new THREE.Matrix4() },
        uCameraRotation: { value: new THREE.Matrix3() },
        uModelInverseRotation: { value: new THREE.Matrix3() }
      },
      vertexShader: SIM_VERTEX,
      fragmentShader: SIM_FRAGMENT,
      depthTest: false,
      depthWrite: false
    });
  }

  function createDrawMaterial(matcap) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uPositions: { value: null },
        uTime: { value: 0 },
        uDPR: { value: 1 },
        uMatcap: { value: matcap }
      },
      vertexShader: POINT_VERTEX,
      fragmentShader: POINT_FRAGMENT,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthTest: true,
      depthWrite: false
    });
  }

  function createQuadScene(material) {
    var scene = new THREE.Scene();
    var mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    mesh.frustumCulled = false;
    scene.add(mesh);
    return { scene: scene, mesh: mesh };
  }

  function createParticles(renderer, options) {
    requireThree();
    var isMobile = !!(options && options.isMobile);
    var size = isMobile ? CONFIG.MOBILE_SIZE : CONFIG.DESKTOP_SIZE;
    var type = pickTargetType(renderer);

    var targets = [createTarget(size, type), createTarget(size, type)];
    var readIndex = 0;
    var originTexture = createOriginTexture(size);
    var simMaterial = createSimMaterial(originTexture);
    var copyMaterial = new THREE.ShaderMaterial({
      uniforms: { uSource: { value: originTexture } },
      vertexShader: SIM_VERTEX,
      fragmentShader: COPY_FRAGMENT,
      depthTest: false,
      depthWrite: false
    });
    var simQuad = createQuadScene(simMaterial);
    var copyQuad = createQuadScene(copyMaterial);
    var simCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    var matcap = createMatcapTexture();
    var geometry = createGeometry(size);
    var drawMaterial = createDrawMaterial(matcap);
    var points = new THREE.Points(geometry, drawMaterial);
    points.frustumCulled = false;
    var group = createGroup();
    group.add(points);

    var modelRotation = new THREE.Matrix4().extractRotation(group.matrixWorld);
    var modelInverseRotation = new THREE.Matrix3().setFromMatrix4(modelRotation).transpose();

    function withState(fn) {
      var prevTarget = renderer.getRenderTarget();
      var prevAutoClear = renderer.autoClear;
      renderer.autoClear = true;
      try {
        fn();
      } finally {
        renderer.setRenderTarget(prevTarget);
        renderer.autoClear = prevAutoClear;
      }
    }

    function seedTargets() {
      withState(function () {
        for (var i = 0; i < targets.length; i++) {
          renderer.setRenderTarget(targets[i]);
          renderer.render(copyQuad.scene, simCamera);
        }
      });
      drawMaterial.uniforms.uPositions.value = targets[readIndex].texture;
    }

    function setSimUniforms(params) {
      var u = simMaterial.uniforms;
      var camera = params.camera;
      u.uPositions.value = targets[readIndex].texture;
      u.uTime.value = params.time;
      u.uHZ.value = params.dt * CONFIG.FRAMES_PER_SECOND;
      u.uFluidVelocity.value = params.fluidVelocity;
      u.uFluidDensity.value = params.fluidDensity;
      u.uProjection.value.copy(camera.projectionMatrix);
      u.uView.value.copy(camera.matrixWorldInverse);
      u.uModel.value.copy(group.matrixWorld);
      u.uCameraRotation.value.setFromMatrix4(camera.matrixWorld);
      u.uModelInverseRotation.value.copy(modelInverseRotation);
    }

    function update(params) {
      setSimUniforms(params);
      var writeIndex = 1 - readIndex;
      withState(function () {
        renderer.setRenderTarget(targets[writeIndex]);
        renderer.render(simQuad.scene, simCamera);
      });
      readIndex = writeIndex;
      drawMaterial.uniforms.uPositions.value = targets[readIndex].texture;
      drawMaterial.uniforms.uTime.value = params.time;
    }

    function resize(width, height, dpr) {
      drawMaterial.uniforms.uDPR.value = dpr;
    }

    function dispose() {
      targets.forEach(function (t) { t.dispose(); });
      originTexture.dispose();
      matcap.dispose();
      geometry.dispose();
      drawMaterial.dispose();
      simMaterial.dispose();
      copyMaterial.dispose();
      simQuad.mesh.geometry.dispose();
      copyQuad.mesh.geometry.dispose();
      group.remove(points);
    }

    seedTargets();
    return { object: group, update: update, resize: resize, dispose: dispose };
  }

  window.DSSS = window.DSSS || {};
  window.DSSS.createParticles = createParticles;
})();
