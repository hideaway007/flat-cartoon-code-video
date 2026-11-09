// stage.js - the shot renderer (production/stage.py + engine.py) on the GPU with three.js.
// Input: stage_assets/<seg>_<t0>-<t1>.json from export_stage.py. Every Python layer kind keeps its maths:
//   plate  - set layers, cam_affine with parallax depth (default 0.6), cover scale, shake x depth
//   char   - image layers (crowd strips): anchor, motion_offset (bob / drift ...), timed swaps with crossfade, tint
//   toon   - code-drawn characters drawn LIVE by toonjs (Canvas2D at SS x), outer contour on the GPU, exact 3x3
//            area downsample, contact shadows, depth-of-field blur / haze / tint
//   overlay- explainer graphics drawn by stagejs/overlays.js on a HUD canvas at their place in the layer order
// then per shot grade + vignette, the transition (fade / whip with motion blur) and the paper grain.
// Deterministic: window.renderFrameAt(fi) depends on fi only.
import * as THREE from 'three';
import * as R from '../toonjs/render.js';
import * as AN from '../toonjs/anim.js';
import { make3D } from './stage3d.js';
import { makeOneTake } from './onetake.js';

THREE.ColorManagement.enabled = false;
const Q = new URLSearchParams(location.search);
const DATA = await (await fetch(Q.get('data'))).json();
const W = DATA.W, H = DATA.H, FPS = DATA.fps, SS = 3;
const N = Math.round((DATA.t1 - DATA.t0) * FPS);

let OV = null;
try { OV = await import('./overlays.js'); await OV.init(new URL('../', import.meta.url).pathname); } catch (e) { console.warn('overlays unavailable: ' + e); OV = null; }

// ------------------------------------------------------------------------------------------------ renderer
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
document.body.appendChild(renderer.domElement);
const gl = renderer.getContext();
const cam2d = new THREE.OrthographicCamera(0, W, 0, H, -10, 10);          // screen px, y down
const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const unit = new THREE.PlaneGeometry(1, 1).translate(0.5, 0.5, 0);       // unit square [0,1]^2
const quadGeo = new THREE.PlaneGeometry(2, 2);
const makeRT = (w, h, { mips = false, half = false, depth = false } = {}) => {
  const rt = new THREE.WebGLRenderTarget(w, h, { depthBuffer: depth, type: half ? THREE.HalfFloatType : THREE.UnsignedByteType });
  rt.texture.colorSpace = THREE.NoColorSpace;
  if (mips) { rt.texture.generateMipmaps = true; rt.texture.minFilter = THREE.LinearMipmapLinearFilter; }
  return rt;
};
const bgr = (c, d = [1, 1, 1]) => (c ? new THREE.Vector3(c[2], c[1], c[0]) : new THREE.Vector3(...d));

// 2x3 affine helpers ([[a,b,c],[d,e,f]])
const compose = (A, B) => [
  [A[0][0] * B[0][0] + A[0][1] * B[1][0], A[0][0] * B[0][1] + A[0][1] * B[1][1], A[0][0] * B[0][2] + A[0][1] * B[1][2] + A[0][2]],
  [A[1][0] * B[0][0] + A[1][1] * B[1][0], A[1][0] * B[0][1] + A[1][1] * B[1][1], A[1][0] * B[0][2] + A[1][1] * B[1][2] + A[1][2]]];
const ap = (A, p) => [A[0][0] * p[0] + A[0][1] * p[1] + A[0][2], A[1][0] * p[0] + A[1][1] * p[1] + A[1][2]];
function setAffine(mesh, A) {             // unit square -> screen through the 2x3 A
  mesh.matrix.set(A[0][0], A[0][1], 0, A[0][2], A[1][0], A[1][1], 0, A[1][2], 0, 0, 1, 0, 0, 0, 0, 1);
  mesh.matrixWorldNeedsUpdate = true;
}
const imgToUnit = (w, h) => [[w, 0, 0], [0, -h, h]];   // unit square (y up) -> image px (y down)

// ------------------------------------------------------------------------------------------------ materials
const VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const QVS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const PREMUL = { transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide,
  blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor };

// sprite: premultiplied texture, sub-rect uv, padding (for blur spill), mode 0 = bilinear, 1 = exact SS area
// downsample (toons), gaussian DOF blur (sigma in local px), haze, tint, opacity
function spriteMat() {
  return new THREE.ShaderMaterial({ ...PREMUL,
    uniforms: { map: { value: null }, rect: { value: new THREE.Vector4(0, 0, 1, 1) }, pad: { value: new THREE.Vector2() },
      px: { value: new THREE.Vector2(1, 1) }, texel: { value: new THREE.Vector2() }, mode: { value: 0 }, sigma: { value: 0 },
      haze: { value: 0 }, hazeCol: { value: new THREE.Vector3() }, tint: { value: new THREE.Vector3(1, 1, 1) }, opacity: { value: 1 },
      rimDir: { value: new THREE.Vector2() }, rimAmt: { value: 0 }, rimCol: { value: new THREE.Vector3(1, 0.8, 0.5) },
      desat: { value: 0 } },
    vertexShader: VS, fragmentShader: `
    uniform sampler2D map; uniform vec4 rect; uniform vec2 pad, px, texel; uniform int mode; uniform float sigma, haze, opacity;
    uniform vec3 hazeCol, tint, rimCol; uniform vec2 rimDir; uniform float rimAmt, desat; varying vec2 vUv;
    // NOTE: sample unconditionally and mask: a texture fetch inside a divergent branch gets a garbage mip level at
    // the card edges (thin dark frames around cards seen at an angle)
    float inside(vec2 l){ return step(0.0, l.x) * step(0.0, l.y) * step(l.x, 1.0) * step(l.y, 1.0); }
    vec4 at(vec2 l){                              // l: local 0..1 inside the image
      vec2 uv = mix(rect.xy, rect.zw, clamp(l, 0.0, 1.0));
      if (mode == 1) {                            // INTER_AREA 3x3 of the SS texture at this output pixel
        vec4 s = vec4(0.0);
        for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) s += textureLod(map, uv + vec2(float(i), float(j)) * texel, 0.0);
        return s / 9.0 * inside(l);
      }
      return texture2D(map, uv) * inside(l);
    }
    void main(){
      vec2 l = vUv * (1.0 + 2.0 * pad) - pad;
      vec4 c;
      if (sigma < 0.3) c = at(l);
      else {                                      // gaussian, sigma in output px (Vogel disc, weighted)
        c = vec4(0.0); float wsum = 0.0;
        for (int i = 0; i < 48; i++) {
          float r = sqrt((float(i) + 0.5) / 48.0) * 2.6 * sigma, th = float(i) * 2.3999632;
          float w = exp(-0.5 * r * r / (sigma * sigma));
          vec2 lb = l + r * vec2(cos(th), sin(th)) / px;
          c += w * texture2D(map, mix(rect.xy, rect.zw, clamp(lb, 0.0, 1.0))) * inside(lb);   // mip-filtered when blurred
          wsum += w;
        }
        c /= wsum;
      }
      if (rimAmt > 0.0) {                         // rim light: the edge facing the light (rimDir: local units)
        float a2 = at(l + rimDir).a, a3 = at(l + rimDir * 0.5).a;
        float rim = clamp(c.a - min(a2, a3), 0.0, 1.0);
        c.rgb += rimCol * rim * rimAmt * c.a;
      }
      c.rgb *= tint;
      c.rgb = mix(c.rgb, vec3(dot(c.rgb, vec3(0.3, 0.55, 0.15))), desat);
      c.rgb = c.rgb * (1.0 - haze) + hazeCol * c.a * haze;
      gl_FragColor = c * opacity;
    }` });
}
// contact shadow: up to 3 soft ellipses, frame *= 1 - mask * k   (dst * (1 - srcAlpha))
function shadowMat() {
  return new THREE.ShaderMaterial({ transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.CustomBlending, blendSrc: THREE.ZeroFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
    uniforms: { e: { value: [new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4()] }, n: { value: 0 }, soft: { value: 5 }, k: { value: 0.3 } },
    vertexShader: VS, fragmentShader: `
    uniform vec4 e[3]; uniform int n; uniform float soft, k; varying vec2 vUv;
    void main(){
      vec2 p = vec2(vUv.x * ${W}.0, (1.0 - vUv.y) * ${H}.0);
      float m = 0.0;
      for (int i = 0; i < 3; i++) {
        if (i >= n) break;
        vec2 d = (p - e[i].xy) / e[i].zw;
        float dist = (length(d) - 1.0) * min(e[i].z, e[i].w);         // ~ px outside the ellipse edge
        m = max(m, 1.0 - smoothstep(-1.6 * soft, 1.6 * soft, dist));
      }
      gl_FragColor = vec4(0.0, 0.0, 0.0, m * k);
    }` });
}
// toon outer contour (toon.silhouette) - exact disk dilation of alpha > 0.5 in two passes, ink under the drawing
const silRow = new THREE.ShaderMaterial({ uniforms: { src: { value: null }, texel: { value: new THREE.Vector2() }, k: { value: 1 } },
  vertexShader: QVS, fragmentShader: `
  uniform sampler2D src; uniform vec2 texel; uniform float k; varying vec2 vUv;
  void main(){
    float best = 255.0;
    for (int i = -32; i <= 32; i++) { float fi = float(i); if (abs(fi) > k) continue;
      if (texture2D(src, vUv + vec2(fi * texel.x, 0.0)).a > 0.5) best = min(best, abs(fi)); }
    gl_FragColor = vec4(best / 255.0, 0.0, 0.0, 1.0);
  }` });
const silCol = new THREE.ShaderMaterial({ uniforms: { src: { value: null }, rows: { value: null }, texel: { value: new THREE.Vector2() },
  k: { value: 1 }, ink: { value: new THREE.Vector3(26 / 255, 24 / 255, 30 / 255) } },
  vertexShader: QVS, fragmentShader: `
  uniform sampler2D src, rows; uniform vec2 texel; uniform float k; uniform vec3 ink; varying vec2 vUv;
  void main(){
    vec4 c = texture2D(src, vUv);                       // straight alpha (canvas upload)
    float dil = 0.0;
    for (int j = -32; j <= 32; j++) { float fj = float(j); if (abs(fj) > k) continue;
      float dx = texture2D(rows, vUv + vec2(0.0, fj * texel.y)).r * 255.0;
      if (dx < 254.5 && dx * dx + fj * fj <= k * k + 0.25) { dil = 1.0; break; } }
    gl_FragColor = vec4(c.rgb * c.a + ink * (1.0 - c.a) * dil, c.a + (1.0 - c.a) * dil);   // premultiplied
  }` });
const quadScene = new THREE.Scene(); const quad = new THREE.Mesh(quadGeo); quadScene.add(quad);
function pass(mat, target) { quad.material = mat; renderer.setRenderTarget(target); renderer.render(quadScene, quadCam); }

// ------------------------------------------------------------------------------------------------ textures
const loader = new THREE.TextureLoader();
const texCache = new Map();
function tex(src) {
  if (!texCache.has(src)) texCache.set(src, new Promise((ok, bad) => loader.load('/' + src, (t) => {
    t.colorSpace = THREE.NoColorSpace; t.premultiplyAlpha = true; t.generateMipmaps = true;   // mips: 3D depth of field
    t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.needsUpdate = true; ok(t);
  }, undefined, bad)));
  return texCache.get(src);
}
const T = {};
await Promise.all(DATA.shots.flatMap((s) => s.layers.flatMap((L) =>
  L.kind === 'plate' ? [L.src] : L.kind === 'char' ? [L.src, ...(L.swaps || []).map((x) => x[1])] : []))
  .filter((v, i, a) => a.indexOf(v) === i).map(async (src) => { T[src] = await tex(src); }));

// ------------------------------------------------------------------------------------------------ shot scenes
function buildShot(sh) {
  if (sh._scene) return sh._scene;
  const scene = new THREE.Scene(); let order = 0;
  const add = (mesh) => { mesh.matrixAutoUpdate = false; mesh.renderOrder = order++; mesh.frustumCulled = false; scene.add(mesh); return mesh; };
  let hud = null;
  for (const L of sh.layers) {
    if (L.kind === 'overlay') {
      if (!hud) {                                            // consecutive overlays share one HUD canvas
        const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
        const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.NoColorSpace; tx.premultiplyAlpha = true;
        tx.generateMipmaps = false; tx.minFilter = THREE.LinearFilter;
        const m = spriteMat(); m.uniforms.map.value = tx;
        hud = { cv, cx: cv.getContext('2d'), tx, layers: [], mesh: add(new THREE.Mesh(unit, m)) };
        setAffine(hud.mesh, [[W, 0, 0], [0, -H, H]]);
        L._hud = hud;
      }
      hud.layers.push(L);
      continue;
    }
    hud = null;
    if (L.kind === 'plate' || L.kind === 'char') {
      L._meshes = (L.kind === 'char' ? [0, 1] : [0]).map(() => add(new THREE.Mesh(unit, spriteMat())));
    } else if (L.kind === 'toon') {
      if (L.shadow !== false) L._shadow = add(new THREE.Mesh(unit, shadowMat()));
      L._mesh = add(new THREE.Mesh(unit, spriteMat()));
      L._mesh.material.uniforms.mode.value = 1;
      L._cv = document.createElement('canvas'); L._cv.width = L._cv.height = 16;
      L._grow = (w, h) => {                                  // grow-only SS canvas + its GPU buffers
        if (L._cv.width < w || L._cv.height < h || !L._tx) {
          L._cv.width = Math.max(L._cv.width, Math.ceil(w / 256) * 256); L._cv.height = Math.max(L._cv.height, Math.ceil(h / 256) * 256);
          for (const o of [L._tx, L._rows, L._sil]) o && o.dispose();
          L._tx = new THREE.CanvasTexture(L._cv); L._tx.colorSpace = THREE.NoColorSpace;
          L._tx.generateMipmaps = false; L._tx.minFilter = L._tx.magFilter = THREE.NearestFilter;
          L._rows = makeRT(L._cv.width, L._cv.height); L._sil = makeRT(L._cv.width, L._cv.height, { mips: true });
        }
        return L._cv;
      };
      L.D = L.D; L.phase = L.phase || 0;
    }
  }
  sh._scene = scene;
  return scene;
}

function drawPlate(L, cam, tn, shk) {
  const t = T[L.src], w = t.image.width, h = t.image.height, m = L._meshes[0];
  const cover = Math.max(W / w, H / h) * (L.scale ?? 1.12), fl = L.flip ? -1 : 1, [ox, oy] = L.offset ?? [0, 0];
  const place = [[cover * fl, 0, W / 2 - fl * cover * w / 2 + ox], [0, cover, H / 2 - cover * h / 2 + oy]];
  const d = L.depth ?? 0.6, A = compose(AN.cam_affine(cam, d, tn, W, H), place);
  A[0][2] += shk[0] * d; A[1][2] += shk[1] * d;
  setAffine(m, compose(A, imgToUnit(w, h)));
  const u = m.material.uniforms; u.map.value = t; u.tint.value.copy(bgr(L.tint));
  if (L.blur) { const k = Math.trunc(L.blur) * 2 + 1; u.sigma.value = 0.3 * ((k - 1) * 0.5 - 1) + 0.8; u.px.value.set(w * cover, h * cover); }
}

function drawChar(L, cam, tn, t, shk) {
  const entries = [[0.0, L.src, {}], ...(L.swaps || []).map((s) => [s[0], s[1], s[2] || {}])];
  let k = 0; entries.forEach((e, i) => { if (t >= e[0]) k = i; });
  const swaps = entries.slice(1).map((e) => [e[0], e[2]]);
  let poses = [[entries[k][1], 1.0]];
  const xf = k > 0 ? (entries[k][2].xf ?? 0.05) : 0;
  if (k > 0 && t - entries[k][0] < xf) { const w = (t - entries[k][0]) / xf; poses = [[entries[k - 1][1], 1 - w], [entries[k][1], w]]; }
  const [mdx, mdy, msc, rot] = AN.motion_offset(L.motions || [], t, swaps);
  L._meshes.forEach((m, i) => {
    const pz = poses[i]; m.visible = !!pz;
    if (!pz) return;
    const tx = T[pz[0]], s = L.scale * msc, fl = L.flip ? -1 : 1, c = Math.cos(rot), sn = Math.sin(rot);
    const M = [[c * s * fl, -sn * s], [sn * s * fl, c * s]];
    const anc = L.anchor_src;
    const tr = [L.pos[0] + mdx - (M[0][0] * anc[0] + M[0][1] * anc[1]), L.pos[1] + mdy - (M[1][0] * anc[0] + M[1][1] * anc[1])];
    const d = L.depth ?? 1.0, A = compose(AN.cam_affine(cam, d, tn, W, H), [[M[0][0], M[0][1], tr[0]], [M[1][0], M[1][1], tr[1]]]);
    A[0][2] += shk[0] * d; A[1][2] += shk[1] * d;
    setAffine(m, compose(A, imgToUnit(tx.image.width, tx.image.height)));
    const u = m.material.uniforms; u.map.value = tx; u.opacity.value = pz[1]; u.tint.value.copy(bgr(L.tint));
  });
}

let charMs = 0;
function drawToon(L, cam, tn, t, shk) {
  const t0 = performance.now();
  const p = AN.pose_at(L, t);
  const swaps = L.keys.slice(1).map((k) => [k[0], k[2] || {}]);
  const [mdx, mdy, msc, r] = AN.motion_offset(L.motions || [], t, swaps);
  const s = L.scale * msc, x = L.pos[0] + mdx, y = L.pos[1] + mdy;
  const place = [[s * Math.cos(r), -s * Math.sin(r), x], [s * Math.sin(r), s * Math.cos(r), y]];
  const A = compose(AN.cam_affine(cam, L.depth ?? 1.0, tn, W, H), place);
  A[0][2] += shk[0]; A[1][2] += shk[1];
  const sc = Math.sqrt(Math.abs(A[0][0] * A[1][1] - A[0][1] * A[1][0]));
  if (L._shadow) {
    const fl = L.flip ? -1 : 1, rig = L.D.rig;
    const [feet, rx] = rig === 'bust' ? [[-150, 150], 130] : rig === 'horse' ? [[-200, 0, 200], 170] : [p.feet, 78];
    const u = L._shadow.material.uniforms; u.n.value = feet.length;
    feet.forEach((fx, i) => { const q = ap(A, [fl * fx, 0]); u.e.value[i].set(q[0], q[1], rx * sc, 16 * sc); });
    setAffine(L._shadow, [[W, 0, 0], [0, -H, H]]);
  }
  const r2 = R.renderChar(L.D, p, A, { flip: !!L.flip, idle: AN.idle_at(L, t), clip: [W, H], raw: true, sil: false, canvas: L._grow });
  const m = L._mesh; m.visible = !!r2;
  if (!r2) return;
  const cv = L._cv, CW = cv.width, CH = cv.height;
  L._tx.needsUpdate = true;
  // outer contour on the GPU (k = Python pt.lw(LINE * 0.55) at SS)
  const k = Math.max(1, Math.round(11.0 * 0.55 * sc * SS));
  silRow.uniforms.src.value = L._tx; silRow.uniforms.texel.value.set(1 / CW, 1 / CH); silRow.uniforms.k.value = k;
  pass(silRow, L._rows);
  silCol.uniforms.src.value = L._tx; silCol.uniforms.rows.value = L._rows.texture; silCol.uniforms.texel.value.set(1 / CW, 1 / CH);
  silCol.uniforms.k.value = k;
  pass(silCol, L._sil);
  const sw = r2.x1 - r2.x0, shh = r2.y1 - r2.y0, blur = +(L.blur || 0), pad = blur > 0.3 ? Math.ceil(blur * 3) : 0;
  setAffine(m, [[sw + 2 * pad, 0, r2.x0 - pad], [0, -(shh + 2 * pad), r2.y0 + shh + pad]]);
  const u = m.material.uniforms;
  u.map.value = L._sil.texture; u.rect.value.set(0, 1 - r2.h / CH, r2.w / CW, 1);
  u.pad.value.set(pad / sw, pad / shh); u.px.value.set(sw, shh); u.texel.value.set(1 / CW, 1 / CH);
  u.sigma.value = blur > 0.3 ? blur : 0; u.haze.value = +(L.haze || 0);
  u.hazeCol.value.copy(bgr(L.haze_col, [0.88, 0.86, 0.86])); u.tint.value.copy(bgr(L.tint));
  charMs += performance.now() - t0;
}

function drawHud(hud, sh, t, tn, shk) {
  const cx = hud.cx; cx.setTransform(1, 0, 0, 1, 0, 0); cx.clearRect(0, 0, W, H);
  if (OV) for (const L of hud.layers) { cx.save(); try { OV.drawOverlay(cx, L, sh, t, tn, shk); } catch (e) { console.warn(`overlay ${L.type}: ${e}`); } cx.restore(); }
  hud.tx.needsUpdate = true;
}

// screen-space overlays drawn over an already rendered target (3D shots)
const hud3 = (() => { const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.NoColorSpace; tx.premultiplyAlpha = true; tx.generateMipmaps = false; tx.minFilter = THREE.LinearFilter;
  const m = spriteMat(); m.uniforms.map.value = tx; const mesh = new THREE.Mesh(unit, m); mesh.matrixAutoUpdate = false; setAffine(mesh, [[W, 0, 0], [0, -H, H]]);
  const scene = new THREE.Scene(); scene.add(mesh); return { cv, cx: cv.getContext('2d'), tx, scene }; })();
function drawOverlays(sh, t, layers, target) {
  if (!layers.length || !OV) return;
  const tn = Math.min(t / (sh.end - sh.start), 1.0), e = OV.extraShake ? OV.extraShake(sh, t) || [0, 0] : [0, 0];
  const shk = AN.shake_offset(sh.shake, t); shk[0] += e[0]; shk[1] += e[1];
  const cx = hud3.cx; cx.setTransform(1, 0, 0, 1, 0, 0); cx.clearRect(0, 0, W, H);
  for (const L of layers) { cx.save(); try { OV.drawOverlay(cx, L, { ...sh, cam: {} }, t, tn, shk); } catch (err) { console.warn(`overlay ${L.type}: ${err}`); } cx.restore(); }
  hud3.tx.needsUpdate = true;
  renderer.setRenderTarget(target); renderer.autoClear = false; renderer.render(hud3.scene, cam2d); renderer.autoClear = true;
}
const S3 = make3D({ renderer, W, H, T, spriteMat, silRow, silCol, pass, makeRT, OV, drawOverlays });
const OT = Q.has('onetake') ? makeOneTake({ renderer, W, H, T, spriteMat, silRow, silCol, pass, makeRT, OV, DATA, drawOverlays }) : null;

function renderShot(sh, t, target) {
  if (S3.has(sh)) return S3.render(sh, t, target, sh.layers.filter((L) => L.kind === 'overlay'));
  const scene = buildShot(sh);
  const tn = Math.min(t / (sh.end - sh.start), 1.0);
  let shk = AN.shake_offset(sh.shake, t);
  if (OV && OV.extraShake && sh.layers.some((L) => L.kind === 'overlay')) { const e = OV.extraShake(sh, t) || [0, 0]; shk = [shk[0] + e[0], shk[1] + e[1]]; }
  for (const L of sh.layers) {
    if (L.kind === 'plate') drawPlate(L, sh.cam, tn, shk);
    else if (L.kind === 'char') drawChar(L, sh.cam, tn, t, shk);
    else if (L.kind === 'toon') drawToon(L, sh.cam, tn, t, shk);
    else if (L.kind === 'overlay' && L._hud) drawHud(L._hud, sh, t, tn, shk);
  }
  renderer.setRenderTarget(target); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(scene, cam2d);
}

// ------------------------------------------------------------------------------------------------ final pass
const paperTex = (() => {          // engine.paper(): low-frequency mottling + fine grain (seeded, statistically equal)
  let s = 3 >>> 0; const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const lw = 241, lh = 136, low = new Float32Array(lw * lh).map(() => r() * 2 - 1), data = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const fx = x / W * (lw - 1), fy = y / H * (lh - 1), ix = fx | 0, iy = fy | 0, ax = fx - ix, ay = fy - iy;
    const l = (low[iy * lw + ix] * (1 - ax) + low[iy * lw + ix + 1] * ax) * (1 - ay) + (low[(iy + 1) * lw + ix] * (1 - ax) + low[(iy + 1) * lw + ix + 1] * ax) * ay;
    data[y * W + x] = Math.round(((1 + 0.035 * l * 0.6 + 0.018 * (r() * 2 - 1) * 1.5) - 0.9) / 0.2 * 255);
  }
  const t = new THREE.DataTexture(data, W, H, THREE.RedFormat); t.needsUpdate = true; t.flipY = true; return t;
})();
const rtA = makeRT(W, H, { half: true, depth: true }), rtB = makeRT(W, H, { half: true, depth: true });
const finalMat = new THREE.ShaderMaterial({
  uniforms: { a: { value: rtA.texture }, b: { value: rtB.texture }, paper: { value: paperTex },
    mulA: { value: new THREE.Vector3(1, 1, 1) }, addA: { value: new THREE.Vector3() }, vigA: { value: 0.25 },
    mulB: { value: new THREE.Vector3(1, 1, 1) }, addB: { value: new THREE.Vector3() }, vigB: { value: 0.25 },
    mode: { value: 0 }, u: { value: 0 }, dir: { value: 1 }, paperK: { value: 1 } },
  vertexShader: QVS, fragmentShader: `
  uniform sampler2D a, b, paper; uniform vec3 mulA, addA, mulB, addB; uniform float vigA, vigB, u, dir, paperK; uniform int mode;
  varying vec2 vUv;
  vec3 shot(sampler2D t, vec2 uv, vec3 mul, vec3 add, float vig){       // grade + vignette of one shot (render_shot)
    if (uv.x < 0.0 || uv.x > 1.0) return vec3(0.0);
    vec3 c = texture2D(t, uv).rgb * mul + add;
    vec2 q = (uv - 0.5) * 2.0;
    return c * (1.0 - vig * pow(clamp(length(q) - 0.45, 0.0, 1.0), 1.6));
  }
  vec3 shifted(sampler2D t, float dx, float bw, vec3 mul, vec3 add, float vig){   // cv2.warpAffine shift + cv2.blur((bw,1))
    if (bw <= 2.0) return shot(t, vUv - vec2(dx / ${W}.0, 0.0), mul, add, vig);
    vec3 s = vec3(0.0);
    for (int i = 0; i < 40; i++) {
      float o = (float(i) + 0.5) / 40.0 * bw - bw * 0.5;
      s += shot(t, vUv - vec2((dx - o) / ${W}.0, 0.0), mul, add, vig);
    }
    return s / 40.0;
  }
  void main(){
    vec3 cur = shot(a, vUv, mulA, addA, vigA), c = cur;
    float e = 0.5 - 0.5 * cos(3.14159265 * clamp(u, 0.0, 1.0));
    if (mode == 1) c = shot(b, vUv, mulB, addB, vigB) * (1.0 - e) + cur * e;
    else if (mode == 2) {
      float bw = floor(1.0 + 120.0 * sin(3.14159265 * u));
      vec3 A = shifted(b, -dir * ${W}.0 * e, bw, mulB, addB, vigB), B = shifted(a, dir * ${W}.0 * (1.0 - e), bw, mulA, addA, vigA);
      float x = vUv.x * ${W}.0, edge = dir > 0.0 ? floor(${W}.0 * (1.0 - e)) : floor(${W}.0 * e);
      float m = dir > 0.0 ? step(edge, x) : 1.0 - step(edge, x);
      c = A * (1.0 - m) + B * m;
    }
    c *= mix(1.0, 0.9 + texture2D(paper, vUv).r * 0.2, paperK);
    gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
  }` });
const setGrade = (sh, mul, add, vig) => {
  const g = sh.grade || {}; mul.value.copy(bgr(g.mul)); add.value.copy(bgr(g.add, [0, 0, 0])); vig.value = sh.vignette ?? 0.25;
};

// ------------------------------------------------------------------------------------------------ one frame
const rtOut = makeRT(W, H); const rawBuf = new Uint8Array(W * H * 4);
const shots = DATA.shots; window.__shots = shots;
window.renderFrameAt = (fi, capture = false) => {
  const Tm = DATA.t0 + fi / FPS;
  let si = shots.findIndex((s) => s.start <= Tm && Tm < s.end); if (si < 0) si = shots.length - 1;
  const sh = shots[si], t = Tm - sh.start, tin = sh.tin;
  const fu = finalMat.uniforms;
  if (OT) { OT.render(Tm, rtA); setGrade({}, fu.mulA, fu.addA, fu.vigA); fu.mode.value = 0;    // one take: no cuts
    if (OT.noFilter) { fu.vigA.value = 0; fu.paperK.value = 0; } }                               // filter off: no vignette / grain
  else { renderShot(sh, t, rtA); setGrade(sh, fu.mulA, fu.addA, fu.vigA); fu.mode.value = 0; }
  if (!OT && tin && si > 0 && t < (tin.dur ?? 0.35)) {
    const prev = shots[si - 1];
    renderShot(prev, prev.end - prev.start + t, rtB); setGrade(prev, fu.mulB, fu.addB, fu.vigB);
    fu.mode.value = tin.kind === 'whip' ? 2 : 1; fu.u.value = t / (tin.dur ?? 0.35); fu.dir.value = tin.dir ?? 1;
  }
  if (capture === 'raw') {
    pass(finalMat, rtOut); renderer.setRenderTarget(null);
    return renderer.readRenderTargetPixelsAsync(rtOut, 0, 0, W, H, rawBuf).then(() => { window.frameSocket.send(rawBuf); return 1; });
  }
  pass(finalMat, null);
  return capture ? renderer.domElement.toDataURL('image/png') : null;
};
window.stageInfo = { frames: N, fps: FPS, shots: shots.map((s) => s.id), overlays: !!OV, gl: (() => {
  const d = gl.getExtension('WEBGL_debug_renderer_info'); return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : ''; })() };
window.charMsTotal = () => charMs + S3.charMsTotal() + (OT ? OT.charMsTotal() : 0);
window.stageReady = true;
