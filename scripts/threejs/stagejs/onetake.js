// onetake.js - one continuous camera through several 3D worlds (direction: onetake_dir.js).
// World = one location lifted to 3D from a base 2D shot by camera projection (see stage3d.js for the idea), with
//   - every crowd member on its own card (sprites drawn once per design x walk frame by toonjs, GPU contour,
//     area-downsampled, mipmapped), members walk out of phase, the column really rides forward,
//   - live toons (main characters) drawn every frame at the size they are seen, mirrored when the camera passes to
//     their other side, rim-lit from the light, long cast shadows on the ground + contact shadows,
//   - sun glow, god rays, bloom, split-tone grade, haze, depth of field,
//   - labels pinned to the 3D groups they mark, world overlays (chalk date, rays, "?") on cards in the world.
// The camera is a spline through keyed positions/look points that are expressed relative to moving anchors
// (Custer's head, the column ...), so it tracks the action; worlds are joined through dark / sky / fog.
import * as THREE from 'three';
import * as R from '../toonjs/render.js';
import * as AN from '../toonjs/anim.js';
import { ONETAKE } from './onetake_dir.js';

const M_PER_UNIT = 1.65e-3, CS = 0.5, SSF = 3;           // crowd sprite cache: px per char unit, supersampling
const CHAR_BLUR_MAX = 2.0;   // depth-of-field cap on characters (px): out-of-focus riders stay readable (user: faces
                             // must not smear); plates / ground / shadows keep the full blur for the depth
const deg = Math.PI / 180;

export function makeOneTake(ctx) {
  const { renderer, W, H, T, spriteMat, silRow, silCol, pass, makeRT, OV, DATA } = ctx;
  const shots = DATA.shots, byId = (id) => shots.find((s) => s.id === id);
  const Kof = (fov) => (H / 2) / Math.tan(fov * deg / 2);
  const sstep = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
  const nameOf = (D) => (D.rider ? 'rider:' + (D.rider.name || '') : D.name || '') + (D.rig || '');
  // light: false (onetake_dir.js) = flat v3 look: no sun glow, god rays, rim light, long cast shadows, distance haze;
  // every character gets small contact shadows under the feet / hooves instead
  const LIGHT = ONETAKE.light !== false;

  // ------------------------------------------------------------------------------------------- materials
  const projVS = `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
  const uvVS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
  const PRE = { transparent: true, side: THREE.DoubleSide, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor };
  // things lying ON the ground (cast / contact shadows, routes, the painted ground over the base prairie): a few mm of
  // height is not enough - the 5 km ground quad's interpolated depth is too coarse and whole shadows failed the depth
  // test on random frames (flicker). A slope-scaled depth bias wins against the ground every frame; layers stack, so
  // the painted ground gets one step, everything lying on it two (an equal bias ties again).
  const ONGROUND = { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -16 };
  const PAINTEDGROUND = { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 };
  function projMat(tex, place, ground, clampX = false, cyl = null) {
    const defs = {}; if (clampX) defs.CLAMPX = 1; if (cyl) defs.CYL = 1; if (cyl && cyl.sky) defs.SKYX = 1;
    return new THREE.ShaderMaterial({ ...PRE, depthTest: true, depthWrite: true, defines: defs,
      uniforms: { map: { value: tex }, refVP: { value: new THREE.Matrix4() }, inv: { value: new THREE.Vector4(place[0][0], place[0][2], place[1][1], place[1][2]) },
        isz: { value: new THREE.Vector2(tex.image.width, tex.image.height) }, camPos: { value: new THREE.Vector3() }, focus: { value: 5 }, coc: { value: 20 },
        hazeCol: { value: new THREE.Vector3(0.85, 0.8, 0.75) }, hazeAmt: { value: LIGHT ? 0.25 : 0 }, ground: { value: ground ? 1 : 0 },
        refPos: { value: cyl ? cyl.pos : new THREE.Vector3() }, Kr: { value: cyl ? cyl.K : 1 }, pitch: { value: cyl ? cyl.pitch : 0 } },
      vertexShader: projVS, fragmentShader: `
      uniform sampler2D map; uniform mat4 refVP; uniform vec4 inv; uniform vec2 isz; uniform vec3 camPos, hazeCol, refPos;
      uniform float focus, coc, hazeAmt, Kr, pitch; uniform int ground; varying vec3 vW;
      void main(){
        float sx, sy;
        #ifdef CYL
        vec3 rel = vW - refPos; float th = atan(rel.x, -rel.z), hd = length(rel.xz), el = atan(rel.y, hd);
        float tc = abs(th) < 0.9 ? tan(th) : sign(th) * (tan(0.9) + (abs(th) - 0.9) / (cos(0.9) * cos(0.9)));
        sx = ${W / 2}.0 + Kr * tc; sy = ${H / 2}.0 - Kr * tan(el - pitch);
        #else
        vec4 cp = refVP * vec4(vW, 1.0);
        if (cp.w <= 0.0) discard;
        vec2 ndc = cp.xy / cp.w;
        sx = (ndc.x * 0.5 + 0.5) * ${W}.0; sy = (0.5 - ndc.y * 0.5) * ${H}.0;
        #endif
        vec2 uv = vec2(((sx - inv.y) / inv.x) / isz.x, 1.0 - ((sy - inv.w) / inv.z) / isz.y);
        float outside = step(uv.x, 0.0) + step(1.0, uv.x);
        #ifdef SKYX
        uv.x = clamp(uv.x, 0.5 / isz.x, 1.0 - 0.5 / isz.x);   // beyond the painted sky: its blurred colour only
        #elif defined(CLAMPX)
        uv.x = clamp(uv.x, 0.5 / isz.x, 1.0 - 0.5 / isz.x);
        #else
        uv.x = 1.0 - abs(mod(uv.x, 2.0) - 1.0);
        #endif
        uv.y = ground == 1 ? max(uv.y, 0.5 / isz.y) : clamp(uv.y, 0.5 / isz.y, 1.0 - 0.5 / isz.y);
        float d = distance(camPos, vW), c = coc * abs(1.0 / focus - 1.0 / d);
        vec4 col = texture(map, uv, log2(max(c * 0.8, 1.0)));
        #ifdef SKYX
        col = mix(col, texture(map, vec2(0.5, uv.y), 7.0), min(outside, 1.0));   // no second sun, no stretched cloud
        #endif
        if (col.a < 0.02) discard;
        col.rgb = mix(col.rgb, hazeCol * col.a, hazeAmt * smoothstep(25.0, 900.0, d));
        gl_FragColor = col;
      }` });
  }
  function groundMat(g) {
    const c = document.createElement('canvas'), S = 1024; c.width = c.height = S; const x = c.getContext('2d');
    let seed = 7; const r = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    const rgb = (v) => `rgb(${v[0]},${v[1]},${v[2]})`;
    x.fillStyle = rgb(g.base); x.fillRect(0, 0, S, S);
    const wrap = (f) => { for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { x.save(); x.translate(ox, oy); f(); x.restore(); } };
    for (let i = 0; i < 26; i++) { const cx = r() * S, cy = r() * S, rx = 60 + r() * 170, ry = rx * (0.4 + r() * 0.5), col = r() < 0.5 ? g.dark : g.light, a = r() * 3;
      wrap(() => { x.globalAlpha = 0.35; x.fillStyle = rgb(col); x.beginPath(); x.ellipse(cx, cy, rx, ry, a, 0, 7); x.fill(); }); }
    x.globalAlpha = 1; x.lineCap = 'round';
    for (let i = 0; i < 900; i++) { const px = r() * S, py = r() * S, l = 8 + r() * 12, a = -Math.PI / 2 + (r() - 0.5) * 0.9;
      x.strokeStyle = rgb(r() < 0.6 ? g.dark : g.line); x.lineWidth = 3 + r() * 2; x.globalAlpha = 0.55 + r() * 0.4;
      x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
    return new THREE.ShaderMaterial({ depthTest: true, depthWrite: true, side: THREE.DoubleSide,
      uniforms: { map: { value: t }, tile: { value: g.tile ?? 14 }, camPos: { value: new THREE.Vector3() }, focus: { value: 5 }, coc: { value: 20 },
        hazeCol: { value: new THREE.Vector3(...g.haze) } },
      vertexShader: projVS, fragmentShader: `
      uniform sampler2D map; uniform float tile, focus, coc; uniform vec3 camPos, hazeCol; varying vec3 vW;
      void main(){
        float d = distance(camPos, vW), c = coc * abs(1.0 / focus - 1.0 / d), b = log2(max(c * 0.8, 1.0));
        vec3 col = texture(map, vW.xz / tile, b).rgb * 0.6 + texture(map, vW.xz / (tile * 3.7) + 0.31, b).rgb * 0.4;
        col = mix(col, hazeCol, smoothstep(40.0, 700.0, d) * ${LIGHT ? '0.55' : '0.0'});
        gl_FragColor = vec4(col, 1.0);
      }` });
  }
  function decalMat(color, strength, kind) {
    return new THREE.ShaderMaterial({ ...PRE, ...ONGROUND, depthTest: true, depthWrite: false,
      uniforms: { col:{ value: new THREE.Vector3(...color) }, k: { value: strength }, prog: { value: 1 }, kind: { value: kind } },
      vertexShader: uvVS, fragmentShader: `
      uniform vec3 col; uniform float k, prog; uniform int kind; varying vec2 vUv;
      void main(){
        float a;
        if (kind == 0) { vec2 q = (vUv - 0.5) * 2.0; a = exp(-3.2 * dot(q, q)); }
        else { float u = vUv.x, v = abs(vUv.y - 0.5) * 2.0; if (u > prog) discard; float head = 0.86;
          float shaft = step(v, 0.34) * step(0.5, fract(u * 9.0)) * step(u, head);
          float tip = step(head, u) * step(v, 1.0 - (u - head) / (1.0 - head)); a = max(shaft, tip) * smoothstep(0.0, 0.04, u); }
        gl_FragColor = vec4(col * a * k, a * k);
      }` });
  }
  function castMat() {                               // long cast shadow: the character's own alpha, dark, softened
    return new THREE.ShaderMaterial({ ...PRE, ...ONGROUND, depthTest: true, depthWrite: false,
      uniforms: { map: { value: null }, rect: { value: new THREE.Vector4(0, 0, 1, 1) }, k: { value: 0.35 }, lod: { value: 1.5 } },
      vertexShader: uvVS, fragmentShader: `
      uniform sampler2D map; uniform vec4 rect; uniform float k, lod; varying vec2 vUv;
      void main(){ float a = texture(map, mix(rect.xy, rect.zw, vUv), lod).a * smoothstep(0.0, 0.25, vUv.y + 0.05) * (1.0 - 0.55 * vUv.y);
        gl_FragColor = vec4(0.0, 0.0, 0.0, a * k); }` });
  }
  const downMat = new THREE.ShaderMaterial({ uniforms: { src: { value: null }, rect: { value: new THREE.Vector4() }, texel: { value: new THREE.Vector2() } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`, fragmentShader: `
    uniform sampler2D src; uniform vec4 rect; uniform vec2 texel; varying vec2 vUv;
    void main(){ vec2 uv = mix(rect.xy, rect.zw, vUv); vec4 s = vec4(0.0);
      for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) s += textureLod(src, uv + vec2(float(i), float(j)) * texel, 0.0);
      gl_FragColor = s / 9.0; }` });
  const GLOW = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.15, 'rgba(255,255,255,0.6)'); g.addColorStop(0.45, 'rgba(255,255,255,0.13)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; return t; })();

  // ------------------------------------------------------------------------------------------- sprite tools
  const tmpCv = Object.assign(document.createElement('canvas'), { width: 16, height: 16 });
  let tmpTx = null, tmpRows = null, tmpSil = null;
  const growTmp = (w, h) => {
    if (tmpCv.width < w || tmpCv.height < h || !tmpTx) {
      tmpCv.width = Math.max(tmpCv.width, Math.ceil(w / 256) * 256); tmpCv.height = Math.max(tmpCv.height, Math.ceil(h / 256) * 256);
      for (const o of [tmpTx, tmpRows, tmpSil]) o && o.dispose();
      tmpTx = new THREE.CanvasTexture(tmpCv); tmpTx.colorSpace = THREE.NoColorSpace; tmpTx.generateMipmaps = false; tmpTx.minFilter = tmpTx.magFilter = THREE.NearestFilter;
      tmpRows = makeRT(tmpCv.width, tmpCv.height); tmpSil = makeRT(tmpCv.width, tmpCv.height);
    }
    return tmpCv;
  };
  function contour(tx, rows, sil, CW, CH, k) {
    tx.needsUpdate = true;
    silRow.uniforms.src.value = tx; silRow.uniforms.texel.value.set(1 / CW, 1 / CH); silRow.uniforms.k.value = k; pass(silRow, rows);
    silCol.uniforms.src.value = tx; silCol.uniforms.rows.value = rows.texture; silCol.uniforms.texel.value.set(1 / CW, 1 / CH); silCol.uniforms.k.value = k; pass(silCol, sil);
  }
  const spriteCache = new Map();
  function cachedSprite(D, p) {            // one drawing per (design, pose): GPU contour, 3x3 area downsample, mips
    const key = JSON.stringify([D, p]);
    if (spriteCache.has(key)) return spriteCache.get(key);
    const r = R.renderChar(D, p, [[CS, 0, 0], [0, CS, 0]], { raw: true, sil: false, canvas: growTmp });
    const CW = tmpCv.width, CH = tmpCv.height;
    contour(tmpTx, tmpRows, tmpSil, CW, CH, Math.max(1, Math.round(11 * 0.55 * CS * SSF)));
    const w = r.x1 - r.x0, h = r.y1 - r.y0, rt = makeRT(w, h, { mips: true });
    downMat.uniforms.src.value = tmpSil.texture; downMat.uniforms.rect.value.set(0, 1 - r.h / CH, r.w / CW, 1); downMat.uniforms.texel.value.set(1 / CW, 1 / CH);
    pass(downMat, rt);
    const out = { tex: rt.texture, w, h, x0: r.x0, y0: r.y0, x1: r.x1, y1: r.y1, head: r.joints.head ? [r.joints.head[0] / CS, r.joints.head[1] / CS] : null };
    spriteCache.set(key, out);
    return out;
  }

  // ------------------------------------------------------------------------------------------- worlds
  function placeOf(L) {
    const t = T[L.src], w = t.image.width, h = t.image.height;
    const cover = Math.max(W / w, H / h) * (L.scale ?? 1.12), fl = L.flip ? -1 : 1, [ox, oy] = L.offset ?? [0, 0];
    return [[cover * fl, 0, W / 2 - fl * cover * w / 2 + ox], [0, cover, H / 2 - cover * h / 2 + oy]];
  }
  const rowsCache = new Map();
  function alphaRows(img) {
    if (rowsCache.has(img)) return rowsCache.get(img);
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, img.width, img.height).data; let top = -1, bot = -1;
    for (let y = 0; y < img.height; y++) { let any = false; for (let i = 0; i < img.width; i += 6) if (d[(y * img.width + i) * 4 + 3] > 128) { any = true; break; }
      if (any) { if (top < 0) top = y; bot = y; } }
    const r = [top, bot]; rowsCache.set(img, r); return r;
  }

  function buildWorld(name) {
    const dir = ONETAKE.worlds[name], base = byId(dir.base);
    const Wd = { name, dir, scene: new THREE.Scene(), items: [], cards: {}, wov: [], shots: Object.keys(dir.items).map(byId) };
    const plates = base.layers.filter((L) => L.kind === 'plate');
    const gL = plates.find((L) => /_(ground|floor|bluff)\.png$/.test(L.src)) || plates[plates.length - 1];
    const gp = placeOf(gL);
    const yh = dir.horizon ?? gp[1][1] * alphaRows(T[gL.src].image)[0] + gp[1][2];
    const toons = base.layers.filter((L) => L.kind === 'toon' && (L.depth ?? 1) <= 1.2);
    const subjL = toons.reduce((a, b) => (!a || b.scale > a.scale ? b : a), null);
    const fov = 40, K = Kof(fov), camH = Math.max(0.4, (subjL.pos[1] - yh) / (subjL.scale / M_PER_UNIT));
    const ref = new THREE.PerspectiveCamera(fov, W / H, 0.05, 8000);
    ref.position.set(0, camH, 0); ref.rotation.set(Math.atan((yh - H / 2) / K), 0, 0); ref.updateMatrixWorld(); ref.updateProjectionMatrix();
    const refVP = new THREE.Matrix4().multiplyMatrices(ref.projectionMatrix, ref.matrixWorldInverse);
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(ref.quaternion), rc = new THREE.Raycaster();
    const ray = (sx, sy) => { rc.setFromCamera(new THREE.Vector2(sx / W * 2 - 1, -(sy / H * 2 - 1)), ref); return rc.ray; };
    const lift = (sx, sy, maxD = 600) => { const r = ray(sx, sy); let t = r.direction.y < -1e-4 ? -r.origin.y / r.direction.y : maxD; t = Math.min(t, maxD);
      const P = r.origin.clone().addScaledVector(r.direction, t); if (t < maxD) P.y = 0; return { P, wpp: P.clone().sub(r.origin).dot(fwd) / K }; };
    const atDepth = (sx, sy, Dz) => { const r = ray(sx, sy); return r.origin.clone().addScaledVector(r.direction, Dz / r.direction.dot(fwd)); };
    Object.assign(Wd, { ref, K, camH, yh, fwd, lift, atDepth });
    // sky dome: gradient from the sky plate's own colours, so no camera angle ever sees black
    { const skyL = plates.find((L) => /_sky\.png$/.test(L.src)) || plates[0], im = T[skyL.src].image;
      const c = document.createElement('canvas'); c.width = 8; c.height = 64; const x = c.getContext('2d'); x.drawImage(im, 0, 0, 8, 64);
      const d = x.getImageData(0, 0, 8, 64).data, col = (row) => new THREE.Vector3(d[(row * 8 + 4) * 4] / 255, d[(row * 8 + 4) * 4 + 1] / 255, d[(row * 8 + 4) * 4 + 2] / 255);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(4500, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, depthTest: false,
        uniforms: { top: { value: col(2) }, hor: { value: col(60) } }, vertexShader: projVS, fragmentShader: `
        uniform vec3 top, hor; varying vec3 vW; void main(){ float h = normalize(vW - cameraPosition).y; gl_FragColor = vec4(mix(hor, top, smoothstep(-0.05, 0.6, h)), 1.0); }` }));
      dome.renderOrder = -100; dome.frustumCulled = false; dome.onBeforeRender = (r, sc, cm) => dome.position.copy(cm.position); Wd.scene.add(dome); }
    // plates
    let order = 0;
    for (const L of plates) {
      const nm = L.src.replace(/^.*_([a-z]+)\.png$/, '$1'), isG = L === gL; let mesh, D;
      if (isG) {
        const mat = dir.ground ? groundMat(dir.ground) : Object.assign(projMat(T[L.src], placeOf(L), true), PAINTEDGROUND);
        mesh = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000), mat); mesh.rotation.x = -Math.PI / 2; mesh.position.set(0, dir.ground ? 0 : 0.008, -2400); D = 0;
        if (!dir.ground) {                     // colours of the painted ground for the base under it
          const im = T[L.src].image, c = document.createElement('canvas'); c.width = 64; c.height = 64; const x = c.getContext('2d'); x.drawImage(im, 0, 0, 64, 64);
          const d = x.getImageData(0, 40, 64, 24).data; let r = 0, g2 = 0, b = 0, n = 0;
          for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) { r += d[i]; g2 += d[i + 1]; b += d[i + 2]; n++; }
          const m = [r / n, g2 / n, b / n].map(Math.round), sc = (f) => m.map((v) => Math.min(255, Math.round(v * f)));
          const baseG = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000), groundMat({ base: m, dark: sc(0.86), light: sc(1.1), line: sc(0.7), haze: [0.86, 0.8, 0.74], tile: 14 }));
          baseG.rotation.x = -Math.PI / 2; baseG.position.set(0, 0, 0); baseG.renderOrder = order++; Wd.scene.add(baseG); Wd.cards.base = { mesh: baseG, D: 0 }; }
      } else {
        D = dir.hills[nm] ?? 260;
        const gTop = gp[1][1] * alphaRows(T[gL.src].image)[0] + gp[1][2];
        if (D === 'stand') { const p = placeOf(L), yb = Math.min(p[1][1] * alphaRows(T[L.src].image)[1] + p[1][2], nm === 'wall' ? gTop + 1 : 1e9);
          D = yb > yh + 2 ? lift(W / 2, yb).P.clone().sub(ref.position).dot(fwd) : 30; }
        const stand = dir.hills[nm] === 'stand';
        if (stand) { const hw = D * Math.tan(fov * deg / 2) * (W / H) * 8;
          mesh = new THREE.Mesh(new THREE.PlaneGeometry(hw * 2, D * 4 + 40), projMat(T[L.src], placeOf(L), false, true)); mesh.position.set(0, camH + D * 0.6, -D); }
        else {                                   // all-round backdrop
          mesh = new THREE.Mesh(new THREE.CylinderGeometry(D, D, D * 4 + 40, 128, 1, true),
            projMat(T[L.src], placeOf(L), false, false, { pos: ref.position.clone(), K, pitch: ref.rotation.x, sky: nm === 'sky' }));
          mesh.position.set(0, camH + D * 0.6, 0); }
        if (nm === 'sky') mesh.material.uniforms.hazeAmt.value = 0;
      }
      if (mesh.material.uniforms.refVP) mesh.material.uniforms.refVP.value.copy(refVP);
      mesh.renderOrder = order++; Wd.scene.add(mesh); Wd.cards[nm] = { mesh, D };
    }
    // sun: glow sprite on the sky
    const sun = dir.sun, sunP = atDepth(sun.at[0], sun.at[1], (dir.hills.sky ?? 3000) * 0.97);
    Wd.sunP = sunP;
    if (LIGHT && sun.glow > 0) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: new THREE.Color(...sun.color), blending: THREE.AdditiveBlending,
      transparent: true, depthTest: false, depthWrite: false, opacity: sun.glow }));
      const wpp = sunP.clone().sub(ref.position).dot(fwd) / K; sp.scale.set(sun.r * 2 * wpp, sun.r * 2 * wpp, 1); sp.position.copy(sunP); sp.renderOrder = order++; Wd.scene.add(sp); }
    Wd.base0 = order + 10;
    // items
    const subjName = nameOf(subjL.D);
    for (const sh of Wd.shots) {
      const [ta, tb] = dir.items[sh.id];
      sh.layers.forEach((L, li) => {
        if (L.kind === 'toon') {
          if ((L.depth ?? 1) > 1.2) return;
          if (sh !== base && nameOf(L.D) === subjName) return;           // the subject exists once (pose from any shot)
          const it = { kind: 'toon', L, sh, li, ta, tb, ...lift(L.pos[0], L.pos[1]) }; it.mpu = it.wpp * L.scale;
          it.isSubj = L === subjL; it.F = new THREE.Vector3(L.flip ? -1 : 1, 0, 0);
          it.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).translate(0.5, 0.5, 0), spriteMat()); it.mesh.material.depthTest = true;
          it.cv = Object.assign(document.createElement('canvas'), { width: 16, height: 16 });
          it.grow = (w, h) => { if (it.cv.width < w || it.cv.height < h || !it.tx) {
            it.cv.width = Math.max(it.cv.width, Math.ceil(w / 256) * 256); it.cv.height = Math.max(it.cv.height, Math.ceil(h / 256) * 256);
            for (const o of [it.tx, it.rows, it.sil]) o && o.dispose();
            it.tx = new THREE.CanvasTexture(it.cv); it.tx.colorSpace = THREE.NoColorSpace; it.tx.generateMipmaps = false; it.tx.minFilter = it.tx.magFilter = THREE.NearestFilter;
            it.rows = makeRT(it.cv.width, it.cv.height); it.sil = makeRT(it.cv.width, it.cv.height, { mips: true }); } return it.cv; };
          const rig = L.D.rig;
          it.feet = rig === 'horse' ? [[-200, 170], [0, 170], [200, 170]] : rig === 'bust' ? [[-150, 130], [150, 130]] : [[-62, 78], [62, 78]];
          it.j = R.renderChar(L.D, L.keys[0][1], [[0.05, 0, 0], [0, 0.05, 0]], { raw: true, sil: false }).joints;
          it.headU = it.j && it.j.head ? [it.j.head[0] / 0.05, it.j.head[1] / 0.05] : [0, -1500];
          if (it.isSubj) Wd.subj = it;
          Wd.items.push(it);
        } else if (L.kind === 'char' && L._members) {
          const march = L._march, nf = L._members[0].seq[0][1].length;
          L._members.forEach((m, mi) => {
            const it = { kind: 'member', L, sh, li, ta, tb, m, march, nf, ...lift(m.x, m.y) }; it.mpu = it.wpp * m.s;
            it.F = new THREE.Vector3(m.flip ? -1 : 1, 0, 0); it.phase = ((mi * 0.618 + (L._row || 0) * 0.37) % 1) * nf;
            it.group = (L._crowd || '').split('_')[0];
            const dr = march && march.dx ? march.dx / march.dur : 0;  it.vx = dr * it.wpp;   // m/s along world x
            it.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).translate(0.5, 0.5, 0), spriteMat()); it.mesh.material.depthTest = true;
            Wd.items.push(it);
          });
        }
      });
    }
    for (const it of Wd.items) {
      it.grp = new THREE.Group(); it.grp.position.copy(it.P); it.grp.add(it.mesh); Wd.scene.add(it.grp);
      it.cast = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).translate(0.5, 0.5, 0), castMat()); it.cast.matrixAutoUpdate = false; it.cast.renderOrder = Wd.base0 - 3; Wd.scene.add(it.cast);
      if (it.kind === 'member') it.feet = it.m.D.rider || it.m.D.rig === 'horse' ? [[-200, 170], [0, 170], [200, 170]] : [[-62, 78], [62, 78]];
      if (it.kind === 'toon' || !LIGHT) it.contact = it.feet.map(() => { const s = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), decalMat([0, 0, 0], 0.32, 0)); s.rotation.x = -Math.PI / 2; s.renderOrder = Wd.base0 - 2; Wd.scene.add(s); return s; });
    }
    // march: the base column's common speed (sunset) / per-group drift after a hold (noon)
    if (dir.march) { const ms = Wd.items.filter((it) => it.kind === 'member' && it.sh.id === dir.march.from && it.vx); Wd.v = ms.length ? ms.reduce((a, it) => a + it.vx, 0) / ms.length : 0; }
    // labels (owner = the layer authored right before) and routes, from the base shot
    const ownerOf = (sh, L) => { const li = sh.layers.indexOf(L); let o = null; for (const it of Wd.items) if (it.sh === sh && it.li < li) o = it; return o; };
    Wd.labels = [];
    for (const sh of Wd.shots) for (const L of sh.layers.filter((x) => x.kind === 'overlay' && x.type === 'label')) {
      const own = ownerOf(sh, L); if (!own) continue;
      const Dz = own.P.clone().sub(ref.position).dot(fwd);
      Wd.labels.push({ L, own, P: atDepth(L.at[0], L.at[1], Dz), off: [L.box[0] - L.at[0], L.box[1] - L.at[1]] });
    }
    if (dir.routes) {
      const groups = {}; for (const it of Wd.items) if (it.kind === 'member' && it.vx) (groups[it.group] ||= []).push(it);
      Wd.routes = Object.values(groups).map((g) => {
        const lab = Wd.labels.find((l) => l.own.group === g[0].group), col = lab && lab.L.fill ? [lab.L.fill[2] / 255, lab.L.fill[1] / 255, lab.L.fill[0] / 255] : [1, 1, 1];
        const P0 = g.reduce((a, it) => a.add(it.P), new THREE.Vector3()).multiplyScalar(1 / g.length), v = g[0].vx;
        const len = Math.abs(v) * g[0].march.dur * dir.routes.len + 4, sgn = Math.sign(v) || 1;
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), decalMat(col, 0.9, 1)); m.rotation.x = -Math.PI / 2; m.scale.set(len, Math.max(1.4, len * 0.09), 1);
        m.position.set(P0.x + sgn * len / 2, 0.03, P0.z + 0.6); if (sgn < 0) m.rotation.z = Math.PI; m.renderOrder = Wd.base0 - 4; Wd.scene.add(m); return m;
      });
    }
    // world-pinned overlays (chalk date on the board, rays behind him, the "?") on camera-facing full-frame cards
    for (const sh of shots.filter((s) => Wd.shots.includes(s) || (dir.span[0] <= s.start && s.start < dir.span[1]))) {
      sh.layers.forEach((L, li) => {
        if (L.kind !== 'overlay' || !L.world || !OV || L.type === 'mood') return;
        const at = L.at || [W / 2, H / 2], behind = !sh.layers.slice(0, li).some((x) => x.kind === 'toon');
        let Dz;
        const near = Wd.items.filter((it) => Math.abs((it.kind === 'toon' ? it.L.pos[0] : it.m.x) - at[0]) < 380);
        if (behind && Wd.subj) Dz = Wd.subj.P.clone().sub(ref.position).dot(fwd) + 25;
        else if (near.length) Dz = Math.min(...near.map((it) => it.P.clone().sub(ref.position).dot(fwd))) - 0.2;
        else Dz = Math.min(...Object.values(Wd.cards).filter((c) => c.D > 0).map((c) => c.D)) - 0.08;
        const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
        const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.NoColorSpace; tx.premultiplyAlpha = true;
        const m = spriteMat(); m.uniforms.map.value = tx; m.depthTest = true;
        const hgt = 2 * Dz * Math.tan(fov * deg / 2), mesh = new THREE.Mesh(new THREE.PlaneGeometry(hgt * W / H, hgt), m);
        const C = atDepth(W / 2, H / 2, Dz), A = atDepth(at[0], at[1], Dz);
        const pivot = new THREE.Group(); pivot.position.copy(A); mesh.position.copy(C.clone().sub(A)); mesh.quaternion.copy(ref.quaternion); pivot.add(mesh); Wd.scene.add(pivot);
        Wd.wov.push({ L, sh, cv, cx: cv.getContext('2d'), tx, mesh, pivot, A, behind, Dz, subjFollow: !behind && near.some((it) => it.isSubj) });
      });
    }
    // named points
    Wd.points = {};
    for (const [k, pt] of Object.entries({ ...(ONETAKE.points || {}), ...(dir.points || {}) })) {
      const card = Wd.cards[pt.on]; if (!card) continue;
      Wd.points[k] = atDepth(pt.screen[0], pt.screen[1], card.D - 0.02);
    }
    Wd.rt = makeRT(W, H, { half: true, depth: true });
    return Wd;
  }
  const worlds = {}; for (const n of Object.keys(ONETAKE.worlds)) worlds[n] = buildWorld(n);
  window.__otWorlds = worlds;                     // debugging hook (inspect items / cards from puppeteer)

  // ------------------------------------------------------------------------------------------- per-frame state
  function activeShot(Tm) { return shots.find((s) => s.start <= Tm && Tm < s.end) || shots[shots.length - 1]; }
  function marchOffset(Wd, it, Tm) {
    const dir = Wd.dir;
    if (dir.march) {
      const t0 = dir.span[0], tStop = dir.march.stopAt, tEff = it.sh.id === dir.march.from || it.isSubj ? Math.min(Tm, tStop) : tStop;
      return Wd.v * (tEff - t0);
    }
    if (dir.hold && dir.hold[it.sh.id] !== undefined && it.vx) return it.vx * Math.max(0, Math.min(Tm - dir.hold[it.sh.id], it.march.dur));
    return 0;
  }
  function anchors(Wd, Tm) {
    const s = Wd.subj, A = {};
    if (s) { const off = marchOffset(Wd, s, Tm), fl = s.F.x; A.feet = s.P.clone().add(new THREE.Vector3(off, 0, 0));
      A.head = A.feet.clone().add(new THREE.Vector3(fl * s.headU[0] * s.mpu, -s.headU[1] * s.mpu, 0)); A.F = s.F.clone(); }
    const mem = Wd.items.filter((it) => it.kind === 'member' && Tm >= it.ta - 0.5 && Tm < it.tb + 0.5);
    if (mem.length) { const c = new THREE.Vector3(); for (const it of mem) c.add(it.P).add(new THREE.Vector3(marchOffset(Wd, it, Tm), 0, 0)); c.multiplyScalar(1 / mem.length); c.y = 1.4; A.column = c; A.groups = c.clone(); }
    else if (A.head) { A.column = A.head.clone(); A.groups = A.head.clone(); }
    if (Wd.dir.hold) {                              // groups: where they stand before splitting (stable look point)
      const g = Wd.items.filter((it) => it.kind === 'member'); if (g.length) { A.groups = g.reduce((a, it) => a.add(it.P), new THREE.Vector3()).multiplyScalar(1 / g.length); A.groups.y = 1.2; } }
    Object.assign(A, Wd.points);
    return A;
  }
  function evalExpr(e, A) {
    if (typeof e === 'string') return A[e].clone();
    const p = A[e.from].clone();
    const subjBased = e.from === 'head' || e.from === 'feet';
    const F = subjBased && A.F ? A.F.clone() : new THREE.Vector3(0, 0, 1);
    const S = subjBased ? new THREE.Vector3(0, 0, 1).addScaledVector(F, -F.z).normalize() : new THREE.Vector3(1, 0, 0);
    return p.addScaledVector(F, e.front || 0).addScaledVector(S, e.side || 0).add(new THREE.Vector3(0, e.up || 0, 0));
  }
  function eased(keys, Tm, get) {                 // calm mode: move - settle - hold. Every key is a stop (keys with
    const st = keys.filter((k) => !k.pass);       // pass: true are only bend points of the move between two stops)
    const t = st.map((k) => k.T), n = st.length;
    if (Tm <= t[0]) return get(st[0]).clone();
    if (Tm >= t[n - 1]) return get(st[n - 1]).clone();
    let i = 0; while (t[i + 1] < Tm) i++;
    const u = (Tm - t[i]) / (t[i + 1] - t[i]), e = u * u * u * (u * (u * 6 - 15) + 10);   // smootherstep: no jerk
    const a = keys.indexOf(st[i]), b = keys.indexOf(st[i + 1]);
    let pts = keys.slice(a, b + 1).map((k) => get(k));
    while (pts.length > 1) pts = pts.slice(1).map((p, j) => pts[j].clone().lerp(p, e));   // Bezier through bend points
    return pts[0];
  }
  function hermite(keys, Tm, get) {               // C1 spline through keys (time-scaled Catmull-Rom tangents)
    const n = keys.length, v = keys.map((k) => get(k)), t = keys.map((k) => k.T);
    const tan = (i) => { const a = Math.max(i - 1, 0), b = Math.min(i + 1, n - 1); return v[b].clone().sub(v[a]).multiplyScalar(1 / Math.max(t[b] - t[a], 1e-3)); };
    if (Tm <= t[0]) return v[0].clone().addScaledVector(tan(0), Tm - t[0]);
    if (Tm >= t[n - 1]) return v[n - 1].clone().addScaledVector(tan(n - 1), Tm - t[n - 1]);
    let i = 0; while (t[i + 1] < Tm) i++;
    const h = t[i + 1] - t[i], u = (Tm - t[i]) / h, u2 = u * u, u3 = u2 * u;
    return v[i].clone().multiplyScalar(2 * u3 - 3 * u2 + 1).addScaledVector(tan(i), (u3 - 2 * u2 + u) * h)
      .addScaledVector(v[i + 1], -2 * u3 + 3 * u2).addScaledVector(tan(i + 1), (u3 - u2) * h);
  }
  const cam = new THREE.PerspectiveCamera(40, W / H, 0.05, 8000);
  function placeCam(Wd, Tm, A) {
    const ks = Wd.dir.cam;
    const ip = ONETAKE.calm ? eased : hermite;
    const pos = ip(ks, Tm, (k) => evalExpr(k.pos, A)), look = ip(ks, Tm, (k) => evalExpr(k.look, A));
    const fv = ip(ks, Tm, (k) => new THREE.Vector3(k.fov ?? 40, 0, 0)).x;
    if (pos.y < 0.2) pos.y = 0.2;
    cam.fov = fv; cam.updateProjectionMatrix(); cam.position.copy(pos); cam.lookAt(look); cam.updateMatrixWorld();
    return look;
  }

  // ------------------------------------------------------------------------------------------- post (grade, rays, bloom)
  const postMat = new THREE.ShaderMaterial({ uniforms: { src: { value: null }, sun: { value: new THREE.Vector2() }, rays: { value: 0 }, rayCol: { value: new THREE.Vector3(1, 0.8, 0.5) },
    warm: { value: new THREE.Vector3(1, 1, 1) }, cool: { value: new THREE.Vector3(1, 1, 1) }, sat: { value: 1 }, contrast: { value: 1 }, bloom: { value: 0 },
    mul: { value: new THREE.Vector3(1, 1, 1) }, fog: { value: 0 }, fogCol: { value: new THREE.Vector3(1, 1, 1) }, expo: { value: 1 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`, fragmentShader: `
    uniform sampler2D src; uniform vec2 sun; uniform float rays, sat, contrast, bloom, fog, expo; uniform vec3 rayCol, warm, cool, mul, fogCol; varying vec2 vUv;
    float lum(vec3 c){ return dot(c, vec3(0.3, 0.55, 0.15)); }
    void main(){
      vec3 c = texture2D(src, vUv).rgb;
      if (bloom > 0.0) { vec3 b = vec3(0.0);
        for (int i = 0; i < 16; i++) { float a = float(i) * 2.3999632, r = sqrt((float(i) + 0.5) / 16.0) * 0.022;
          vec3 s = texture2D(src, vUv + r * vec2(cos(a), sin(a) * ${(W / H).toFixed(4)})).rgb; b += max(s - 0.72, 0.0); }
        c += b / 16.0 * bloom * 2.0; }
      if (rays > 0.0) { vec2 d = (sun - vUv) / 48.0; vec2 p = vUv; float acc = 0.0, w = 1.0;
        for (int i = 0; i < 48; i++) { p += d; vec3 s = texture2D(src, clamp(p, 0.0, 1.0)).rgb; acc += smoothstep(0.62, 0.92, lum(s)) * w; w *= 0.965; }
        float fall = 1.0 - smoothstep(0.0, 0.9, distance(vUv, sun));
        c += rayCol * acc / 48.0 * rays * 2.2 * (0.35 + 0.65 * fall); }
      float l = lum(c); c *= mix(cool, warm, smoothstep(0.15, 0.85, l));
      c = mix(vec3(lum(c)), c, sat); c = (c - 0.5) * contrast + 0.5;
      c *= mul; c = mix(c, fogCol, fog); c *= expo;
      gl_FragColor = vec4(c, 1.0);
    }` });

  // ------------------------------------------------------------------------------------------- render one world
  let charMs = 0;
  const hudCv = document.createElement('canvas'); hudCv.width = W; hudCv.height = H;
  function renderWorld(Wd, Tm, target, fx) {
    const dir = Wd.dir, A = anchors(Wd, Tm), sh = activeShot(Tm);
    const look = placeCam(Wd, Tm, A);
    const Kc = Kof(cam.fov), cf = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion), cr = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
    const fP = A.head && (A.head.distanceTo(cam.position) < look.distanceTo(cam.position) * 1.5) ? A.head : look;
    const focus = Math.max(0.5, fP.clone().sub(cam.position).dot(cf)), coc = 22; Wd.focus = focus;
    for (const c of Object.values(Wd.cards)) { const u = c.mesh.material.uniforms; u.camPos.value.copy(cam.position); u.focus.value = focus; u.coc.value = coc; }
    // sun on screen, shadow direction (away from the sun, on the ground)
    const sq = Wd.sunP.clone().project(cam), sunUV = new THREE.Vector2((sq.x + 1) / 2, (sq.y + 1) / 2);
    const sunVis = sq.z < 1 ? 1 - sstep(0.9, 1.6, Math.max(Math.abs(sq.x), Math.abs(sq.y))) : 0;
    const sd = new THREE.Vector3().subVectors(Wd.subj ? Wd.subj.P : new THREE.Vector3(), Wd.sunP).setY(0).normalize();
    const sl = new THREE.Vector3(sd.z, 0, -sd.x), stretch = dir.shadows.stretch, sunScr = new THREE.Vector2((sq.x + 1) / 2 * W, (1 - sq.y) / 2 * H);
    const vis = [];
    for (const it of Wd.items) {
      const fd = (dir.fadeItems ?? 0) / 2;                        // only items that arrive / leave mid-take fade
      let op = (it.ta > dir.span[0] + 0.01 ? sstep(it.ta - fd, it.ta + fd, Tm) : 1) * (it.tb < dir.span[1] - 0.01 ? 1 - sstep(it.tb - fd, it.tb + fd, Tm) : 1);
      it.grp.visible = it.cast.visible = op > 0.003; if (it.contact) it.contact.forEach((m) => { m.visible = op > 0.003; });
      if (op <= 0.003) continue;
      const off = marchOffset(Wd, it, Tm), tl = Tm - it.sh.start;
      if (it.kind === 'member' && focus < 6) {          // nothing between the lens and the face in a close-up;
        const dm = new THREE.Vector3(it.P.x + off, 1.2, it.P.z).sub(cam.position).dot(cf);   // the rule fades out over
        const g = 1 - sstep(4.5, 6.0, focus);           // focus 4.5..6 (a hard cut at 6 popped riders in, and focus
        op *= 1 - g * (1 - sstep(focus + 2.0, focus + 3.2, dm));   // sits right at ~6.0 in the column hold)
        it.grp.visible = it.cast.visible = op > 0.003; if (it.contact) it.contact.forEach((m) => { m.visible = op > 0.003; }); if (op <= 0.003) continue;
      }
      if (!LIGHT) it.cast.visible = false;                // flat light: no long cast shadow, contact shadows only
      it.grp.position.set(it.P.x + off, 0, it.P.z);
      // face the lens; lean back only when the camera is well above the card's middle (seen from up high)
      const toCam = cam.position.clone().sub(it.grp.position), yaw = Math.atan2(toCam.x, toCam.z);
      const d = Math.max(0.3, it.grp.position.clone().sub(cam.position).dot(cf)), blurPx = Math.min(coc * Math.abs(1 / focus - 1 / d), 16);
      const mirror = it.F.dot(cr) < 0;                          // the side we see: mirror the side view
      const um = it.mesh.material.uniforms;
      let spr, rect, mpp, ox, oy, sw, shh, tex, hk = 0;
      if (it.kind === 'toon') {
        const t0 = performance.now();
        // pose: from whichever shot of this world is on (the subject keeps one body through the whole take)
        let PL = it.L, ptl = tl;
        if (it.isSubj) { const s2 = Wd.shots.concat(shots).find((s) => s.start <= Tm && Tm < s.end && s.layers.some((x) => x.kind === 'toon' && nameOf(x.D) === nameOf(it.L.D)));
          if (s2) { PL = s2.layers.find((x) => x.kind === 'toon' && nameOf(x.D) === nameOf(it.L.D)); ptl = Tm - s2.start; } }
        const p = AN.pose_at({ ...PL, D: it.L.D, walk: PL.walk || it.L.walk }, Math.max(0, ptl));
        const [, mdy, msc] = AN.motion_offset(PL.motions || [], Math.max(0, ptl), PL.keys.slice(1).map((k) => [k[0], k[2] || {}]));
        let sc = Math.min(it.mpu * Kc / d, 1700 / (it.L.D.rig === 'horse' ? 2600 : 1800)), sct = sc * msc;
        const r = R.renderChar(it.L.D, p, [[sct, 0, 0], [0, sct, 0]], { flip: mirror, idle: AN.idle_at(PL, ptl), raw: true, sil: false, canvas: it.grow });
        if (!r) { it.grp.visible = false; continue; }
        contour(it.tx, it.rows, it.sil, it.cv.width, it.cv.height, Math.max(1, Math.round(11 * 0.55 * sct * 3)));
        it.sil.texture.needsUpdate = false;
        mpp = it.mpu / sc; ox = r.x0; oy = r.y0; sw = r.x1 - r.x0; shh = r.y1 - r.y0; hk = -mdy * it.wpp;
        tex = it.sil.texture; rect = [0, 1 - r.h / it.cv.height, r.w / it.cv.width, 1];
        charMs += performance.now() - t0;
      } else {
        const m = it.m, nf = it.nf, holdT = dir.hold && dir.hold[it.sh.id] !== undefined ? Math.max(0, Tm - dir.hold[it.sh.id]) : (dir.march ? Math.min(Tm, dir.march.stopAt) - dir.span[0] : tl);
        const fi = it.march ? Math.floor(((holdT / (it.march.period ?? 0.5)) * nf + it.phase)) % nf : 0;
        spr = cachedSprite(m.D, m.seq[0][1][(fi + nf) % nf]);
        const bob = it.march && it.march.bob && holdT > 0 ? it.march.bob * Math.abs(Math.sin(Math.PI * holdT / ((it.march.period ?? 0.5) / 2) + it.phase)) : 0;
        mpp = it.mpu / CS; ox = mirror ? -spr.x1 : spr.x0; oy = spr.y0; sw = spr.w; shh = spr.h; hk = bob * it.wpp; tex = spr.tex; rect = [0, 0, 1, 1];
        if (mirror) rect = [1, 0, 0, 1];
      }
      it.mesh.scale.set(sw * mpp, shh * mpp, 1); it.mesh.position.set(ox * mpp, (-oy - shh) * mpp + hk, 0);
      it.hc = Math.max(0.3, -oy * mpp * 0.55);
      // tilt from THIS frame's card height (using last frame's made a page's first frame differ: card leaned back)
      const elv = Math.atan2(toCam.y - it.hc, Math.hypot(toCam.x, toCam.z)), tilt = Math.max(0, elv - 12 * deg) * 0.8;
      it.grp.rotation.order = 'YXZ'; it.grp.rotation.set(-tilt, yaw, 0); it.grp.updateMatrixWorld();
      // contact shadows (soft ellipses under feet / hooves)
      if (it.contact) it.feet.forEach((f, i) => { const m = it.contact[i], o = new THREE.Vector3((mirror ? -1 : 1) * f[0] * it.mpu, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
        m.position.set(it.grp.position.x + o.x, 0.012, it.grp.position.z + o.z); m.scale.set(f[1] * 2.2 * it.mpu, f[1] * 1.3 * it.mpu, 1); m.rotation.z = -yaw; m.material.uniforms.k.value = 0.32 * op; });
      um.map.value = tex; um.rect.value.set(...rect); um.mode.value = 0; um.opacity.value = op;
      um.px.value.set(sw * mpp * Kc / d, shh * mpp * Kc / d); um.sigma.value = blurPx > 0.3 ? Math.min(blurPx, CHAR_BLUR_MAX) : 0; um.pad.value.set(0, 0);
      um.haze.value = !LIGHT ? 0 : Math.min(0.45, Math.max(0, (d - 30) / 300)) + (it.L.haze || it.L._haze || 0) * 0.5; um.hazeCol.value.set(...(dir.ground ? dir.ground.haze : [0.86, 0.8, 0.74]));
      const ghost = /ghost/.test(JSON.stringify(it.kind === 'toon' ? it.L.D.name || it.L.D.rider?.name || '' : it.m.D.name || ''));
      um.desat.value = ghost ? 0.8 : 0; um.tint.value.set(...(it.L.tint ? [it.L.tint[2], it.L.tint[1], it.L.tint[0]] : ghost ? [0.9, 0.93, 1.0] : [1, 1, 1]));
      // rim light toward the sun
      const cq = it.grp.position.clone().add(new THREE.Vector3(0, shh * mpp * 0.5, 0)).project(cam);
      const cpx = new THREE.Vector2((cq.x + 1) / 2 * W, (1 - cq.y) / 2 * H), ld = sunScr.clone().sub(cpx); if (ld.length() > 1) ld.normalize();
      const sz = shh * mpp * Kc / d;
      um.rimDir.value.set((mirror && it.kind === 'member' ? -1 : 1) * ld.x * 7 / Math.max(sz * sw / shh, 8), -ld.y * 7 / Math.max(sz, 8));
      um.rimAmt.value = ghost || !LIGHT ? 0 : dir.rim.amt * (0.5 + 0.5 * sunVis); um.rimCol.value.set(...dir.rim.col);
      // long cast shadow: the silhouette laid on the ground away from the sun
      const cu = it.cast.material.uniforms; cu.map.value = tex; cu.rect.value.set(...rect); cu.k.value = dir.shadows.k * op * (ghost ? 0.4 : 1); cu.lod.value = 1.5 + Math.log2(Math.max(1, blurPx));
      const xL = ox * mpp, wM = sw * mpp, hB = (-oy - shh) * mpp + hk, hM = shh * mpp;
      const e1 = sl.clone().multiplyScalar(wM), e2 = sd.clone().multiplyScalar(hM * stretch), O = it.grp.position.clone().addScaledVector(sl, xL).addScaledVector(sd, hB * stretch).setY(0.015);
      it.cast.matrix.makeBasis(e1, e2, new THREE.Vector3(0, 1, 0)).setPosition(O); it.cast.matrixWorldNeedsUpdate = true;
      vis.push([d, it]);
    }
    vis.sort((a, b) => b[0] - a[0] || a[1].li - b[1].li).forEach(([, it], i) => { it.mesh.renderOrder = Wd.base0 + i; });
    if (Wd.routes) { const g = dir.routes.grow, pr = sstep(g[0], g[1], Tm); Wd.routes.forEach((m, k) => { m.material.uniforms.prog.value = Math.min(Math.max(pr * 1.25 - k * 0.08, 0), 1); m.visible = pr > 0; }); }
    // world overlays
    for (const o of Wd.wov) {
      const on = o.sh === sh; o.pivot.visible = on; if (!on) continue;
      o.cx.setTransform(1, 0, 0, 1, 0, 0); o.cx.clearRect(0, 0, W, H);
      try { OV.drawOverlay(o.cx, { ...o.L, world: false }, { ...o.sh, cam: {} }, Tm - o.sh.start, Math.min((Tm - o.sh.start) / (o.sh.end - o.sh.start), 1), [0, 0]); } catch (e) { console.warn('wov ' + e); }
      o.tx.needsUpdate = true;
      if (o.subjFollow && Wd.subj) o.pivot.position.copy(o.A).add(new THREE.Vector3(marchOffset(Wd, Wd.subj, Tm), 0, 0));
      if (o.subjFollow || o.behind) o.pivot.quaternion.copy(cam.quaternion).multiply(Wd.ref.quaternion.clone().invert()); else o.pivot.quaternion.identity();
      o.pivot.updateMatrixWorld();
      o.mesh.renderOrder = o.behind ? Wd.base0 - 5 : Wd.base0 + 999; o.mesh.material.depthTest = !o.behind;
    }
    renderer.setRenderTarget(Wd.rt); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(Wd.scene, cam);
    // post: rays, bloom, split tone, the shot's own grade (s03 drains), fog / exposure for the cuts
    const pu = postMat.uniforms, g = dir.grade;
    pu.src.value = Wd.rt.texture; pu.sun.value.copy(sunUV); pu.rays.value = !LIGHT ? 0 : dir.sun.rays * sunVis + (sh.layers.some((L) => L.type === 'mood' && L.mode === 'rays') ? 0.35 * sstep(sh.start, sh.start + 0.5, Tm) : 0); pu.rayCol.value.set(...dir.sun.color);
    const fl = ONETAKE.filter !== false;          // filter off: neutral grade, no bloom
    pu.warm.value.set(...(fl ? g.warm : [1, 1, 1])); pu.cool.value.set(...(fl ? g.cool : [1, 1, 1]));
    pu.sat.value = fl ? g.sat : 1; pu.contrast.value = fl ? g.contrast : 1; pu.bloom.value = fl ? g.bloom : 0;
    const gm = sh.grade && sh.grade.mul ? sh.grade.mul : null, gu = gm ? sstep(sh.start, sh.start + 0.6, Tm) : 0;
    pu.mul.value.set(1 + ((gm ? gm[2] : 1) - 1) * gu, 1 + ((gm ? gm[1] : 1) - 1) * gu, 1 + ((gm ? gm[0] : 1) - 1) * gu);
    pu.fog.value = fx.fog || 0; pu.fogCol.value.set(...(fx.fogCol || [1, 1, 1])); pu.expo.value = fx.expo ?? 1;
    pass(postMat, target);
    // screen-space overlays of the shot on now (labels re-pinned to their 3D groups)
    if (OV && fx.hud !== false) {
      const layers = sh.layers.filter((L) => L.kind === 'overlay' && !L.world && !(L.type === 'mood' && L.mode === 'rays')).map((L) => {
        const lb = Wd.labels.find((x) => x.L === L); if (!lb) return L;
        const P = lb.P.clone(); P.x += marchOffset(Wd, lb.own, Tm); const q = P.project(cam), a = [(q.x + 1) / 2 * W, (1 - q.y) / 2 * H];
        return { ...L, at: a, box: [a[0] + lb.off[0], a[1] + lb.off[1]] };
      });
      if (layers.length) ctx.drawOverlays(sh, Tm - sh.start, layers, target);
    }
  }

  // ------------------------------------------------------------------------------------------- one frame of the take
  const rtX = makeRT(W, H, { half: true }), rtY = makeRT(W, H, { half: true });
  const mixMat = new THREE.ShaderMaterial({ uniforms: { a: { value: null }, b: { value: null }, e: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `uniform sampler2D a, b; uniform float e; varying vec2 vUv; void main(){ gl_FragColor = vec4(mix(texture2D(a, vUv).rgb, texture2D(b, vUv).rgb, e), 1.0); }` });
  const order = Object.keys(ONETAKE.worlds);
  const worldAt = (Tm) => order.find((n) => ONETAKE.worlds[n].span[0] <= Tm && Tm < ONETAKE.worlds[n].span[1]) || order[order.length - 1];
  function render(Tm, target) {
    const wn = worldAt(Tm), cut = ONETAKE.cuts.find((c) => Tm >= c.T - c.pre && Tm < c.T + c.post);
    if (!cut) return renderWorld(worlds[wn], Tm, target, {});
    const A = worlds[worldAt(cut.T - 1e-3)], B = worlds[worldAt(cut.T + 1e-3)];
    const u = (Tm - (cut.T - cut.pre)) / (cut.pre + cut.post);           // 0..1 over the cut window
    if (cut.kind === 'dark') {                                             // dusk sinks to black, the board comes out of it
      if (Tm < cut.T) renderWorld(A, Tm, target, { expo: 1 - sstep(cut.T - cut.pre, cut.T, Tm) });
      else renderWorld(B, Tm, target, { expo: sstep(cut.T, cut.T + cut.post, Tm) });
      return;
    }
    const f = cut.kind === 'fog' ? 1 : 0.85, col = cut.col;                // fog / sky: both worlds wash into the same colour
    renderWorld(A, Tm, rtX, { fog: f * sstep(0, 0.5, u), fogCol: col, hud: false });
    renderWorld(B, Tm, rtY, { fog: f * (1 - sstep(0.5, 1, u)), fogCol: col, hud: Tm >= cut.T });
    mixMat.uniforms.a.value = rtX.texture; mixMat.uniforms.b.value = rtY.texture; mixMat.uniforms.e.value = sstep(0.35, 0.65, u);
    pass(mixMat, target);
  }
  return { render, charMsTotal: () => charMs, noFilter: ONETAKE.filter === false };
}
