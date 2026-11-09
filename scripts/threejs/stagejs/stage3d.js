// stage3d.js - real-3D restaging of a 2D shot (used by stage.js for the shots listed in shots3d.js).
// Camera projection ("2.5D matte painting"): a reference perspective camera is fitted to the 2D frame (horizon = top of
// the ground plate, height from the main character's size), then
//   - the ground plate is projected from that camera onto a real horizontal ground plane,
//   - sky / far / mid plates onto vertical cards at hills-like distances,
//   - every character / crowd strip stands as a camera-facing card where its feet touch the ground,
// so the reference camera sees the old 2D picture and any other camera sees true perspective, parallax and
// occlusion. On top: a directed camera path, thin-lens depth of field, distance haze, light glows, ground routes,
// overlays that follow the 3D things they point at. Characters are still drawn live every frame (toonjs) at the
// resolution their card is seen at.
import * as THREE from 'three';
import * as R from '../toonjs/render.js';
import * as AN from '../toonjs/anim.js';
import { SHOTS3D } from './shots3d.js';

export { SHOTS3D };
const M_PER_UNIT = 1.65e-3;

export function make3D(ctx) {
  const { renderer, W, H, T, spriteMat, silRow, silCol, pass, makeRT, OV, drawOverlays } = ctx;
  const deg = Math.PI / 180;
  const Kof = (fov) => (H / 2) / Math.tan(fov * deg / 2);

  // ---------------------------------------------------------------------------------------------- materials
  const projVS = `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
  function projMat(tex, place, ground) {
    const w = tex.image.width, h = tex.image.height;
    return new THREE.ShaderMaterial({
      transparent: true, depthTest: true, depthWrite: true, side: THREE.DoubleSide,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
      uniforms: { map: { value: tex }, refVP: { value: new THREE.Matrix4() }, inv: { value: new THREE.Vector4(place[0][0], place[0][2], place[1][1], place[1][2]) },
        isz: { value: new THREE.Vector2(w, h) }, camPos: { value: new THREE.Vector3() }, focus: { value: 5 }, coc: { value: 20 },
        hazeCol: { value: new THREE.Vector3(0.85, 0.8, 0.75) }, hazeAmt: { value: 0.0 }, ground: { value: ground ? 1 : 0 } },
      vertexShader: projVS, fragmentShader: `
      uniform sampler2D map; uniform mat4 refVP; uniform vec4 inv; uniform vec2 isz; uniform vec3 camPos, hazeCol;
      uniform float focus, coc, hazeAmt; uniform int ground; varying vec3 vW;
      void main(){
        vec4 cp = refVP * vec4(vW, 1.0);
        if (cp.w <= 0.0) discard;
        vec2 ndc = cp.xy / cp.w;
        float sx = (ndc.x * 0.5 + 0.5) * ${W}.0, sy = (0.5 - ndc.y * 0.5) * ${H}.0;
        vec2 uv = vec2(((sx - inv.y) / inv.x) / isz.x, 1.0 - ((sy - inv.w) / inv.z) / isz.y);
        uv.x = 1.0 - abs(mod(uv.x, 2.0) - 1.0);                  // mirrored repeat sideways (wider than the plate)
        uv.y = ground == 1 ? max(uv.y, 0.5 / isz.y) : clamp(uv.y, 0.5 / isz.y, 1.0 - 0.5 / isz.y);
        float d = distance(camPos, vW);
        float c = coc * abs(1.0 / focus - 1.0 / d);
        vec4 col = texture(map, uv, log2(max(c * 0.8, 1.0)));     // depth of field through the mip chain
        if (col.a < 0.02) discard;
        col.rgb = mix(col.rgb, hazeCol * col.a, hazeAmt * smoothstep(25.0, 900.0, d));
        gl_FragColor = col;
      }` });
  }
  function groundMat(g) {                        // painted-looking prairie: colours from the set's ground, world-space
    const c = document.createElement('canvas'), S = 1024; c.width = c.height = S; const x = c.getContext('2d');
    let seed = 7; const r = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    const rgb = (v) => `rgb(${v[0]},${v[1]},${v[2]})`;
    x.fillStyle = rgb(g.base); x.fillRect(0, 0, S, S);
    const wrap = (f) => { for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { x.save(); x.translate(ox, oy); f(); x.restore(); } };
    for (let i = 0; i < 26; i++) { const cx = r() * S, cy = r() * S, rx = 60 + r() * 170, ry = rx * (0.4 + r() * 0.5), col = r() < 0.5 ? g.dark : g.light;
      wrap(() => { x.globalAlpha = 0.35; x.fillStyle = rgb(col); x.beginPath(); x.ellipse(cx, cy, rx, ry, r() * 3, 0, 7); x.fill(); }); }
    x.globalAlpha = 1; x.lineCap = 'round';
    for (let i = 0; i < 900; i++) { const px = r() * S, py = r() * S, l = 8 + r() * 12, a = -Math.PI / 2 + (r() - 0.5) * 0.9;
      x.strokeStyle = rgb(r() < 0.6 ? g.dark : g.line); x.lineWidth = 3 + r() * 2; x.globalAlpha = 0.55 + r() * 0.4;
      x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8; t.minFilter = THREE.LinearMipmapLinearFilter;
    return new THREE.ShaderMaterial({ depthTest: true, depthWrite: true, side: THREE.DoubleSide,
      uniforms: { map: { value: t }, tile: { value: g.tile ?? 14 }, camPos: { value: new THREE.Vector3() }, focus: { value: 5 }, coc: { value: 20 },
        hazeCol: { value: new THREE.Vector3(...g.haze) } },
      vertexShader: projVS, fragmentShader: `
      uniform sampler2D map; uniform float tile, focus, coc; uniform vec3 camPos, hazeCol; varying vec3 vW;
      void main(){
        float d = distance(camPos, vW), c = coc * abs(1.0 / focus - 1.0 / d), b = log2(max(c * 0.8, 1.0));
        vec3 col = texture(map, vW.xz / tile, b).rgb * 0.6 + texture(map, vW.xz / (tile * 3.7) + 0.31, b).rgb * 0.4;
        col = mix(col, hazeCol, smoothstep(40.0, 700.0, d) * 0.55);
        gl_FragColor = vec4(col, 1.0);
      }` });
  }
  function decalMat(color, strength) {           // soft ground ellipse / route band (frame darkening or colour)
    return new THREE.ShaderMaterial({ transparent: true, depthTest: true, depthWrite: false, side: THREE.DoubleSide,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
      uniforms: { col: { value: new THREE.Vector3(...color) }, k: { value: strength }, prog: { value: 1 }, kind: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
      uniform vec3 col; uniform float k, prog; uniform int kind; varying vec2 vUv;
      void main(){
        float a;
        if (kind == 0) { vec2 q = (vUv - 0.5) * 2.0; a = exp(-3.2 * dot(q, q)); }       // contact shadow
        else {                                                                              // dashed route + arrow head
          float u = vUv.x, v = abs(vUv.y - 0.5) * 2.0;
          if (u > prog) discard;
          float head = 0.86;
          float shaft = step(v, 0.34) * step(0.5, fract(u * 9.0)) * step(u, head);
          float tip = step(head, u) * step(v, (1.0 - (u - head) / (1.0 - head)) * 1.0);
          a = max(shaft, tip) * smoothstep(0.0, 0.04, u);
        }
        gl_FragColor = vec4(col * a * k, a * k);
      }` });
  }
  function glowTex() {
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.18, 'rgba(255,255,255,0.55)'); g.addColorStop(0.5, 'rgba(255,255,255,0.12)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; return t;
  }
  const GLOW = glowTex();

  // ---------------------------------------------------------------------------------------------- geometry fit
  function placeOf(L) {                                 // engine.render_plate placement (no camera): image px -> ref screen
    const t = T[L.src], w = t.image.width, h = t.image.height;
    const cover = Math.max(W / w, H / h) * (L.scale ?? 1.12), fl = L.flip ? -1 : 1, [ox, oy] = L.offset ?? [0, 0];
    return [[cover * fl, 0, W / 2 - fl * cover * w / 2 + ox], [0, cover, H / 2 - cover * h / 2 + oy]];
  }
  function alphaTop(img) {
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, img.width, img.height).data;
    for (let y = 0; y < img.height; y++) for (let i = 0; i < img.width; i += 8) if (d[(y * img.width + i) * 4 + 3] > 128) return y;
    return img.height * 0.7;
  }
  function joints(D, p, flip) {                         // char-unit joints (head ...) of a pose
    const r = R.renderChar(D, p, [[0.05, 0, 0], [0, 0.05, 0]], { flip, raw: true, sil: false });
    const out = {}; for (const [k, v] of Object.entries(r ? r.joints : {})) out[k] = [v[0] / 0.05, v[1] / 0.05];
    return out;
  }

  function build(sh) {
    if (sh._3d) return sh._3d;
    const dir = SHOTS3D[sh.id];
    const S = { dir, scene: new THREE.Scene(), cards: [], items: [], hud: [] };
    const plates = sh.layers.filter((L) => L.kind === 'plate');
    const gL = plates.find((L) => /_ground\.png$/.test(L.src)) || plates[plates.length - 1];
    const gp = placeOf(gL), yh = gp[1][1] * alphaTop(T[gL.src].image) + gp[1][2];
    const toons = sh.layers.filter((L) => L.kind === 'toon' && (L.depth ?? 1) <= 1.2);
    const subj = toons.reduce((a, b) => (!a || b.scale > a.scale ? b : a), null);
    const fov = 40, K = Kof(fov);
    const camH = Math.max(0.4, (subj.pos[1] - yh) / (subj.scale / M_PER_UNIT));
    const ref = new THREE.PerspectiveCamera(fov, W / H, 0.05, 8000);
    ref.position.set(0, camH, 0); ref.rotation.set(Math.atan((yh - H / 2) / K), 0, 0); ref.updateMatrixWorld(); ref.updateProjectionMatrix();
    const refVP = new THREE.Matrix4().multiplyMatrices(ref.projectionMatrix, ref.matrixWorldInverse);
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(ref.quaternion);
    const rc = new THREE.Raycaster();
    const lift = (sx, sy, maxD = 600) => {               // ref screen px -> point on the ground (+ metres per ref px)
      rc.setFromCamera(new THREE.Vector2(sx / W * 2 - 1, -(sy / H * 2 - 1)), ref);
      const o = rc.ray.origin, d = rc.ray.direction;
      let tt = d.y < -1e-4 ? -o.y / d.y : maxD;
      tt = Math.min(tt, maxD);
      const P = o.clone().addScaledVector(d, tt); if (d.y < -1e-4 && tt < maxD) P.y = 0;
      const Dz = P.clone().sub(o).dot(fwd);
      return { P, wpp: Dz / K };
    };
    const atDepth = (sx, sy, Dz) => { rc.setFromCamera(new THREE.Vector2(sx / W * 2 - 1, -(sy / H * 2 - 1)), ref);
      return rc.ray.origin.clone().addScaledVector(rc.ray.direction, Dz / rc.ray.direction.dot(fwd)); };
    Object.assign(S, { ref, refVP, lift, atDepth, K, camH, yh, fwd });

    // plates -> projected proxies (cards in their order, the ground last; depth-tested)
    let order = 0;
    for (const L of plates) {
      const name = L.src.replace(/^.*_([a-z]+)\.png$/, '$1'), isG = L === gL;
      const m = projMat(T[L.src], placeOf(L), isG); m.uniforms.refVP.value.copy(refVP);
      let mesh;
      if (isG && dir.ground) { m.dispose(); mesh = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000), groundMat(dir.ground)); mesh.rotation.x = -Math.PI / 2; mesh.position.set(0, 0, -2400); S.gmat = mesh.material; }
      else if (isG) { mesh = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000), m); mesh.rotation.x = -Math.PI / 2; mesh.position.set(0, 0, -2400); }
      else {
        const D = dir.hills[name] ?? 260, hw = D * Math.tan(fov * deg / 2) * (W / H) * 8;
        mesh = new THREE.Mesh(new THREE.PlaneGeometry(hw * 2, D * 3), m); mesh.position.set(0, camH + D * 0.4, -D);
      }
      mesh.renderOrder = order++; S.scene.add(mesh); S.cards.push({ mesh, L });
      m.uniforms.hazeAmt.value = name === 'sky' ? 0 : 0.25;
    }
    // light glow (behind the characters, in front of the sky)
    if (dir.glow) {
      const g = dir.glow, P = atDepth(g.at[0], g.at[1], (dir.hills.sky ?? 3000) * 0.98);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: new THREE.Color(...g.color), blending: THREE.AdditiveBlending,
        transparent: true, depthTest: false, depthWrite: false, opacity: g.strength }));
      const wpp = P.clone().sub(ref.position).dot(fwd) / K; sp.scale.set(g.r * 2 * wpp, g.r * 2 * wpp, 1); sp.position.copy(P);
      sp.renderOrder = order++; S.scene.add(sp); S.glow = sp;
    }
    const base = order + 10;
    // characters and crowd strips -> camera-facing cards on the ground
    sh.layers.forEach((L, li) => {
      if (L.kind !== 'toon' && L.kind !== 'char') return;
      const cx = L.kind === 'char' ? L.pos[0] + (T[L.src].image.width / 2 - L.anchor_src[0]) * L.scale : L.pos[0];
      const it = { L, li, cx, ...lift(cx, L.pos[1]) };
      it.grp = new THREE.Group(); it.grp.position.copy(it.P); S.scene.add(it.grp);
      if (L.kind === 'toon') {
        it.mpu = it.wpp * L.scale;                                   // metres per char unit
        it.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).translate(0.5, 0.5, 0), spriteMat());
        it.mesh.material.depthTest = true; it.grp.add(it.mesh);
        L._cv = L._cv || Object.assign(document.createElement('canvas'), { width: 16, height: 16 });
        it.grow = (w, h) => {
          if (L._cv.width < w || L._cv.height < h || !it.tx) {
            L._cv.width = Math.max(L._cv.width, Math.ceil(w / 256) * 256); L._cv.height = Math.max(L._cv.height, Math.ceil(h / 256) * 256);
            for (const o of [it.tx, it.rows, it.sil]) o && o.dispose();
            it.tx = new THREE.CanvasTexture(L._cv); it.tx.colorSpace = THREE.NoColorSpace; it.tx.generateMipmaps = false;
            it.tx.minFilter = it.tx.magFilter = THREE.NearestFilter;
            it.rows = makeRT(L._cv.width, L._cv.height); it.sil = makeRT(L._cv.width, L._cv.height, { mips: true });
          }
          return L._cv;
        };
        if (L.shadow !== false) {
          const rig = L.D.rig;
          it.feet = rig === 'horse' ? [[-200, 170], [0, 170], [200, 170]] : rig === 'bust' ? [[-150, 130], [150, 130]] : null;
          it.shadows = (it.feet || [[-62, 78], [62, 78]]).map(() => {
            const s = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), decalMat([0, 0, 0], 0.32)); s.rotation.x = -Math.PI / 2; s.position.y = 0.01;
            s.renderOrder = base - 1; S.scene.add(s); return s;
          });
        }
        if (L === subj) { S.subj = it; it.joints = joints(L.D, L.keys[0][1], !!L.flip); }
      } else {
        it.meshes = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).translate(0.5, 0.5, 0), spriteMat());
          m.material.depthTest = true; it.grp.add(m); return m; });
      }
      S.items.push(it);
    });
    // routes on the ground for the crowd groups (shot 7: the regiment splitting)
    // a label belongs to the layer authored right before it (crowd group / character); crowd groups by name prefix
    const labels = sh.layers.filter((L) => L.kind === 'overlay' && L.type === 'label');
    const ownerOf = (L) => { const li = sh.layers.indexOf(L); let o = null; for (const it of S.items) if (it.li < li) o = it; return o; };
    const gname = (it) => (it.L._crowd || '').split('_')[0];
    const groups = {}; for (const it of S.items) if (it.L.kind === 'char' && it.L._crowd) (groups[gname(it)] ||= []).push(it);
    S.groups = Object.entries(groups);
    if (dir.routes) S.routes = S.groups.map(([gn, g]) => {
      const it = g[0], drift = (it.L.motions || []).find((m) => m.type === 'drift'), dx = drift ? drift.dx : 0;
      const lab = labels.find((L) => { const o = ownerOf(L); return o && gname(o) === gn; });
      const col = lab && lab.fill ? [lab.fill[2] / 255, lab.fill[1] / 255, lab.fill[0] / 255] : [1, 1, 1];
      const P0 = lift(it.cx, it.L.pos[1]).P, len = Math.abs(dx) * it.wpp * dir.routes.len + 4, sgn = Math.sign(dx) || 1;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), decalMat(col, 0.9)); m.material.uniforms.kind.value = 1;
      m.rotation.x = -Math.PI / 2; m.scale.set(len, Math.max(1.2, len * 0.09), 1);
      m.position.set(P0.x + sgn * len / 2, 0.02, P0.z); if (sgn < 0) m.rotation.z = Math.PI;
      m.renderOrder = base - 2; S.scene.add(m); return m;
    });
    // labels follow the 3D thing they point at (the strip / character under them)
    S.labels = labels.map((L) => {
      let best = null;
      const own = ownerOf(L);
      if (own) best = { it: own };
      else for (const it of S.items) {
        const fx = it.L.kind === 'char' ? it.cx : it.L.pos[0], fy = it.L.pos[1];
        if (fy < L.at[1]) continue;
        const sc = Math.abs(fx - L.at[0]) + 0.3 * Math.abs(fy - L.at[1]);
        if (!best || sc < best.sc) best = { sc, it };
      }
      const Dz = best ? best.it.P.clone().sub(ref.position).dot(fwd) : 20;
      return { L, it: best && best.it, P: atDepth(L.at[0], L.at[1], Dz), off: [L.box[0] - L.at[0], L.box[1] - L.at[1]] };
    });
    // focus / camera targets
    const head = S.subj.joints.head || [0, -1800];
    const hP = S.subj.P.clone().add(new THREE.Vector3((S.subj.L.flip ? -1 : 1) * head[0] * S.subj.mpu, -head[1] * S.subj.mpu, 0));
    const centre = (arr) => arr.reduce((a, it) => a.add(it.P), new THREE.Vector3()).multiplyScalar(1 / Math.max(arr.length, 1));
    const crowdItems = S.items.filter((it) => it.L.kind === 'char');
    S.targets = {
      head: hP,
      column: centre(S.items.filter((it) => (it.L.depth ?? 1) <= 1.2)).setY(hP.y * 0.55),
      groups: centre(crowdItems.length ? crowdItems : S.items).setY(hP.y * 0.4),
    };
    S.targets.scene = S.targets.groups.clone().lerp(S.subj.P.clone().setY(hP.y * 0.5), 0.4);   // the groups AND the subject
    S.order = base;
    sh._3d = S;
    return S;
  }

  // ---------------------------------------------------------------------------------------------- camera path
  const cam = new THREE.PerspectiveCamera(40, W / H, 0.05, 8000);
  function placeCamera(S, u) {
    const ks = S.dir.cam, e = AN.ease(u, S.dir.ease ?? 'inout');
    const T0 = S.targets[ks[0].target], v = S.ref.position.clone().sub(T0);
    const r0 = v.length(), yaw0 = Math.atan2(v.x, v.z), el0 = Math.asin(v.y / r0);
    const P = (k) => ({ r: k.r * r0, yaw: yaw0 + k.yaw * deg, el: k.el === 'ref' ? el0 : k.el * deg, fov: k.fov ?? 40, T: S.targets[k.target] });
    const a = P(ks[0]), b = P(ks[ks.length - 1]), L = (x, y) => x + (y - x) * e;
    const r = L(a.r, b.r), yaw = L(a.yaw, b.yaw), el = L(a.el, b.el), tgt = a.T.clone().lerp(b.T, e);
    cam.fov = L(a.fov, b.fov); cam.updateProjectionMatrix();
    cam.position.set(tgt.x + r * Math.sin(yaw) * Math.cos(el), tgt.y + r * Math.sin(el), tgt.z + r * Math.cos(yaw) * Math.cos(el));
    if (cam.position.y < 0.25) cam.position.y = 0.25;
    cam.lookAt(tgt); cam.updateMatrixWorld();
    return tgt;
  }

  // ---------------------------------------------------------------------------------------------- one frame
  let charMs = 0;
  function render(sh, t, target, hudLayers) {
    const S = build(sh), dir = S.dir;
    const u = Math.min(t / (sh.end - sh.start), 1.0);
    placeCamera(S, u);
    const Kc = Kof(cam.fov), cf = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    const fP = dir.focus === 'groups' ? S.targets.groups : S.targets.head;
    const focus = Math.max(0.5, fP.clone().sub(cam.position).dot(cf));
    for (const { mesh } of S.cards) { const m = mesh.material.uniforms; m.camPos.value.copy(cam.position); m.focus.value = focus; m.coc.value = dir.coc; }
    // cards: position (+ motions), face the camera, sort far -> near
    const vis = [];
    for (const it of S.items) {
      const L = it.L, swaps = L.kind === 'toon' ? L.keys.slice(1).map((k) => [k[0], k[2] || {}]) : (L.swaps || []).map((s) => [s[0], s[2] || {}]);
      const [mdx, mdy, msc, rot] = AN.motion_offset(L.motions || [], t, swaps);
      it.grp.position.set(it.P.x + mdx * it.wpp, it.P.y, it.P.z);
      const lift = -mdy * it.wpp;
      const toCam = cam.position.clone().sub(it.grp.position);
      const yaw = Math.atan2(toCam.x, toCam.z), elv = Math.atan2(toCam.y - 1.0, Math.hypot(toCam.x, toCam.z));
      it.grp.rotation.set(0, 0, 0); it.grp.rotation.order = 'YXZ'; it.grp.rotation.y = yaw; it.grp.rotation.x = -Math.max(0, elv) * 0.85;
      it.grp.updateMatrixWorld();
      const d = Math.max(0.3, it.grp.position.clone().sub(cam.position).dot(cf));
      const blurPx = Math.min(dir.coc * Math.abs(1 / focus - 1 / d), 14);
      const haze = Math.min(0.3, Math.max(0, (d - 30) / 400)) + +(L.haze || 0);
      if (L.kind === 'toon') {
        const t0 = performance.now();
        const p = AN.pose_at(L, t), boxH = L.D.rig === 'horse' ? 2600 : 1800;
        let sc = it.mpu * Kc / d;                                       // sprite px per char unit as seen now
        sc = Math.min(sc, 1700 / boxH);
        const c = Math.cos(rot), s = Math.sin(rot), sct = sc * msc;
        const r = R.renderChar(L.D, p, [[sct * c, -sct * s, 0], [sct * s, sct * c, 0]], { flip: !!L.flip, idle: AN.idle_at(L, t), raw: true, sil: false, canvas: it.grow });
        it.mesh.visible = !!r;
        if (r) {
          const CW = L._cv.width, CH = L._cv.height, k = Math.max(1, Math.round(11.0 * 0.55 * sct * 3));
          it.tx.needsUpdate = true;
          silRow.uniforms.src.value = it.tx; silRow.uniforms.texel.value.set(1 / CW, 1 / CH); silRow.uniforms.k.value = k; pass(silRow, it.rows);
          silCol.uniforms.src.value = it.tx; silCol.uniforms.rows.value = it.rows.texture; silCol.uniforms.texel.value.set(1 / CW, 1 / CH); silCol.uniforms.k.value = k;
          pass(silCol, it.sil);
          const mpp = it.mpu / sc, sw = r.x1 - r.x0, shh = r.y1 - r.y0, pad = blurPx > 0.3 ? Math.ceil(blurPx * 3) : 0;
          it.mesh.scale.set((sw + 2 * pad) * mpp, (shh + 2 * pad) * mpp, 1);
          it.mesh.position.set((r.x0 - pad) * mpp, (-r.y1 - pad) * mpp + lift, 0);
          const um = it.mesh.material.uniforms;
          um.map.value = it.sil.texture; um.rect.value.set(0, 1 - r.h / CH, r.w / CW, 1); um.mode.value = 0;
          um.pad.value.set(pad / sw, pad / shh); um.px.value.set(sw, shh); um.sigma.value = blurPx > 0.3 ? blurPx : 0;
          um.haze.value = Math.min(haze, 0.6); um.hazeCol.value.set(0.86, 0.82, 0.78);
          um.tint.value.set(...(L.tint ? [L.tint[2], L.tint[1], L.tint[0]] : [1, 1, 1]));
        }
        if (it.shadows) {
          const fl = L.flip ? -1 : 1, feet = it.feet || p.feet.map((fx) => [fx, 78]);
          it.shadows.forEach((m, i) => {
            const f = feet[i] || feet[0];
            const off = new THREE.Vector3(fl * f[0] * it.mpu, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
            m.position.set(it.grp.position.x + off.x, 0.01, it.grp.position.z + off.z);
            m.scale.set(f[1] * 2.2 * it.mpu, f[1] * 1.3 * it.mpu, 1); m.rotation.z = -yaw;
          });
        }
        charMs += performance.now() - t0;
      } else {
        const entries = [[0.0, L.src, {}], ...(L.swaps || []).map((s) => [s[0], s[1], s[2] || {}])];
        let k = 0; entries.forEach((e, i) => { if (t >= e[0]) k = i; });
        let poses = [[entries[k][1], 1.0]];
        const xf = k > 0 ? (entries[k][2].xf ?? 0.05) : 0;
        if (k > 0 && t - entries[k][0] < xf) { const w = (t - entries[k][0]) / xf; poses = [[entries[k - 1][1], 1 - w], [entries[k][1], w]]; }
        it.meshes.forEach((m, i) => {
          const pz = poses[i]; m.visible = !!pz; if (!pz) return;
          const tx = T[pz[0]], mpp = it.wpp * L.scale * msc, [ax, ay] = L.anchor_src, fl = L.flip ? -1 : 1;
          m.scale.set(fl * tx.image.width * mpp, tx.image.height * mpp, 1);
          m.position.set(-fl * tx.image.width / 2 * mpp, -(tx.image.height - ay) * mpp + lift, 0.001 * i);   // stands at its centre
          const um = m.material.uniforms; um.map.value = tx; um.opacity.value = pz[1];
          um.px.value.set(tx.image.width * mpp * Kc / d, tx.image.height * mpp * Kc / d); um.sigma.value = blurPx > 0.3 ? blurPx : 0;
          um.haze.value = Math.min(haze, 0.6); um.hazeCol.value.set(0.86, 0.82, 0.78);
          um.tint.value.set(...(L.tint ? [L.tint[2], L.tint[1], L.tint[0]] : [1, 1, 1]));
        });
      }
      vis.push([d, it]);
    }
    vis.sort((a, b) => b[0] - a[0]).forEach(([, it], i) => {
      for (const m of it.L.kind === 'toon' ? [it.mesh] : it.meshes) m.renderOrder = S.order + i;
    });
    if (S.routes) {
      const g = dir.routes.grow, pr = Math.min(Math.max((u - g[0]) / (g[1] - g[0]), 0), 1);
      S.routes.forEach((m, k) => { m.material.uniforms.prog.value = Math.min(Math.max(pr * 1.25 - k * 0.08, 0), 1); m.visible = pr > 0; });
    }
    renderer.setRenderTarget(target); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(S.scene, cam);
    // overlays: labels re-pinned to the projected 3D point of the thing they mark, the rest stay screen-space
    const proj = (v) => { const q = v.clone().project(cam); return [(q.x + 1) / 2 * W, (1 - q.y) / 2 * H]; };
    const layers = hudLayers.map((L) => {
      const lb = S.labels.find((x) => x.L === L);
      if (!lb) return L;
      const P = lb.P.clone(); if (lb.it) P.x += lb.it.grp.position.x - lb.it.P.x;
      const a = proj(P);
      return { ...L, at: a, box: [a[0] + lb.off[0], a[1] + lb.off[1]], world: false };
    });
    drawOverlays(sh, t, layers, target);
  }
  globalThis.debug3D = (sh, u) => { const S = build(sh), tg = placeCamera(S, u);
    const f = (v) => v.toArray().map((x) => +x.toFixed(2));
    return { camH: +S.camH.toFixed(2), yh: +S.yh.toFixed(1), cam: f(cam.position), target: f(tg), ref: f(S.ref.position),
      items: S.items.map((it) => [it.L.kind, f(it.P), +it.wpp.toFixed(4)]).slice(0, 40) }; };
  return { render, charMsTotal: () => charMs, has: (sh) => !!SHOTS3D[sh.id] && !Q3D_OFF };
}
const Q3D_OFF = new URLSearchParams(location.search).has('flat');
