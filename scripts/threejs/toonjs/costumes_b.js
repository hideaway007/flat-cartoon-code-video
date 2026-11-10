// costumes.py, lines 1394-end. BGR colours, draw order and painter calls match Python.
// No executable preset-sheet block; _bugle and _exam remain available.
import { rot, crom, ellipse_pts, linspace, arange, range, interp, cumsum, get, mod } from './np.js';
import { LINE, WHITE, INK } from './painter.js';
import { STEEL, STEEL_DK, IRON, GOLD, GOLD_DK, BRONZE, WOOD, WOOD_DK, LEATHER, PAPER, LINEN,
  RED, RED_DK, BLUE, GREEN, BLACK, FLAME, FLAME_IN, BOWS, SHIELDS, _n, _perp, dk, device, _lace_ticks } from './costumes_a.js';

// Python/NumPy semantics used in the direct translation below. Lists of points and
// vectors share JS's Array representation; rank alignment reproduces broadcasting.
const _rank = a => Array.isArray(a) ? 1 + (a.length ? _rank(a[0]) : 0) : 0;
function _binary(a, b, f) {
  if (!Array.isArray(a) && !Array.isArray(b)) return f(a, b);
  const ra = _rank(a), rb = _rank(b);
  if (ra > rb) return a.map(x => _binary(x, b, f));
  if (rb > ra) return b.map(y => _binary(a, y, f));
  return a.map((x, i) => _binary(x, b[b.length === 1 ? 0 : i], f));
}
const _add = (a,b) => _binary(a,b,(x,y) => x+y);
const _sub = (a,b) => _binary(a,b,(x,y) => x-y);
const _mul = (a,b) => _binary(a,b,(x,y) => x*y);
const _div = (a,b) => _binary(a,b,(x,y) => x/y);
const _neg = a => Array.isArray(a) ? a.map(_neg) : -a;
const _truth = a => a != null && (Array.isArray(a) || typeof a === 'string' ? a.length > 0 : typeof a === 'object' ? Object.keys(a).length > 0 : Boolean(a));
const _or = (a,b) => _truth(a) ? a : b();
const _and = (a,b) => _truth(a) ? b() : a;
const _contains = (a,b) => a instanceof Set ? a.has(b) : Array.isArray(a) || typeof a === 'string' ? a.includes(b) : Object.prototype.hasOwnProperty.call(a,b);
const _enumerate = a => a.map((v,i) => [i,v]);
const _sum = a => a.reduce((s,v) => s+v,0);
const _hypot = (...args) => args.some(Array.isArray) ? args[0].map((_,i) => Math.hypot(...args.map(a => Array.isArray(a) ? a[i] : a))) : Math.hypot(...args);
const _transpose = a => a[0].map((_,i) => a.map(row => row[i]));
const _diff = a => a.slice(1).map((p,i) => _sub(p,a[i]));
const _outer = (a,b) => a.map(x => b.map(y => x*y));
const _vstack = parts => parts.flat();
const _item = (a,i) => a[(Array.isArray(a) || typeof a === 'string') && i < 0 ? a.length+i : i];
function _slice(a, start = null, stop = null, step = null) {
  const n=a.length, st=step == null ? 1 : step;
  let lo=start == null ? (st>0 ? 0 : n-1) : (start<0 ? n+start : start);
  let hi=stop == null ? (st>0 ? n : -1) : (stop<0 ? n+stop : stop);
  lo=st>0 ? Math.min(Math.max(lo,0),n) : Math.min(Math.max(lo,-1),n-1);
  hi=st>0 ? Math.min(Math.max(hi,0),n) : Math.min(Math.max(hi,-1),n-1);
  const out=[]; for (let i=lo; st>0 ? i<hi : i>hi; i+=st) out.push(a[i]); return out;
}

export function _R(c, a) {
  return (pts) => _add(rot(pts, a), c);
}

export function _rect(x0, x1, w) {
  return [[x0, _div(_neg(w), 2)], [x1, _div(_neg(w), 2)], [x1, _div(w, 2)], [x0, _div(w, 2)]];
}

export function prop(C, kind, side) {
  let D, L, L0, L1, L_, P_, R, Ra, a, a2, a_, ang, b, b0, b1, b_, bar_d, bend, blade, body, br, c, chip, cl, cloth, cov, d, d_, dn, dx, e, fc, fx, gl, h, her, hp, hs, limb, ln, mc, nock, o, pc, pl, pp, pr, prod, pt, pts, q, r_, rt, sc_, sg, tag, tip, top, u, u_, up_, v, w, x, y;
  [pt, D] = [C.pt, C.D];
  [c, a] = C.prop_frame(side);
  R = _R(c, a);
  tag = (_truth(((side < 0))) ? "L" : "R");
  tip = null;
  if (_truth(((kind === "sword")))) {
    pt.ell(..._item(R([[-62, 0]]), 0), 22, 22, GOLD, _mul(LINE, 0.8));
    pt.shape(R(_rect(-50, 46, 28)), LEATHER, _mul(LINE, 0.8));
    pt.shape(R([[64, -20], [420, -18], [480, 0], [420, 18], [64, 20]]), STEEL, _mul(LINE, 0.9));
    pt.line(R([[80, 0], [400, 0]]), _mul(LINE, 0.4), STEEL_DK);
    pt.shape(R(_rect(40, 66, 160)), GOLD, _mul(LINE, 0.8));
    tip = _item(R([[480, 0]]), 0);
  }
  else if (_truth(((kind === "gladius")))) {
    pt.ell(..._item(R([[-62, 0]]), 0), 26, 26, BRONZE, _mul(LINE, 0.8));
    pt.shape(R(_rect(-46, 40, 30)), WOOD, _mul(LINE, 0.8));
    pt.shape(R([[56, -24], [230, -28], [290, -18], [330, 0], [290, 18], [230, 28], [56, 24]]), STEEL, _mul(LINE, 0.9));
    pt.shape(R(_rect(38, 60, 80)), BRONZE, _mul(LINE, 0.8));
    tip = _item(R([[330, 0]]), 0);
  }
  else if (_truth(((kind === "katana")))) {
    blade = [[64, -15]].concat(linspace(0.1, 1, 8).map((u) => [_add(64, _mul(u, 470)), _sub(-15, _mul(_mul(40, u), u))])).concat([[540, -60]]).concat(linspace(1, 0.1, 8).map((u) => [_add(64, _mul(u, 470)), _sub(13, _mul(_mul(40, u), u))])).concat([[64, 15]]);
    pt.shape(R(blade), STEEL, _mul(LINE, 0.9));
    pt.shape(R(_rect(-120, 48, 32)), WHITE, _mul(LINE, 0.8));
    for (x of [-90, -50, -10, 30]) {
      pt.line(R([[_sub(x, 14), -14], [_add(x, 14), 14]]), _mul(LINE, 0.5));
      pt.line(R([[_sub(x, 14), 14], [_add(x, 14), -14]]), _mul(LINE, 0.5));
    }
    pt.shape(R(ellipse_pts(54, 0, 12, 44, 0, 24)), BLACK, _mul(LINE, 0.8));
    tip = _item(R([[540, -60]]), 0);
  }
  else if (_truth((_contains(["spear", "staff"], kind)))) {
    [L0, L1] = (_truth(((kind === "spear"))) ? [-450, 660] : [-450, 560]);
    pt.stroke(R([[L0, 0], [L1, 0]]), WOOD, 22, _mul(LINE, 0.8));
    if (_truth(((kind === "spear")))) {
      pt.shape(R([[650, -16], [700, -32], [810, 0], [700, 32], [650, 16]]), STEEL, _mul(LINE, 0.9));
      pt.shape(R(_rect(630, 660, 30)), IRON, _mul(LINE, 0.7));
      tip = _item(R([[810, 0]]), 0);
    }
    else {
      tip = _item(R([[L1, 0]]), 0);
    }
  }
  else if (_truth(((kind === "crook")))) {
    pt.stroke(R([[-160, 0], [260, 0], [330, -20], [346, -70], [306, -100]]), GOLD, 22, _mul(LINE, 0.8), true);
    for (x of [-60, 20, 100, 180, 260]) {
      pt.line(R([[x, -11], [x, 11]]), _mul(LINE, 1.3), BLUE);
    }
    tip = _item(R([[370, -70]]), 0);
  }
  else if (_truth(((kind === "axe")))) {
    pt.stroke(R([[-110, 0], [360, 0]]), WOOD, 26, _mul(LINE, 0.8));
    pt.blob(R([[296, -14], [346, -14], [380, -70], [400, -150], [330, -140], [292, -60]]), STEEL, _mul(LINE, 0.9), 6);
    tip = _item(R([[400, -150]]), 0);
  }
  else if (_truth((_contains(["hammer", "mallet"], kind)))) {
    pt.stroke(R([[-90, 0], [300, 0]]), WOOD, 26, _mul(LINE, 0.8));
    if (_truth(((kind === "hammer")))) {
      pt.shape(R([[270, -96], [330, -96], [334, 44], [314, 70], [286, 70], [266, 44]]), IRON, _mul(LINE, 0.9));
      pt.line(R([[270, -60], [330, -60]]), _mul(LINE, 0.5));
    }
    else {
      pt.blob(R([[250, -100], [350, -100], [356, 100], [244, 100]]), WOOD_DK, _mul(LINE, 0.9), 4);
      for (x of [268, 332]) {
        pt.line(R([[x, -96], [x, 96]]), _mul(LINE, 0.5));
      }
    }
    tip = _item(R([[300, -96]]), 0);
  }
  else if (_truth(((kind === "mace")))) {
    pt.stroke(R([[-80, 0], [260, 0]]), WOOD_DK, 24, _mul(LINE, 0.8));
    for (a2 of linspace(0, _mul(Math.PI, 2), 6, false)) {
      d = [Math.cos(a2), Math.sin(a2)];
      pt.shape(R([_add(_add([300, 0], _mul(d, 10)), _mul(_perp(d), 18)), _add([300, 0], _mul(d, 70)), _sub(_add([300, 0], _mul(d, 10)), _mul(_perp(d), 18))]), STEEL, _mul(LINE, 0.7));
    }
    pt.ell(..._item(R([[300, 0]]), 0), 40, 40, STEEL, _mul(LINE, 0.8));
    tip = _item(R([[300, 0]]), 0);
  }
  else if (_truth((_contains(BOWS, kind)))) {
    b = C.bow;
    L = _item(b, "L");
    bend = (_truth(_item(b, "drawn")) ? 150 : 90);
    limb = [[L, _neg(bend)], [_mul(L, 0.55), _mul(_neg(bend), 0.25)], [0, 0], [_mul(_neg(L), 0.55), _mul(_neg(bend), 0.25)], [_neg(L), _neg(bend)]];
    pts = crom(limb, false, 10);
    pt.stroke(R(pts), (_truth(((kind === "longbow"))) ? WOOD : WOOD_DK), 22, _mul(LINE, 0.8), undefined, false);
    if (_truth(!_truth(_item(b, "drawn")))) {
      pt.line(_item(b, "tips"), _mul(LINE, 0.35));
    }
    pt.shape(R(_rect(-36, 36, 34)), LEATHER, _mul(LINE, 0.6), undefined, false);
    tip = _item(_item(b, "tips"), 0);
  }
  else if (_truth(((kind === "arrow")))) {
    b = C.bow;
    if (_truth(_and(((b !== null)), () => ((_item(b, "side") !== side))))) {
      nock = c;
      d = _n(_sub(_item(b, "c"), nock));
      ang = Math.atan2(_item(d, 1), _item(d, 0));
      pt.line([_item(_item(b, "tips"), 0), nock], _mul(LINE, 0.35));
      pt.line([_item(_item(b, "tips"), 1), nock], _mul(LINE, 0.35));
      Ra = _R(nock, ang);
      ln = _add(Number(_hypot(..._sub(_item(b, "c"), nock))), 90);
    }
    else {
      [Ra, ln] = [R, 520];
    }
    pt.stroke(Ra([[-10, 0], [ln, 0]]), WOOD, 9, _mul(LINE, 0.6), undefined, false);
    pt.shape(Ra([[_sub(ln, 6), -16], [_add(ln, 44), 0], [_sub(ln, 6), 16]]), STEEL, _mul(LINE, 0.6));
    for (sg of [-1, 1]) {
      pt.shape(Ra([[4, 0], [60, 0], [40, _mul(sg, 22)], [0, _mul(sg, 22)]]), WHITE, _mul(LINE, 0.5), undefined, false);
    }
    tip = _item(Ra([[_add(ln, 44), 0]]), 0);
  }
  else if (_truth(((kind === "crossbow")))) {
    pt.blob(R([[-170, -18], [40, -26], [290, -18], [290, 18], [40, 26], [-60, 40], [-170, 46]]), WOOD, _mul(LINE, 0.9), 4);
    prod = [[240, -170], [268, -110], [280, 0], [268, 110], [240, 170]];
    pt.stroke(R(crom(prod, false, 8)), IRON, 18, _mul(LINE, 0.7), undefined, false);
    pt.line(R([[240, -168], [110, 0], [240, 168]]), _mul(LINE, 0.35));
    pt.stroke(R([[110, -6], [330, -6]]), WOOD_DK, 9, _mul(LINE, 0.5), undefined, false);
    pt.shape(R([[326, -20], [360, -6], [326, 8]]), STEEL, _mul(LINE, 0.5));
    tip = _item(R([[360, -6]]), 0);
  }
  else if (_truth((_contains(SHIELDS, kind)))) {
    tip = shield(C, kind, side);
  }
  else if (_truth(((kind === "scroll")))) {
    pt.shape(R(_rect(-20, 70, 210)), PAPER, _mul(LINE, 0.8));
    pt.shape(R(_rect(-6, 28, 214)), RED, _mul(LINE, 0.6), undefined, false);
    tip = _item(R([[70, 0]]), 0);
  }
  else if (_truth(((kind === "scroll_open")))) {
    if (_truth(_and(((side < 0)), () => ((C.held(1) === "scroll_open"))))) {
      [pl, pr] = [_item(_item(C.arms, -1), 2), _item(_item(C.arms, 1), 2)];
      up_ = [0, -1.0];
      h = 300;
      q = [_add(pl, _mul(up_, _mul(h, 0.55))), _add(pr, _mul(up_, _mul(h, 0.55))), _sub(pr, _mul(up_, _mul(h, 0.45))), _sub(pl, _mul(up_, _mul(h, 0.45)))];
      pt.shape(q, PAPER, _mul(LINE, 0.8));
      for (u of linspace(0.18, 0.82, 5)) {
        a_ = _add(_item(q, 0), _mul(_sub(_item(q, 3), _item(q, 0)), u));
        b_ = _add(_item(q, 1), _mul(_sub(_item(q, 2), _item(q, 1)), u));
        L_ = _sub(b_, a_);
        pts = linspace(0.14, 0.86, 18).map((t) => _add(_add(a_, _mul(L_, t)), [0, _mul(6, Math.sin(_mul(t, 40)))]));
        pt.line(pts, _mul(LINE, 0.45), [70, 70, 80]);
      }
      for (pp of [pl, pr]) {
        pt.shape([_sub(_add(pp, _mul(up_, _mul(h, 0.62))), [16, 0]), _add(_add(pp, _mul(up_, _mul(h, 0.62))), [16, 0]), _add(_sub(pp, _mul(up_, _mul(h, 0.52))), [16, 0]), _sub(_sub(pp, _mul(up_, _mul(h, 0.52))), [16, 0])], WOOD, _mul(LINE, 0.7));
      }
    }
  }
  else if (_truth(((kind === "book")))) {
    u_ = _n(_sub(_item(R([[1, 0]]), 0), c));
    r_ = _neg(_perp(u_));
    o = _add(c, _mul(u_, 110));
    cov = get(D, "book", RED_DK);
    pt.shape([_sub(_sub(o, _mul(r_, 170)), _mul(u_, 120)), _sub(_add(o, _mul(r_, 170)), _mul(u_, 120)), _add(_add(o, _mul(r_, 176)), _mul(u_, 116)), _add(_sub(o, _mul(r_, 176)), _mul(u_, 116))], cov, _mul(LINE, 0.8));
    for (sg of [-1, 1]) {
      pt.shape([_sub(_add(o, _mul(_mul(r_, 4), sg)), _mul(u_, 110)), _sub(_add(o, _mul(_mul(r_, 160), sg)), _mul(u_, 104)), _add(_add(o, _mul(_mul(r_, 164), sg)), _mul(u_, 104)), _add(_add(o, _mul(_mul(r_, 4), sg)), _mul(u_, 96))], PAPER, _mul(LINE, 0.6), undefined, false);
      for (v of [-50, -10, 30, 70]) {
        pt.line([_add(_add(o, _mul(_mul(r_, 30), sg)), _mul(u_, _neg(v))), _add(_add(o, _mul(_mul(r_, 130), sg)), _mul(u_, _neg(v)))], _mul(LINE, 0.35), [90, 90, 100]);
      }
    }
    tip = o;
  }
  else if (_truth(((kind === "torch")))) {
    pt.stroke(R([[-90, 0], [250, 0]]), WOOD, 30, _mul(LINE, 0.8));
    pt.shape(R(_rect(220, 290, 46)), WOOD_DK, _mul(LINE, 0.8));
    fc = _item(R([[300, 0]]), 0);
    _flame(pt, fc, 1.0);
    tip = fc;
  }
  else if (_truth(((kind === "flag")))) {
    pt.stroke(R([[-340, 0], [720, 0]]), WOOD, 20, _mul(LINE, 0.8));
    pt.ell(..._item(R([[735, 0]]), 0), 20, 20, GOLD, _mul(LINE, 0.7));
    her = _or(get(D, "heraldry", undefined), () => ({field: RED, device: "none"}));
    cloth = [[700, -10], [716, -120], [690, -230], [706, -350], [450, -350], [436, -230], [460, -120], [440, -10]];
    q = R(cloth);
    pt.shape(R(crom(_slice(cloth, null, 4, null), false, 6).concat(crom(_slice(cloth, 4, null, null), false, 6))), _item(her, "field"), _mul(LINE, 0.8));
    if (_truth(((get(her, "device", "none") !== "none")))) {
      device(pt, her, _item(R([[575, -180]]), 0), 70, _add(a, _div(Math.PI, 2)));
    }
    tip = _item(R([[735, 0]]), 0);
  }
  else if (_truth(((kind === "banner")))) {
    pt.stroke(R([[-400, 0], [960, 0]]), WOOD, 20, _mul(LINE, 0.8));
    top = _item(R([[900, 0]]), 0);
    bar_d = _sub(_item(R([[900, 1]]), 0), top);
    pt.stroke([_sub(top, _mul(bar_d, 150)), _add(top, _mul(bar_d, 150))], WOOD, 16, _mul(LINE, 0.7));
    her = _or(get(D, "heraldry", undefined), () => ({field: RED, device: "none"}));
    dn = [0, 1.0];
    rt = [1.0, 0];
    cl = [_add(_sub(top, _mul(rt, 130)), _mul(dn, 8)), _add(_add(top, _mul(rt, 130)), _mul(dn, 8)), _add(_add(top, _mul(rt, 130)), _mul(dn, 300)), _add(top, _mul(dn, 330)), _add(_sub(top, _mul(rt, 130)), _mul(dn, 300))];
    pt.shape(cl, _item(her, "field"), _mul(LINE, 0.8));
    for (u of linspace(-110, 110, 6)) {
      pt.line([_sub(_add(_add(top, _mul(rt, u)), _mul(dn, 302)), _mul(rt, 0)), _add(_add(top, _mul(rt, u)), _mul(dn, 336))], _mul(LINE, 0.5), GOLD);
    }
    if (_truth(((get(her, "device", "none") !== "none")))) {
      device(pt, her, _add(top, _mul(dn, 160)), 74, 0.0);
    }
    pt.ell(..._item(R([[975, 0]]), 0), 22, 22, GOLD, _mul(LINE, 0.7));
    tip = top;
  }
  else if (_truth(((kind === "quill")))) {
    pt.line(R([[-30, 0], [90, 0]]), _mul(LINE, 0.8));
    pt.blob(R([[40, 0], [120, -30], [240, -40], [300, -20], [200, 6], [100, 10]]), WHITE, _mul(LINE, 0.7), 6);
    pt.line(R([[60, 0], [280, -24]]), _mul(LINE, 0.4));
    tip = _item(R([[-30, 0]]), 0);
  }
  else if (_truth((_contains(["lantern", "paper_lantern"], kind)))) {
    dn = [0, 1.0];
    top = _add(c, _mul(dn, 30));
    if (_truth(((kind === "lantern")))) {
      body = _add(top, _mul(dn, 150));
      pt.line([c, _add(top, _mul(dn, 50))], _mul(LINE, 0.6));
      pt.shape([_add(body, [-56, -60]), _add(body, [56, -60]), _add(body, [50, 70]), _add(body, [-50, 70])], FLAME_IN, _mul(LINE, 0.8), undefined, false);
      pt.ell(..._add(body, [0, 6]), 18, 30, FLAME, 0, undefined, false);
      for (x of [-56, 0, 56]) {
        pt.line([_add(body, [x, -60]), _add(body, [_mul(x, 0.9), 70])], _mul(LINE, 0.6));
      }
      pt.shape([_add(body, [-70, -60]), _add(body, [0, -110]), _add(body, [70, -60])], IRON, _mul(LINE, 0.8));
      pt.shape([_add(body, [-66, 70]), _add(body, [66, 70]), _add(body, [66, 92]), _add(body, [-66, 92])], IRON, _mul(LINE, 0.8));
      tip = body;
    }
    else {
      body = _add(top, _mul(dn, 150));
      pt.line([c, _add(top, _mul(dn, 40))], _mul(LINE, 0.6));
      pt.ell(_item(body, 0), _item(body, 1), 86, 104, RED, _mul(LINE, 0.9));
      for (x of [-44, 0, 44]) {
        pt.line([_add(body, [x, _add(-100, _mul(Math.abs(x), 0.4))]), _add(body, [_mul(x, 1.2), 0]), _add(body, [x, _sub(100, _mul(Math.abs(x), 0.4))])], _mul(LINE, 0.5), undefined, true);
      }
      for (y of [-104, 104]) {
        pt.shape([_add(body, [-40, _sub(y, 12)]), _add(body, [40, _sub(y, 12)]), _add(body, [40, _add(y, 12)]), _add(body, [-40, _add(y, 12)])], GOLD, _mul(LINE, 0.6));
      }
      pt.line([_add(body, [0, 116]), _add(body, [0, 190])], _mul(LINE, 1.4), RED);
      tip = body;
    }
  }
  else if (_truth(((kind === "wrench")))) {
    pt.stroke(R([[-60, 0], [240, 0]]), STEEL, 34, _mul(LINE, 0.8));
    pt.blob(R([[230, -40], [300, -60], [340, -36], [300, -22], [300, 22], [340, 36], [300, 60], [230, 40]]), STEEL, _mul(LINE, 0.8), 3);
    tip = _item(R([[320, 0]]), 0);
  }
  else if (_truth(((kind === "mug")))) {
    hs = (_truth(((C.fac !== "b"))) ? 1 : -1);
    o = _add(c, [_mul(hs, 92), -46]);
    mc = get(D, "mug", [200, 226, 238]);
    hp = [_add(o, [_mul(_neg(hs), 56), -34]), _add(c, [_mul(_neg(hs), 6), -30]), _add(c, [_mul(_neg(hs), 8), 12]), _add(o, [_mul(_neg(hs), 56), 26])];
    pt.stroke(crom(hp, false, 6), mc, 22, _mul(LINE, 0.7), undefined, false);
    pt.shape([_add(o, [-58, -66]), _add(o, [58, -66]), _add(o, [52, 70]), _add(o, [-52, 70])], mc, _mul(LINE, 0.9));
    pt.ell(_item(o, 0), _sub(_item(o, 1), 66), 58, 15, [50, 70, 100], _mul(LINE, 0.7), undefined, false);
    chip = _add(o, [_mul(hs, 30), -72]);
    pt.shape([_add(chip, [-16, -4]), _add(chip, [16, -4]), _add(chip, [2, 16])], mc, _mul(LINE, 0.5), undefined, false);
    pt.line([_add(chip, [2, 16]), _add(chip, [8, 34])], _mul(LINE, 0.35));
    fx = _sub(_item(o, 0), 12);
    for ([a_, b_] of [[[fx, _sub(_item(o, 1), 30)], [fx, _add(_item(o, 1), 40)]], [[fx, _sub(_item(o, 1), 30)], [_add(fx, 34), _sub(_item(o, 1), 30)]], [[fx, _add(_item(o, 1), 2)], [_add(fx, 26), _add(_item(o, 1), 2)]]]) {
      pt.stroke([a_, b_], RED, 14, _mul(LINE, 0.35), undefined, false);
    }
    if (_truth(get(D, "steam", true))) {
      for (dx of [-16, 18]) {
        pt.line([_add(o, [dx, -96]), _add(o, [_add(dx, 12), -126]), _add(o, [_sub(dx, 4), -154]), _add(o, [_add(dx, 8), -182])], _mul(LINE, 0.9), [225, 225, 225], true);
      }
    }
    tip = _add(o, [0, -66]);
  }
  else if (_truth(((kind === "red_pen")))) {
    pt.stroke(R([[-40, 0], [120, 0]]), RED, 26, _mul(LINE, 0.7));
    pt.stroke(R([[60, 0], [124, 0]]), RED_DK, 28, _mul(LINE, 0.7));
    pt.line(R([[70, -12], [110, -12]]), _mul(LINE, 0.4), STEEL);
    pt.shape(R([[-40, -13], [-78, -3], [-82, 0], [-78, 3], [-40, 13]]), WHITE, _mul(LINE, 0.6), undefined, false);
    pt.dot(..._item(R([[-80, 0]]), 0), 6, RED);
    tip = _item(R([[-82, 0]]), 0);
  }
  else if (_truth(((kind === "stamp")))) {
    pt.ell(_item(c, 0), _sub(_item(c, 1), 74), 36, 32, WOOD, _mul(LINE, 0.8));
    pt.stroke([_add(c, [0, -50]), _add(c, [0, 46])], WOOD, 30, _mul(LINE, 0.8));
    pt.shape([_add(c, [-76, 40]), _add(c, [76, 40]), _add(c, [76, 92]), _add(c, [-76, 92])], WOOD_DK, _mul(LINE, 0.8));
    pt.shape([_add(c, [-80, 92]), _add(c, [80, 92]), _add(c, [80, 112]), _add(c, [-80, 112])], RED, _mul(LINE, 0.7), undefined, false);
    tip = _add(c, [0, 112]);
  }
  else if (_truth(((kind === "detector")))) {
    tip = _detector(C, c, side);
  }
  else if (_truth((_contains(["exam", "exam_f"], kind)))) {
    tip = _exam(C, c, side, kind);
  }
  else if (_truth(((kind === "note")))) {
    u_ = _n(_sub(_item(R([[1, 0]]), 0), c));
    r_ = _neg(_perp(u_));
    o = _add(c, _mul(u_, 52));
    [w, h] = [56, 44];
    pc = get(D, "note", PAPER);
    pt.shape([_sub(_sub(o, _mul(r_, w)), _mul(u_, h)), _add(_sub(_add(o, _mul(r_, w)), _mul(u_, h)), _mul(u_, 6)), _add(_add(o, _mul(r_, w)), _mul(u_, h)), _sub(_add(_sub(o, _mul(r_, w)), _mul(u_, h)), _mul(u_, 4))], pc, _mul(LINE, 0.7));
    pt.line([_add(_sub(o, _mul(u_, h)), _mul(u_, 2)), _sub(_add(o, _mul(u_, h)), _mul(u_, 1))], _mul(LINE, 0.4), dk(pc, 0.75));
    pt.shape([_add(_add(o, _mul(r_, w)), _mul(u_, h)), _add(_add(o, _mul(r_, _sub(w, 22))), _mul(u_, h)), _add(_add(o, _mul(r_, w)), _mul(u_, _sub(h, 20)))], dk(pc, 0.88), _mul(LINE, 0.4), undefined, false);
    for (v of [-14, 6]) {
      pt.line([_add(_add(o, _mul(r_, 10)), _mul(u_, v)), _add(_add(o, _mul(r_, _sub(w, 14))), _mul(u_, v))], _mul(LINE, 0.3), [110, 110, 120]);
    }
    tip = o;
  }
  else if (_truth(((kind === "cartridge")))) {
    u_ = _n(_sub(_item(R([[1, 0]]), 0), c));
    r_ = _neg(_perp(u_));
    br = get(D, "cartridge", [64, 178, 226]);
    [b0, b1] = [_add(c, _mul(u_, 6)), _add(c, _mul(u_, 112))];
    pt.shape([_sub(b0, _mul(r_, 17)), _sub(b1, _mul(r_, 15)), _add(b1, _mul(r_, 15)), _add(b0, _mul(r_, 17))], br, _mul(LINE, 0.6));
    pt.shape([_sub(b0, _mul(r_, 21)), _add(_sub(b0, _mul(r_, 21)), _mul(u_, 10)), _add(_add(b0, _mul(r_, 21)), _mul(u_, 10)), _add(b0, _mul(r_, 21))], dk(br, 0.85), _mul(LINE, 0.5), undefined, false);
    pt.ell(_item(b1, 0), _item(b1, 1), 14, 6, [40, 70, 90], _mul(LINE, 0.4), C.lean, false);
    pt.line([_add(_add(b0, _mul(r_, 6)), _mul(u_, 22)), _sub(_add(b1, _mul(r_, 6)), _mul(u_, 12))], _mul(LINE, 0.35), [200, 236, 250]);
    if (_truth(get(D, "cartridge_glint", true))) {
      for (ang of [0.0, 0.8, -0.8]) {
        d_ = rot([0.0, -1.0], ang);
        pt.line([_add(b1, _mul(d_, 24)), _add(b1, _mul(d_, 44))], _mul(LINE, 0.45), [110, 220, 250]);
      }
    }
    tip = b1;
  }
  else if (_truth(((kind === "beer")))) {
    hs = (_truth(((C.fac !== "b"))) ? 1 : -1);
    o = _add(c, [_mul(hs, 88), -44]);
    gl = [226, 226, 214];
    hp = [_add(o, [_mul(_neg(hs), 50), -38]), _add(c, [_mul(_neg(hs), 4), -34]), _add(c, [_mul(_neg(hs), 6), 14]), _add(o, [_mul(_neg(hs), 50), 30])];
    pt.stroke(crom(hp, false, 6), gl, 22, _mul(LINE, 0.7), undefined, false);
    pt.shape([_add(o, [-54, -62]), _add(o, [54, -62]), _add(o, [50, 70]), _add(o, [-50, 70])], get(D, "beer", [40, 156, 224]), _mul(LINE, 0.9));
    pt.shape([_add(o, [-50, 52]), _add(o, [50, 52]), _add(o, [50, 70]), _add(o, [-50, 70])], gl, _mul(LINE, 0.5), undefined, false);
    for (x of [-26, 0, 26]) {
      pt.line([_add(o, [x, -40]), _add(o, [_mul(x, 0.95), 46])], _mul(LINE, 0.3), [90, 196, 240]);
    }
    pt.line([_add(o, [-38, -30]), _add(o, [-36, 36])], _mul(LINE, 0.5), [190, 236, 250]);
    pt.blob([_add(o, [-62, -58]), _add(o, [-60, -88]), _add(o, [-30, -106]), _add(o, [2, -96]), _add(o, [34, -110]), _add(o, [62, -86]), _add(o, [60, -58]), _add(o, [36, -50]), _add(o, [40, -24]), _add(o, [26, -50])], WHITE, _mul(LINE, 0.8), 4);
    tip = _add(o, [0, -96]);
  }
  else if (_truth(((kind === "bugle")))) {
    _bugle(pt, R, D);
    tip = _item(R([[280, 0]]), 0);
  }
  else if (_truth(((kind === "folder")))) {
    u_ = _n(_sub(_item(R([[1, 0]]), 0), c));
    r_ = _neg(_perp(u_));
    o = _add(c, _mul(u_, 120));
    mc = get(D, "folder", [120, 196, 226]);
    P_ = (x, y) => _add(_add(o, _mul(r_, x)), _mul(u_, y));
    pt.shape([P_(-112, -140), P_(112, -140), P_(112, 140), P_(-30, 140), P_(-40, 160), P_(-104, 160), P_(-112, 140)], dk(mc, 0.9), _mul(LINE, 0.8));
    pt.shape([P_(-92, 150), P_(-52, 150), P_(-52, 140), P_(-92, 140)], WHITE, _mul(LINE, 0.3), undefined, false);
    pt.shape([P_(-96, -124), P_(104, -124), P_(100, 150), P_(-96, 150)], WHITE, _mul(LINE, 0.5), undefined, false);
    pt.shape([P_(-112, -140), P_(112, -140), P_(108, 126), P_(-112, 126)], mc, _mul(LINE, 0.8));
    pt.line([P_(-60, 90), P_(60, 90)], _mul(LINE, 0.35), dk(mc, 0.7));
    pt.line([P_(-60, 70), P_(30, 70)], _mul(LINE, 0.35), dk(mc, 0.7));
    tip = o;
  }
  else if (_truth(((kind === "sticker")))) {
    o = _item(R([[118, 0]]), 0);
    sc_ = get(D, "sticker", [60, 214, 250]);
    pt.ell(_item(o, 0), _item(o, 1), 54, 54, sc_, _mul(LINE, 0.8));
    for (sg of [-1, 1]) {
      e = _add(o, [_mul(sg, 20), -10]);
      pt.line([_add(e, [-9, -9]), _add(e, [9, 9])], _mul(LINE, 0.55));
      pt.line([_add(e, [-9, 9]), _add(e, [9, -9])], _mul(LINE, 0.55));
    }
    pt.line([_add(o, [-16, 24]), _add(o, [16, 24])], _mul(LINE, 0.55));
    pt.shape([_add(o, [28, -46]), _add(o, [50, -24]), _add(o, [36, -22])], WHITE, _mul(LINE, 0.5), undefined, false);
    tip = o;
  }
  else if (_truth(((kind === "carbine")))) {
    pt.shape(R([[-220, -18], [-40, -16], [-20, 26], [-220, 46]]), WOOD, _mul(LINE, 0.85));
    pt.shape(R(_rect(-40, 90, 32)), IRON, _mul(LINE, 0.8));
    pt.shape(R([[10, -16], [76, -42], [82, -26], [16, -4]]), STEEL, _mul(LINE, 0.7));
    pt.stroke(R([[86, -6], [440, -6]]), IRON, 20, _mul(LINE, 0.8));
    pt.shape(R(_rect(86, 290, 28)), WOOD, _mul(LINE, 0.75));
    pt.shape(R(_rect(190, 206, 32)), STEEL, _mul(LINE, 0.6));
    tip = _item(R([[440, -6]]), 0);
  }
  else if (_truth(((kind === "winchester")))) {
    pt.shape(R([[-230, -18], [-50, -16], [-30, 26], [-230, 48]]), WOOD, _mul(LINE, 0.85));
    pt.shape(R(_rect(-50, 96, 36)), GOLD, _mul(LINE, 0.85));
    pt.stroke(R([[-10, 18], [44, 58], [82, 42], [36, 14]]), IRON, 12, _mul(LINE, 0.65));
    pt.stroke(R([[96, -9], [470, -9]]), IRON, 18, _mul(LINE, 0.75));
    pt.stroke(R([[96, 9], [464, 9]]), GOLD_DK, 15, _mul(LINE, 0.7));
    pt.shape(R(_rect(240, 256, 34)), GOLD, _mul(LINE, 0.6));
    tip = _item(R([[470, -9]]), 0);
  }
  else if (_truth(((kind === "binoculars")))) {
    pt.shape(R(_rect(-24, 130, 56)), BLACK, _mul(LINE, 0.85));
    pt.shape(R([[-24, -34], [136, -46], [136, 46], [-24, 34]]), BLACK, _mul(LINE, 0.85));
    pt.shape(R(_rect(-34, -18, 52)), GOLD, _mul(LINE, 0.7));
    pt.shape(R(_rect(120, 142, 92)), GOLD, _mul(LINE, 0.75));
    pt.ell(..._item(R([[142, 0]]), 0), 14, 38, [220, 200, 140], _mul(LINE, 0.6), undefined, false);
    tip = _item(R([[142, 0]]), 0);
  }
  else if (_truth(((kind === "pickaxe")))) {
    pt.stroke(R([[-110, 0], [340, 0]]), WOOD, 26, _mul(LINE, 0.8));
    pt.shape(R([[270, -160], [310, -24], [330, 0], [310, 24], [270, 160], [294, 0]]), IRON, _mul(LINE, 0.9));
    tip = _item(R([[270, -160]]), 0);
  }
  else if (_truth(((kind === "gold_pan")))) {
    u_ = _n(_sub(_item(R([[1, 0]]), 0), c));
    r_ = _neg(_perp(u_));
    o = _add(_add(c, _mul(r_, 90)), _mul(u_, 20));
    P_ = (x, y) => _add(_add(o, _mul(r_, x)), _mul(u_, y));
    pt.shape([P_(-130, 20), P_(130, 20), P_(96, -38), P_(-96, -38)], IRON, _mul(LINE, 0.85));
    pt.ell(_item(o, 0), _add(_item(o, 1), 20), 130, 32, STEEL_DK, _mul(LINE, 0.8));
    for (const [dx, dy, rad] of [[-45, 18, 16], [10, 24, 20], [55, 16, 15], [-15, 10, 14]]) {
      const gp = _add(_add(o, _mul(r_, dx)), _mul(u_, dy));
      pt.ell(_item(gp, 0), _item(gp, 1), rad, rad * 0.75, GOLD, _mul(LINE, 0.6));
    }
    tip = o;
  }
  else if (_truth(((kind === "telegraph")))) {
    u_ = _n(_sub(_item(R([[1, 0]]), 0), c));
    r_ = _neg(_perp(u_));
    o = _add(c, _mul(u_, 95));
    P_ = (x, y) => _add(_add(o, _mul(r_, x)), _mul(u_, y));
    pt.shape([P_(-95, -110), P_(95, -110), P_(95, 110), P_(-95, 110)], [140, 224, 248], _mul(LINE, 0.8));
    pt.shape([P_(-95, 76), P_(95, 76), P_(95, 110), P_(-95, 110)], RED, _mul(LINE, 0.6), undefined, false);
    for (v of [40, 10, -20, -50, -80]) {
      pt.line([P_(-70, v), P_(70, v)], _mul(LINE, 0.4), INK);
    }
    tip = o;
  }
  else if (_truth(((kind === "hardtack")))) {
    u_ = _n(_sub(_item(R([[1, 0]]), 0), c));
    r_ = _neg(_perp(u_));
    o = _add(c, _mul(u_, 70));
    P_ = (x, y) => _add(_add(o, _mul(r_, x)), _mul(u_, y));
    pt.shape([P_(-125, -85), P_(125, -85), P_(125, 85), P_(-125, 85)], WOOD, _mul(LINE, 0.85));
    for (v of [-30, 30]) {
      pt.line([P_(-122, v), P_(122, v)], _mul(LINE, 0.5), WOOD_DK);
    }
    pt.shape([P_(-125, -85), P_(-98, -85), P_(-98, 85), P_(-125, 85)], WOOD_DK, _mul(LINE, 0.6), undefined, false);
    pt.shape([P_(98, -85), P_(125, -85), P_(125, 85), P_(98, 85)], WOOD_DK, _mul(LINE, 0.6), undefined, false);
    tip = o;
  }
  else if (_truth(((kind === "pocketknife")))) {
    pt.shape(R(_rect(-45, 55, 26)), WOOD_DK, _mul(LINE, 0.75));
    pt.shape(R([[55, -11], [155, -9], [185, 4], [145, 13], [55, 11]]), STEEL, _mul(LINE, 0.75));
    tip = _item(R([[185, 4]]), 0);
  }
  if (_truth(((tip !== null)))) {
    C.joints[_add("tip", tag)] = tip;
    C.joints[_add("grip", tag)] = c;
  }
}

export const DETECTOR_SHAFT = [196, 192, 188];
export const DETECTOR_COIL = [62, 60, 64];
export function detector_coil_pos(C, c) {
  let sw;
  // where the search coil sits (char units, y=0 is the ground): just above the ground in front of the feet.
  // Pose field sweep (-1..1) swings it back/forward (3/4 view) or left/right (front/back view).
  sw = get(C.p, "sweep", 0.0);
  if (_truth(((C.fac === "r")))) {
    return [Math.max(_add(_add(_item(c, 0), 360), _mul(160, sw)), 150.0), -40.0];
  }
  return [_add(_mul(_item(c, 0), 0.35), _mul(230, sw)), (_truth(((C.fac === "f"))) ? -14.0 : -52.0)];
}

export function _detector(C, c, side) {
  let D, L, _, b0, back_end, box, cab, co, coilc, cuff, d, el, fa, j, m0, mc, meter, n, na, pt, shaft, top, wr;
  // 1980s metal detector: armrest + grip, control box, telescopic shaft, cable, flat round search coil.
  // The shaft always runs from the hand to the coil, so the coil stays just above the ground whatever the arm does.
  [pt, D] = [C.pt, C.D];
  shaft = get(D, "detector", DETECTOR_SHAFT);
  coilc = get(D, "detector_coil", DETECTOR_COIL);
  co = detector_coil_pos(C, c);
  top = _add(co, [0, -16]);
  d = _n(_sub(top, c));
  n = _perp(d);
  if (_truth(((_item(n, 1) > 0)))) {
    n = _neg(n);
  }
  [_, el, wr] = _item(C.arms, side);
  fa = _n(_sub(el, wr));
  back_end = _add(c, _mul(fa, Math.min(110.0, _mul(0.75, Number(_hypot(..._sub(el, wr)))))));
  pt.ell(_item(co, 0), _item(co, 1), 112, 28, coilc, _mul(LINE, 0.9));
  pt.line([_add(co, [-92, -6]), _add(co, [0, -18]), _add(co, [92, -6])], _mul(LINE, 0.4), [150, 150, 156], true);
  pt.shape([_add(top, [-22, -6]), _add(top, [22, -6]), _add(top, [16, 14]), _add(top, [-16, 14])], coilc, _mul(LINE, 0.6), undefined, false);
  pt.stroke([c, top], shaft, 18, _mul(LINE, 0.7));
  j = _add(c, _mul(_sub(top, c), 0.5));
  pt.stroke([_sub(j, _mul(d, 14)), _add(j, _mul(d, 14))], dk(shaft, 0.7), 28, _mul(LINE, 0.6), undefined, false);
  L = Number(_hypot(..._sub(top, c)));
  cab = _enumerate(linspace(0, Math.max(_sub(L, 150), 40), 9)).map(([i, s]) => _add(_add(c, _mul(d, _add(110, s))), _mul(n, (_truth(mod(i, 2)) ? 14 : -14))));
  pt.line(cab.concat([_add(top, [0, 4])]), _mul(LINE, 0.35), undefined, true);
  pt.stroke([back_end, c, _add(c, _mul(d, 20))], dk(shaft, 0.85), 22, _mul(LINE, 0.7));
  na = _perp(fa);
  if (_truth(((_item(na, 1) > 0)))) {
    na = _neg(na);
  }
  cuff = [_add(_sub(back_end, _mul(na, 6)), _mul(fa, 10)), _add(_add(back_end, _mul(na, 40)), _mul(fa, 22)), _sub(_add(back_end, _mul(na, 46)), _mul(fa, 6)), _sub(_add(back_end, _mul(na, 14)), _mul(fa, 40)), _sub(back_end, _mul(fa, 44))];
  pt.blob(cuff, BLACK, _mul(LINE, 0.7), 4);
  pt.stroke([_add(c, _mul(fa, 40)), _add(c, _mul(d, 36))], BLACK, 30, _mul(LINE, 0.6), undefined, false);
  b0 = _add(c, _mul(d, 64));
  box = [_sub(b0, _mul(n, 6)), _sub(_add(b0, _mul(d, 96)), _mul(n, 6)), _add(_add(b0, _mul(d, 96)), _mul(n, 62)), _add(b0, _mul(n, 62))];
  pt.shape(box, get(D, "detector_box", [70, 70, 76]), _mul(LINE, 0.75));
  m0 = _add(_add(b0, _mul(d, 18)), _mul(n, 18));
  meter = [m0, _add(m0, _mul(d, 58)), _add(_add(m0, _mul(d, 58)), _mul(n, 34)), _add(m0, _mul(n, 34))];
  pt.shape(meter, [200, 236, 240], _mul(LINE, 0.4), undefined, false);
  mc = _add(_add(m0, _mul(d, 29)), _mul(n, 2));
  pt.line([mc, _add(_add(mc, _mul(d, 14)), _mul(n, 26))], _mul(LINE, 0.35), RED);
  pt.dot(..._add(_add(b0, _mul(d, 84)), _mul(n, 30)), 8, [60, 200, 250]);
  return co;
}

export function _flame(pt, fc, s) {
  let inner, outer, rt, up_;
  up_ = [0, -1.0];
  rt = [1.0, 0];
  outer = [_add(fc, _mul(_mul(rt, 50), s)), _add(_add(fc, _mul(_mul(rt, 40), s)), _mul(_mul(up_, 90), s)), _add(_add(fc, _mul(_mul(rt, 6), s)), _mul(_mul(up_, 190), s)), _add(_sub(fc, _mul(_mul(rt, 30), s)), _mul(_mul(up_, 110), s)), _add(_sub(fc, _mul(_mul(rt, 52), s)), _mul(_mul(up_, 40), s)), _add(fc, _mul(_mul(up_, -26), s))];
  pt.blob(outer, FLAME, _mul(LINE, 0.8), 6, false);
  inner = [_add(fc, _mul(_mul(rt, 24), s)), _add(_add(fc, _mul(_mul(rt, 16), s)), _mul(_mul(up_, 70), s)), _add(fc, _mul(_mul(up_, 120), s)), _add(_sub(fc, _mul(_mul(rt, 22), s)), _mul(_mul(up_, 50), s)), _add(fc, _mul(_mul(up_, -4), s))];
  pt.blob(inner, FLAME_IN, 0, 6, false);
}

export function shield(C, kind, side) {
  let D, W, a, c, c0, el, fill, her, poly, pt, sh_, sq, top, u, v, wr, x;
  [pt, D] = [C.pt, C.D];
  [sh_, el, wr] = _item(C.arms, side);
  [c0, a] = C.prop_frame(side);
  c = _add(el, _mul(_sub(wr, el), 0.62));
  top = [Math.cos(a), Math.sin(a)];
  u = [_neg(_item(top, 1)), _item(top, 0)];
  v = _neg(top);
  sq = (_truth(((C.fac === "r"))) ? 0.78 : 1.0);
  if (_truth(C.back)) {
    sq = 0.9;
  }
  function S(pts) {
    pts = pts;
    return _add(_add(c, _outer(_mul(pts.map(row => _item(row, 0)), sq), u)), _outer(pts.map(row => _item(row, 1)), v));
  }

  her = _or(get(D, "shield_her", undefined), () => _or(get(D, "heraldry", undefined), () => ({field: RED, device: "none"})));
  if (_truth(((kind === "shield_round")))) {
    poly = ellipse_pts(0, 0, 210, 210, undefined, 60);
    fill = _item(her, "field");
  }
  else if (_truth(((kind === "shield_kite")))) {
    poly = crom([[-150, -250], [-90, -296], [0, -306], [90, -296], [150, -250], [140, -40], [70, 180], [0, 330], [-70, 180], [-140, -40]], true, 6);
    fill = _item(her, "field");
  }
  else if (_truth(((kind === "shield_heater")))) {
    poly = _vstack([[[-160, -200], [160, -200]], crom([[160, -200], [158, 0], [100, 150], [0, 236]], false, 6), _slice(crom([[0, 236], [-100, 150], [-158, 0], [-160, -200]], false, 6), 1, null, null)]);
    fill = _item(her, "field");
  }
  else {
    poly = crom([[-150, -270], [150, -270], [156, 270], [-156, 270]], true, 2);
    poly = [[-150, -250], [-130, -272], [130, -272], [150, -250], [154, 250], [134, 272], [-134, 272], [-154, 250]];
    fill = get(her, "field", RED);
  }
  W = S(poly);
  if (_truth(C.back)) {
    pt.shape(W, WOOD, LINE);
    pt.line(S([[-80, -40], [80, -40]]), _mul(LINE, 1.6), LEATHER);
    return c;
  }
  pt.shape(W, fill, LINE);
  if (_truth(_and(((get(her, "device", "none") !== "none")), () => ((kind !== "scutum"))))) {
    try {
      device(pt, her, _item(S([[0, (_truth(((kind !== "shield_round"))) ? -20 : 0)]]), 0), _mul(120, (_truth(((kind === "shield_round"))) ? 0.9 : 1.0)), Math.atan2(_item(u, 1), _item(u, 0)), W);
    } catch (error) {
      if (error.name !== "cv2.error") throw error;
    }
  }
  if (_truth(((kind === "scutum")))) {
    pt.shape(S([[-130, -252], [130, -252], [134, 252], [-134, 252]]), fill, _mul(LINE, 0.0));
    pt.line(S([[-130, -248], [130, -248], [134, 248], [-134, 248], [-130, -248]]), _mul(LINE, 1.0), GOLD);
    device(pt, {device: "wings", color: get(her, "color", GOLD)}, c, 100, Math.atan2(_item(u, 1), _item(u, 0)));
    pt.ell(_item(c, 0), _item(c, 1), _mul(56, sq), 56, BRONZE, _mul(LINE, 0.9));
    pt.dot(_sub(_item(c, 0), 12), _sub(_item(c, 1), 12), 10, WHITE);
  }
  if (_truth(((kind === "shield_round")))) {
    if (_truth(((get(her, "device", "none") === "none")))) {
      for (x of [-70, 70]) {
        pt.line(S([[x, -196], [x, 196]]), _mul(LINE, 0.5));
      }
    }
    pt.line(_vstack([W, _slice(W, null, 1, null)]), _mul(LINE, 1.5), IRON);
    pt.shape(S(ellipse_pts(0, 0, 54, 54, undefined, 30)), STEEL, _mul(LINE, 0.9));
  }
  pt.line(_vstack([W, _slice(W, null, 2, null)]), _mul(LINE, 0.9));
  return c;
}

export function head_back(C, over = false) {
  let D, H, L, a, b, back, col, hc, hw, hy, i, poly, pt, rx, ry, sg, st, w, w0, w1, y;
  // parts behind the egg: long hair, hood, nemes, neck guards, hat wings. In the back view the nemes and neck
  // guards cover the back of the head, so they are drawn again over the egg (over=True, from head_front).
  [D, pt, H, rx, ry, hw, back] = [C.D, C.pt, C.H.bind(C), C.rx, C.ry, C.hw, C.back];
  hy = C.hy;
  if (_truth(_and(get(D, "feather", undefined), () => _and(!_truth(back), () => !_truth(over))))) {
    _feather(C);
  }
  if (_truth(_and(((get(D, "style", undefined) === "ponytail")), () => _and(!_truth(back), () => !_truth(over))))) {
    _ponytail(C);
  }
  if (_truth(_and(back, () => ((over !== (_contains(["nemes", "kabuto", "galea"], hw))))))) {
    return;
  }
  st = get(D, "style", "short");
  hc = get(D, "hair", BLACK);
  if (_truth(_and(((st === "long")), () => (!_contains(["greathelm", "nemes", "hood"], hw))))) {
    pt.blob(H([[_sub(_neg(rx), 18), -60], [_mul(_neg(rx), 0.6), _sub(_neg(ry), 10)], [_mul(rx, 0.6), _sub(_neg(ry), 10)], [_add(rx, 18), -60], [_add(rx, 30), _add(ry, 60)], [_add(rx, 6), _add(ry, 160)], [0, _add(ry, 140)], [_sub(_neg(rx), 6), _add(ry, 160)], [_sub(_neg(rx), 30), _add(ry, 60)]]), hc, undefined, 6);
  }
  if (_truth(((hw === "hood")))) {
    col = get(D, "hat", [70, 90, 110]);
    pt.blob(H([[_sub(_neg(rx), 50), _mul(ry, 0.5)], [_sub(_neg(rx), 54), _mul(_neg(ry), 0.4)], [_mul(_neg(rx), 0.5), _sub(_neg(ry), 60)], [_mul(rx, 0.5), _sub(_neg(ry), 60)], [_add(rx, 54), _mul(_neg(ry), 0.4)], [_add(rx, 50), _mul(ry, 0.5)], [_add(rx, 80), _add(ry, 90)], [0, _add(ry, 120)], [_sub(_neg(rx), 80), _add(ry, 90)]]), col, undefined, 6);
  }
  else if (_truth(((hw === "nemes")))) {
    [a, b] = [get(D, "hat", BLUE), get(D, "hat2", GOLD)];
    poly = [[_sub(_neg(rx), 10), _add(_mul(_neg(ry), 0.6), hy)], [_add(rx, 10), _add(_mul(_neg(ry), 0.6), hy)], [_add(rx, 70), _mul(ry, 0.3)], [_add(rx, 96), _add(ry, 110)], [_sub(_neg(rx), 96), _add(ry, 110)], [_sub(_neg(rx), 70), _mul(ry, 0.3)]];
    pt.shape(H(crom(poly, true, 4)), b, LINE);
    for (y of linspace(_mul(_neg(ry), 0.2), _add(ry, 90), 7)) {
      w = _add(_add(rx, 50), _mul(_add(y, _mul(ry, 0.2)), 0.2));
      pt.line(H([[_neg(w), y], [w, y]]), _mul(LINE, 1.6), a);
    }
  }
  else if (_truth(((hw === "kabuto")))) {
    col = get(D, "hat", BLACK);
    for ([i, [y, w0, w1]] of _enumerate([[-56, _add(rx, 10), _add(rx, 44)], [-12, _add(rx, 40), _add(rx, 76)], [32, _add(rx, 70), _add(rx, 106)]])) {
      pt.shape(H([[_neg(w0), _add(_sub(y, 44), hy)], [w0, _add(_sub(y, 44), hy)], [w1, _add(_add(y, 8), hy)], [_neg(w1), _add(_add(y, 8), hy)]]), col, LINE);
      _lace_ticks(pt, _item(H([[_sub(_neg(w0), 6), _add(_sub(y, 16), hy)]]), 0), _item(H([[_add(w0, 6), _add(_sub(y, 16), hy)]]), 0), _or(get(D, "trim", undefined), () => BLUE), 10);
    }
  }
  else if (_truth(((hw === "galea")))) {
    col = get(D, "hat", STEEL);
    if (_truth(back)) {
      pt.shape(H([[_sub(_neg(rx), 14), _add(-60, hy)], [_add(rx, 14), _add(-60, hy)], [_add(rx, 40), _add(10, hy)], [_sub(_neg(rx), 40), _add(10, hy)]]), col, LINE);
    }
    else if (_truth(C.k)) {
      pt.shape(H([[_add(_neg(rx), 10), _add(-70, hy)], [_sub(_neg(rx), 64), _add(-6, hy)], [_sub(_neg(rx), 40), _add(22, hy)], [_add(_neg(rx), 30), _add(-16, hy)]]), col, LINE);
    }
  }
  else if (_truth(_and(((hw === "wushamao")), () => !_truth(back)))) {
    col = get(D, "hat", BLACK);
    if (_truth(((get(D, "hat_wings", "long") === "long")))) {
      L = _mul(_add(rx, 290), (_truth(C.k) ? 0.7 : 1.0));
      for (sg of [-1, 1]) {
        pt.stroke(H([[_mul(sg, _sub(rx, 20)), _add(-96, hy)], [_mul(sg, L), _add(-100, hy)]]), col, 20, _mul(LINE, 0.7), undefined, false);
        pt.ell(..._item(H([[_mul(sg, L), _add(-100, hy)]]), 0), 24, 30, col, _mul(LINE, 0.7), C.ha);
      }
    }
    else {
      for (sg of [-1, 1]) {
        pt.blob(H([[_mul(sg, _sub(rx, 10)), _add(-104, hy)], [_mul(sg, _add(rx, 60)), _add(-150, hy)], [_mul(sg, _add(rx, 130)), _add(-140, hy)], [_mul(sg, _add(rx, 110)), _add(-96, hy)], [_mul(sg, _add(rx, 30)), _add(-86, hy)]]), col, _mul(LINE, 0.8), 4);
      }
    }
  }
  else if (_truth(((hw === "chinese_helm")))) {
    col = get(D, "hat", STEEL);
    pt.blob(H([[_sub(_neg(rx), 30), _add(-60, hy)], [_add(rx, 30), _add(-60, hy)], [_add(rx, 50), _add(70, hy)], [_sub(_neg(rx), 50), _add(70, hy)]]), get(D, "hat2", RED_DK), undefined, 3);
  }
}

export function head_front(C) {
  let D, hw, st;
  // new hair styles, then headwear (both over the egg).
  D = C.D;
  st = get(D, "style", "short");
  if (_truth(_and((!_contains(["messy", "beanie", "none"], st)), () => (!_contains(["greathelm"], C.hw))))) {
    hair2(C, st);
  }
  if (_truth(C.back)) {
    head_back(C, true);
    if (_truth(get(D, "feather", undefined))) {
      _feather(C);
    }
    if (_truth(((st === "ponytail")))) {
      _ponytail(C);
    }
  }
  else if (_truth(get(D, "age_lines", undefined))) {
    _age_lines(C);
  }
  hw = C.hw;
  if (_truth((!_contains(["none", "beanie_legacy"], hw)))) {
    headwear(C, hw);
  }
  if (_truth(_and(((st === "braids")), () => !_truth(C.back)))) {
    _braids(C);
  }
}

export function hair2(C, st) {
  let D, H, back, covered, dx, dy, hc, hw, k, low, pt, px, rx, ry, sg, sh, top;
  [D, pt, H, rx, ry, k, back, hw] = [C.D, C.pt, C.H.bind(C), C.rx, C.ry, C.k, C.back, C.hw];
  hc = get(D, "hair", BLACK);
  sh = _mul(20, k);
  covered = (_contains(["nemes", "hood", "turban", "kabuto", "galea", "viking", "nasal", "kettle", "chinese_helm", "wushamao", "tophat", "tricorn", "kasa", "slouch", "boonie", "cap"], hw));
  if (_truth(((st === "curly")))) {
    _curly(C, covered);
    return;
  }
  if (_truth(((st === "braids")))) {
    _braid_cap(C, covered);
    return;
  }
  if (_truth(((st === "ponytail")))) {
    st = "short";
  }
  if (_truth(back)) {
    if (_truth(((st === "curtains")))) {
      st = "short";
    }
    if (_truth(((st === "receding")))) {
      for (sg of [-1, 1]) {
        pt.blob(H([[_mul(sg, _sub(rx, 14)), -64], [_mul(sg, _add(rx, 18)), -84], [_mul(sg, _add(rx, 44)), -54], [_mul(sg, _add(rx, 30)), -30], [_mul(sg, _add(rx, 46)), -4], [_mul(sg, _add(rx, 20)), 34], [_mul(sg, _sub(rx, 14)), 24]]), hc, _mul(LINE, 0.9), 5);
      }
      pt.blob(H([[_sub(_neg(rx), 2), 30], [_mul(_neg(rx), 0.5), 58], [0, 66], [_mul(rx, 0.5), 58], [_add(rx, 2), 30], [_sub(rx, 12), 120], [0, _add(ry, 6)], [_add(_neg(rx), 12), 120]]), hc, _mul(LINE, 0.9), 5);
      return;
    }
    if (_truth((_contains(["short", "long", "bun", "topknot"], st)))) {
      low = (_truth(((st !== "long"))) ? _mul(ry, 0.72) : _add(ry, 120));
      pt.blob(H([[_sub(_neg(rx), 8), low], [_sub(_neg(rx), 14), -60], [_mul(_neg(rx), 0.7), _add(_neg(ry), 6)], [0, _sub(_neg(ry), 20)], [_mul(rx, 0.7), _add(_neg(ry), 6)], [_add(rx, 14), -60], [_add(rx, 8), low], [0, _add(low, 30)]]), hc, undefined, 6);
    }
    else if (_truth((_contains(["bald", "tonsure"], st)))) {
      pt.blob(H([[_sub(_neg(rx), 4), -20], [_add(rx, 4), -20], [_sub(rx, 4), 60], [0, 80], [_add(_neg(rx), 4), 60]]), hc, undefined, 6);
    }
    if (_truth(_and(((st === "bun")), () => !_truth(covered)))) {
      pt.ell(..._item(H([[0, _sub(_neg(ry), 30)]]), 0), 56, 50, hc, LINE, C.ha);
    }
    if (_truth(((st === "topknot")))) {
      pt.shape(H([[-22, _sub(_neg(ry), 50)], [22, _sub(_neg(ry), 50)], [22, _add(_neg(ry), 10)], [-22, _add(_neg(ry), 10)]]), hc, LINE);
    }
    return;
  }
  if (_truth(((st === "short")))) {
    if (_truth(covered)) {
      for (sg of [-1, 1]) {
        pt.blob(H([[_mul(sg, _sub(rx, 6)), -70], [_mul(sg, _add(rx, 12)), -66], [_mul(sg, _add(rx, 10)), 10], [_mul(sg, _sub(rx, 16)), 0]]), hc, _mul(LINE, 0.9), 4);
      }
      return;
    }
    pt.blob(H([[_sub(_neg(rx), 6), 10], [_sub(_neg(rx), 16), -60], [_mul(_neg(rx), 0.75), _add(_neg(ry), 4)], [0, _sub(_neg(ry), 26)], [_mul(rx, 0.75), _add(_neg(ry), 4)], [_add(rx, 16), -60], [_add(rx, 6), 10], [_sub(rx, 16), 4], [_sub(rx, 26), -54], [_add(_mul(rx, 0.4), sh), -82], [_add(sh, 10), -70], [_add(_mul(_neg(rx), 0.35), sh), -92], [_add(_neg(rx), 26), -54], [_add(_neg(rx), 16), 4]]), hc, undefined, 5);
  }
  else if (_truth(((st === "long")))) {
    if (_truth(!_truth(covered))) {
      pt.blob(H([[_sub(_neg(rx), 6), 10], [_sub(_neg(rx), 16), -60], [_mul(_neg(rx), 0.75), _add(_neg(ry), 4)], [0, _sub(_neg(ry), 24)], [_mul(rx, 0.75), _add(_neg(ry), 4)], [_add(rx, 16), -60], [_add(rx, 6), 10], [_sub(rx, 22), -40], [_add(sh, 20), -90], [sh, -60], [_mul(_neg(rx), 0.4), -86], [_add(_neg(rx), 22), -40]]), hc, undefined, 5);
    }
    if (_truth((!_contains(["hood", "nemes"], hw)))) {
      for (sg of [-1, 1]) {
        pt.blob(H([[_mul(sg, _sub(rx, 30)), -60], [_mul(sg, _add(rx, 18)), -40], [_mul(sg, _add(rx, 30)), _mul(ry, 0.6)], [_mul(sg, _add(rx, 10)), _add(ry, 60)], [_mul(sg, _sub(rx, 30)), _mul(ry, 0.7)], [_mul(sg, _sub(rx, 26)), 0]]), hc, LINE, 5);
      }
    }
  }
  else if (_truth((_contains(["bald", "tonsure", "topknot"], st)))) {
    if (_truth(((st === "tonsure")))) {
      pt.blob(H([[_sub(_neg(rx), 8), 0], [_sub(_neg(rx), 14), -80], [_mul(_neg(rx), 0.7), _add(_neg(ry), 30)], [0, _add(_neg(ry), 6)], [_mul(rx, 0.7), _add(_neg(ry), 30)], [_add(rx, 14), -80], [_add(rx, 8), 0], [_sub(rx, 16), -10], [_sub(rx, 30), -80], [0, _add(_neg(ry), 44)], [_add(_neg(rx), 30), -80], [_add(_neg(rx), 16), -10]]), hc, undefined, 5);
    }
    else {
      top = (_truth(((st === "topknot"))) ? -60 : -20);
      for (sg of [-1, 1]) {
        pt.blob(H([[_mul(sg, _sub(rx, 6)), top], [_mul(sg, _add(rx, 14)), _add(top, 6)], [_mul(sg, _add(rx, 12)), 40], [_mul(sg, _sub(rx, 12)), 30]]), hc, _mul(LINE, 0.9), 4);
      }
    }
    if (_truth(_and(((st === "topknot")), () => !_truth(covered)))) {
      pt.blob(H([[_add(-24, _mul(sh, 0.5)), _add(_neg(ry), 10)], [_add(24, _mul(sh, 0.5)), _add(_neg(ry), 10)], [_add(30, _mul(sh, 1.5)), _sub(_neg(ry), 40)], [_add(10, _mul(sh, 2)), _sub(_neg(ry), 80)], [_add(-18, sh), _sub(_neg(ry), 50)]]), hc, LINE, 4);
      pt.line(H([[_add(-22, _mul(sh, 0.5)), _sub(_neg(ry), 8)], [_add(28, sh), _sub(_neg(ry), 14)]]), _mul(LINE, 1.2), WHITE);
    }
  }
  else if (_truth(((st === "receding")))) {
    for (sg of [-1, 1]) {
      pt.blob(H([[_mul(sg, _sub(rx, 14)), -64], [_mul(sg, _add(rx, 18)), -84], [_mul(sg, _add(rx, 44)), -54], [_mul(sg, _add(rx, 30)), -30], [_mul(sg, _add(rx, 46)), -4], [_mul(sg, _add(rx, 20)), 34], [_mul(sg, _sub(rx, 14)), 24]]), hc, _mul(LINE, 0.9), 5);
    }
    if (_truth(!_truth(covered))) {
      for ([dx, dy] of [[-30, 0], [0, -10], [30, -4]]) {
        pt.stroke(H([[_add(_add(_mul(_neg(rx), 0.62), dx), sh), _add(_add(_neg(ry), 52), dy)], [_add(_mul(dx, 0.4), sh), _add(_add(_neg(ry), 6), dy)], [_add(_add(_mul(rx, 0.5), _mul(dx, 0.5)), sh), _add(_add(_neg(ry), 34), dy)]]), hc, 13, _mul(LINE, 0.5), true, false);
      }
    }
  }
  else if (_truth(((st === "curtains")))) {
    if (_truth(covered)) {
      for (sg of [-1, 1]) {
        pt.blob(H([[_mul(sg, _sub(rx, 6)), -70], [_mul(sg, _add(rx, 12)), -66], [_mul(sg, _add(rx, 10)), 10], [_mul(sg, _sub(rx, 16)), 0]]), hc, _mul(LINE, 0.9), 4);
      }
      return;
    }
    px = _add(sh, 8);
    pt.blob(H([[_sub(_neg(rx), 8), 14], [_sub(_neg(rx), 22), -56], [_mul(_neg(rx), 0.82), _add(_neg(ry), 4)], [_mul(_neg(rx), 0.3), _sub(_neg(ry), 34)], [_mul(rx, 0.3), _sub(_neg(ry), 38)], [_mul(rx, 0.82), _add(_neg(ry), 2)], [_add(rx, 22), -56], [_add(rx, 8), 14], [_sub(rx, 18), 6], [_sub(rx, 20), -34], [_add(_mul(rx, 0.55), sh), -46], [_add(px, 26), -84], [px, -120], [_sub(px, 26), -84], [_add(_mul(_neg(rx), 0.55), sh), -46], [_add(_neg(rx), 20), -34], [_add(_neg(rx), 18), 6]]), hc, undefined, 5);
    for (sg of [-1, 1]) {
      pt.line(H([[_add(px, _mul(sg, 6)), -116], [_add(px, _mul(sg, 50)), _add(_neg(ry), 4)], [_add(px, _mul(sg, 96)), _add(_neg(ry), 30)]]), _mul(LINE, 0.55), undefined, true);
    }
    pt.line(H([[px, -120], [_sub(px, 4), _sub(_neg(ry), 20)]]), _mul(LINE, 0.55));
  }
  else if (_truth(((st === "bun")))) {
    if (_truth(!_truth(covered))) {
      pt.blob(H([[_sub(_neg(rx), 6), 10], [_sub(_neg(rx), 16), -60], [_mul(_neg(rx), 0.75), _add(_neg(ry), 4)], [0, _sub(_neg(ry), 22)], [_mul(rx, 0.75), _add(_neg(ry), 4)], [_add(rx, 16), -60], [_add(rx, 6), 10], [_sub(rx, 22), -40], [_add(sh, 30), -96], [sh, -106], [_sub(sh, 30), -96], [_add(_neg(rx), 22), -40]]), hc, undefined, 5);
      pt.ell(..._item(H([[_mul(sh, 0.3), _sub(_neg(ry), 36)]]), 0), 58, 50, hc, LINE, C.ha);
      pt.stroke(H([[-80, _sub(_neg(ry), 50)], [90, _sub(_neg(ry), 24)]]), get(D, "hat2", GOLD), 12, _mul(LINE, 0.5), undefined, false);
    }
    else {
      for (sg of [-1, 1]) {
        pt.blob(H([[_mul(sg, _sub(rx, 6)), -70], [_mul(sg, _add(rx, 12)), -66], [_mul(sg, _add(rx, 10)), 10], [_mul(sg, _sub(rx, 16)), 0]]), hc, _mul(LINE, 0.9), 4);
      }
    }
  }
}

export function _curly(C, covered) {
  let D, H, back, hc, hd, k, knobs, low, pt, rx, ry, sg, sh, x, y;
  // short hair with curls (Custer, 1876): a cap of hair + curl knobs; under a hat the curls poke out at the
  // sides and the nape.
  [D, pt, H, rx, ry, k, back] = [C.D, C.pt, C.H.bind(C), C.rx, C.ry, C.k, C.back];
  hc = get(D, "hair", BLACK);
  hd = get(D, "hair_dk", dk(hc, 0.8));
  sh = _mul(20, k);
  if (_truth(back)) {
    low = _mul(ry, 0.42);
    if (_truth(covered)) {
      pt.blob(H([[_add(_neg(rx), 2), -40], [_sub(rx, 2), -40], [_sub(rx, 4), _sub(low, 10)], [0, _add(low, 10)], [_add(_neg(rx), 4), _sub(low, 10)]]), hc, undefined, 6);
    }
    else {
      pt.blob(H([[_sub(_neg(rx), 10), low], [_sub(_neg(rx), 16), -60], [_mul(_neg(rx), 0.7), _add(_neg(ry), 4)], [0, _sub(_neg(ry), 22)], [_mul(rx, 0.7), _add(_neg(ry), 4)], [_add(rx, 16), -60], [_add(rx, 10), low], [0, _add(low, 26)]]), hc, undefined, 6);
    }
    for ([x, y] of [[_add(_neg(rx), 14), _sub(low, 14)], [_mul(_neg(rx), 0.45), _add(low, 4)], [0, _add(low, 12)], [_mul(rx, 0.45), _add(low, 4)], [_sub(rx, 14), _sub(low, 14)]]) {
      pt.ell(..._item(H([[x, y]]), 0), 24, 21, hc, _mul(LINE, 0.75));
    }
    return;
  }
  knobs = [];
  for (sg of [-1, 1]) {
    if (_truth(_and(k, () => ((sg > 0))))) {
      knobs = knobs.concat([[_sub(rx, 2), -30]]);
    }
    else {
      knobs = knobs.concat([[_mul(sg, _add(rx, 6)), -42], [_mul(sg, _add(rx, 10)), -8]]);
    }
  }
  knobs = knobs.concat([[(_truth(!_truth(k)) ? _add(_neg(rx), 10) : _add(_neg(rx), 2)), 24]]);
  if (_truth(k)) {
    knobs = knobs.concat([[_sub(_neg(rx), 2), _sub(24, 30)]]);
  }
  if (_truth(!_truth(covered))) {
    pt.blob(H([[_sub(_neg(rx), 6), 10], [_sub(_neg(rx), 16), -60], [_mul(_neg(rx), 0.75), _add(_neg(ry), 4)], [0, _sub(_neg(ry), 28)], [_mul(rx, 0.75), _add(_neg(ry), 4)], [_add(rx, 16), -60], [_add(rx, 6), 10], [_sub(rx, 18), 0], [_sub(rx, 28), -60], [_add(sh, 40), -92], [sh, -76], [_add(_mul(_neg(rx), 0.4), sh), -96], [_add(_neg(rx), 26), -60], [_add(_neg(rx), 18), 0]]), hc, undefined, 5);
    knobs = knobs.concat([[_sub(sh, 50), _sub(_neg(ry), 6)], [_add(sh, 30), _sub(_neg(ry), 14)], [_add(sh, 90), _add(_neg(ry), 10)], [_sub(sh, 110), _add(_neg(ry), 30)]]);
    pt.line(H([[_sub(sh, 10), -92], [_add(sh, 14), -110], [_add(sh, 40), -96]]), _mul(LINE, 0.5), hd, true);
  }
  for ([x, y] of knobs) {
    pt.ell(..._item(H([[x, y]]), 0), 23, 21, hc, _mul(LINE, 0.75));
    pt.line(H([[_sub(x, 8), _add(y, 2)], [_add(x, 2), _sub(y, 6)], [_add(x, 10), _add(y, 2)]]), _mul(LINE, 0.3), hd, true);
  }
}

export function _braid_cap(C, covered) {
  let D, H, back, c_, cap, grey, hc, i, k, o, ox, pt, px, q, rx, ry, sg, sh;
  // hair parted in the middle and drawn back over the ears into two braids (Lakota / Cheyenne). `hair_grey` BGR
  // adds grey streaks (an elder). The braids themselves are drawn by _braids (over the chest).
  [D, pt, H, rx, ry, k, back] = [C.D, C.pt, C.H.bind(C), C.rx, C.ry, C.k, C.back];
  hc = get(D, "hair", BLACK);
  grey = get(D, "hair_grey", undefined);
  sh = _mul(20, k);
  if (_truth(back)) {
    pt.blob(H([[_sub(_neg(rx), 10), 40], [_sub(_neg(rx), 16), -60], [_mul(_neg(rx), 0.7), _add(_neg(ry), 4)], [0, _sub(_neg(ry), 20)], [_mul(rx, 0.7), _add(_neg(ry), 4)], [_add(rx, 16), -60], [_add(rx, 10), 40], [_sub(rx, 30), _mul(ry, 0.5)], [0, _mul(ry, 0.56)], [_add(_neg(rx), 30), _mul(ry, 0.5)]]), hc, undefined, 6);
    pt.line(H([[0, _sub(_neg(ry), 14)], [0, _mul(ry, 0.4)]]), _mul(LINE, 0.5), (_truth(((_sum(hc) > 200))) ? dk(hc, 0.6) : [90, 90, 96]));
    return;
  }
  if (_truth(covered)) {
    cap = [[_sub(_neg(rx), 8), 30], [_sub(_neg(rx), 12), -70], [_add(_neg(rx), 10), -80], [_add(_neg(rx), 16), 20]];
    for (sg of [-1, 1]) {
      pt.blob(H(cap.map(([x, y]) => [_mul(sg, x), y])), hc, _mul(LINE, 0.9), 4);
    }
    return;
  }
  px = _add(sh, 6);
  cap = [[_sub(_neg(rx), 8), 34], [_sub(_neg(rx), 16), -50], [_mul(_neg(rx), 0.76), _add(_neg(ry), 2)], [px, _sub(_neg(ry), 16)], [_mul(rx, 0.76), _add(_neg(ry), 2)], [_add(rx, 16), -50], [_add(rx, 8), 34], [_sub(rx, 16), 26], [_sub(rx, 22), -52], [_add(_mul(rx, 0.52), sh), _add(_neg(ry), 50)], [px, _add(_neg(ry), 58)], [_add(_mul(_neg(rx), 0.52), sh), _add(_neg(ry), 50)], [_add(_neg(rx), 22), -52], [_add(_neg(rx), 16), 26]];
  pt.blob(H(cap), hc, undefined, 5);
  pt.line(H([[px, _add(_neg(ry), 56)], [_sub(px, 2), _sub(_neg(ry), 10)]]), _mul(LINE, 0.55), (_truth(((_sum(hc) < 200))) ? [110, 110, 118] : dk(hc, 0.6)));
  for ([i, o] of _enumerate((_truth(!_truth(grey)) ? [0.3, 0.65] : [0.2, 0.45, 0.7]))) {
    for (sg of [-1, 1]) {
      ox = _mul(sh, (_truth(((sg > 0))) ? 1 : 0.5));
      q = [[_add(px, _mul(sg, 14)), _add(_add(_neg(ry), 4), _mul(46, o))], [_add(_mul(_mul(sg, rx), _sub(0.76, _mul(0.24, o))), _mul(ox, 0.5)), _add(_add(_neg(ry), 2), _mul(48, o))], [_mul(sg, _sub(_add(rx, 16), _mul(38, o))), -50], [_mul(sg, _sub(_add(rx, 8), _mul(24, o))), 20]];
      c_ = (_truth(_and(grey, () => ((i !== 1)))) ? grey : (_truth(((_sum(hc) < 200))) ? [110, 110, 118] : dk(hc, 0.6)));
      pt.line(H(q), _mul(LINE, (_truth(grey) ? 0.55 : 0.4)), c_, true);
    }
  }
}

export function _braids(C) {
  let D, H, L, Ls, a, b, drift, end, grey, hc, i, k, mid, path, pt, q, rx, ry, s, sg, tie, tip, top, wrap;
  // two braids hanging from behind the ears down in front of the shoulders (gravity: they hang straight down
  // whatever the head does). braid_len (units, default 250), braid_wrap = BGR fur / cloth wrapping (None = plaits
  // showing), braid_tie = BGR tie at the end.
  [D, pt, H, rx, ry, k] = [C.D, C.pt, C.H.bind(C), C.rx, C.ry, C.k];
  hc = get(D, "hair", BLACK);
  grey = get(D, "hair_grey", undefined);
  wrap = get(D, "braid_wrap", undefined);
  L = get(D, "braid_len", 340);
  for (sg of [-1, 1]) {
    if (_truth(k)) {
      top = (_truth(((sg < 0))) ? _item(H([[_add(_neg(rx), 14), 60]]), 0) : _item(H([[_sub(rx, 30), 70]]), 0));
      drift = (_truth(((sg < 0))) ? -6 : -4);
    }
    else {
      top = _item(H([[_mul(sg, _sub(rx, 14)), 60]]), 0);
      drift = _mul(_neg(sg), 8);
    }
    mid = _add(top, [_add(drift, _mul(sg, 8)), _mul(L, 0.4)]);
    end = _add(top, [_mul(drift, 2.5), L]);
    path = crom([top, mid, end], false, 8);
    pt.stroke(path, hc, 38, _mul(LINE, 0.8));
    Ls = [0, ...cumsum(_hypot(..._transpose(_diff(path))))];
    function at(s) {
      return [interp(s, Ls, path.map(row => _item(row, 0))), interp(s, Ls, path.map(row => _item(row, 1)))];
    }

    for ([i, s] of _enumerate(arange(18, _sub(_item(Ls, -1), 10), 22))) {
      q = at(s);
      pt.line([_add(q, [-15, -7]), _add(q, [0, 4]), _add(q, [15, -7])], _mul(LINE, 0.4), (_truth(_and(grey, () => ((mod(i, 3) === 1)))) ? grey : (_truth(((_sum(hc) > 200))) ? dk(hc, 0.55) : [96, 96, 104])));
    }
    tie = get(D, "braid_tie", RED);
    if (_truth(wrap)) {
      [a, b] = [at(_mul(_item(Ls, -1), 0.42)), at(_mul(_item(Ls, -1), 0.94))];
      pt.stroke([a, _add(_div(_add(a, b), 2), [_mul(sg, 2), 0]), b], wrap, 48, _mul(LINE, 0.8), true);
      for (s of linspace(_mul(_item(Ls, -1), 0.46), _mul(_item(Ls, -1), 0.9), 7)) {
        q = at(s);
        pt.line([_add(q, [-17, 4]), _add(q, [-6, -6])], _mul(LINE, 0.35), dk(wrap, 0.6));
        pt.line([_add(q, [6, 2]), _add(q, [17, -8])], _mul(LINE, 0.35), dk(wrap, 0.6));
      }
      for (s of [_mul(_item(Ls, -1), 0.42), _mul(_item(Ls, -1), 0.94)]) {
        q = at(s);
        pt.shape([_add(q, [-25, -6]), _add(q, [25, -6]), _add(q, [25, 6]), _add(q, [-25, 6])], tie, _mul(LINE, 0.5), undefined, false);
      }
    }
    else {
      q = at(_mul(_item(Ls, -1), 0.9));
      pt.shape([_add(q, [-21, -6]), _add(q, [21, -6]), _add(q, [21, 6]), _add(q, [-21, 6])], tie, _mul(LINE, 0.5), undefined, false);
    }
    tip = at(_item(Ls, -1));
    pt.blob([_add(tip, [-12, -6]), _add(tip, [12, -6]), _add(tip, [9, 30]), _add(tip, [0, 40]), _add(tip, [-9, 30])], hc, _mul(LINE, 0.7), 4);
  }
}

export function _feather(C) {
  let D, H, L, b, back, base, d, dkt, k, n, pt, rx, ry, t, tipx, vane;
  // one eagle feather standing up at the back of the head (white, dark tip, a small dyed tuft at the base).
  [D, pt, H, rx, ry, k, back] = [C.D, C.pt, C.H.bind(C), C.rx, C.ry, C.k, C.back];
  if (_truth(back)) {
    [base, tipx] = [[10, _add(_neg(ry), 70)], 30];
  }
  else if (_truth(k)) {
    [base, tipx] = [[_mul(_neg(rx), 0.62), _add(_neg(ry), 44)], _mul(_neg(rx), 0.9)];
  }
  else {
    [base, tipx] = [[_mul(_neg(rx), 0.32), _add(_neg(ry), 40)], _mul(_neg(rx), 0.5)];
  }
  L = get(D, "feather_len", 250);
  b = base;
  t = [tipx, _sub(_item(base, 1), L)];
  d = _n(_sub(t, b));
  n = _perp(d);
  vane = [_add(_add(b, _mul(d, 60)), _mul(n, 10)), _add(_add(b, _mul(d, 120)), _mul(n, 26)), _add(_sub(t, _mul(d, 30)), _mul(n, 24)), _add(t, _mul(d, 6)), _sub(_sub(t, _mul(d, 30)), _mul(n, 22)), _sub(_add(b, _mul(d, 120)), _mul(n, 24)), _sub(_add(b, _mul(d, 60)), _mul(n, 10))];
  pt.blob(H(vane), (_truth(Array.isArray(get(D, "feather", undefined))) ? get(D, "feather", WHITE) : WHITE), _mul(LINE, 0.8), 4);
  dkt = [_add(_sub(t, _mul(d, 96)), _mul(n, 25)), _add(_sub(t, _mul(d, 30)), _mul(n, 24)), _add(t, _mul(d, 6)), _sub(_sub(t, _mul(d, 30)), _mul(n, 22)), _sub(_sub(t, _mul(d, 96)), _mul(n, 23)), _sub(t, _mul(d, 84))];
  pt.blob(H(dkt), get(D, "feather_tip", [40, 44, 56]), _mul(LINE, 0.6), 3);
  pt.line(H([_add(b, _mul(d, 30)), _sub(t, _mul(d, 20))]), _mul(LINE, 0.4), [150, 150, 156]);
  pt.blob(H([_add(_add(b, _mul(d, 40)), _mul(n, 16)), _add(_add(b, _mul(d, 76)), _mul(n, 14)), _sub(_add(b, _mul(d, 70)), _mul(n, 14)), _sub(_add(b, _mul(d, 40)), _mul(n, 16))]), get(D, "feather_tuft", RED), _mul(LINE, 0.5), 3);
  pt.stroke(H([_sub(b, _mul(d, 6)), _add(b, _mul(d, 44))]), get(D, "feather_wrap", [60, 90, 130]), 16, _mul(LINE, 0.5), undefined, false);
}

export function _ponytail(C) {
  let D, H, a, back, hc, k, pt, pts, rx, ry;
  // ponytail tied at the back of the head (behind the egg in front / 3/4 views, over it in the back view).
  [D, pt, H, rx, ry, k, back] = [C.D, C.pt, C.H.bind(C), C.rx, C.ry, C.k, C.back];
  hc = get(D, "hair", BLACK);
  if (_truth(back)) {
    a = _item(H([[0, _mul(_neg(ry), 0.3)]]), 0);
    pt.blob([_add(a, [-34, -10]), _add(a, [34, -10]), _add(a, [40, 150]), _add(a, [6, 230]), _add(a, [-30, 160])], hc, undefined, 5);
    pt.ell(_item(a, 0), _item(a, 1), 30, 18, get(D, "hair_tie", RED), _mul(LINE, 0.6), C.ha);
    return;
  }
  if (_truth(k)) {
    a = _item(H([[_sub(_neg(rx), 4), _mul(_neg(ry), 0.25)]]), 0);
    pts = [_add(a, [10, -20]), _add(a, [-40, -6]), _add(a, [-76, 80]), _add(a, [-64, 190]), _add(a, [-40, 170]), _add(a, [-20, 70])];
  }
  else {
    a = _item(H([[_mul(_neg(rx), 0.5), _mul(_neg(ry), 0.5)]]), 0);
    pts = [_add(a, [10, -10]), _add(a, [-70, 10]), _add(a, [_sub(_mul(_neg(rx), 0.62), 20), 120]), _add(a, [_sub(_mul(_neg(rx), 0.62), 6), 230]), _add(a, [_add(_mul(_neg(rx), 0.62), 20), 170]), _add(a, [-40, 60])];
  }
  pt.blob(pts, hc, undefined, 5);
}

export function _age_lines(C) {
  let H, col, ex, f, mx, my, pt, sg;
  // a few lines for an older face: smile folds beside the mouth, crow's feet.
  [pt, H, f] = [C.pt, C.H.bind(C), C.fsx];
  [mx, my] = [_add(f, 4), 80];
  col = get(C.D, "age_col", [150, 150, 158]);
  for (sg of [-1, 1]) {
    if (_truth(_and(f, () => ((sg < 0))))) {
      pt.line(H([[_sub(mx, 46), _sub(my, 34)], [_sub(mx, 54), _sub(my, 8)], [_sub(mx, 46), _add(my, 14)]]), _mul(LINE, 0.45), col, true);
      continue;
    }
    pt.line(H([[_add(mx, _mul(sg, 50)), _sub(my, 38)], [_add(mx, _mul(sg, 60)), _sub(my, 8)], [_add(mx, _mul(sg, 52)), _add(my, 16)]]), _mul(LINE, 0.45), col, true);
    ex = _add(_add(f, _mul(sg, 46)), _mul(sg, 34));
    pt.line(H([[ex, 2], [_add(ex, _mul(sg, 16)), -4]]), _mul(LINE, 0.4), col);
    pt.line(H([[ex, 14], [_add(ex, _mul(sg, 16)), 18]]), _mul(LINE, 0.4), col);
  }
}

export function beard(C) {
  let D, H, L0, R0, b, col, f, ln, p, pt, pts, q, rx, ry, x;
  [D, pt, H, rx, ry, p] = [C.D, C.pt, C.H.bind(C), C.rx, C.ry, C.p];
  b = get(D, "beard", "none");
  if (_truth((_contains([null, "none"], b)))) {
    return;
  }
  col = get(D, "beard_col", get(D, "hair", BLACK));
  f = C.fsx;
  L0 = _add(_add(_neg(rx), 34), _mul(f, 1.3));
  R0 = _add(_sub(rx, 30), _mul(f, 0.25));
  if (_truth(((b === "stubble")))) {
    q = [[_add(L0, 6), 70], [_add(_mul(_neg(rx), 0.5), f), _sub(ry, 26)], [f, _sub(ry, 8)], [_add(_mul(rx, 0.5), f), _sub(ry, 26)], [_sub(R0, 6), 70], [_add(f, 56), 118], [f, 128], [_sub(f, 56), 118]];
    pt.shape(H(crom(q, true, 4)), col.map((v) => Math.trunc(_add(_mul(0.62, 238), _mul(0.38, v)))), 0, undefined, false);
    return;
  }
  ln = (_truth(((b === "short"))) ? 26 : 180);
  pts = [[L0, 30], [_add(L0, 4), 100], [_add(_mul(_neg(rx), 0.5), f), _add(ry, _mul(ln, 0.45))], [_add(f, 4), _add(ry, ln)], [_add(_mul(rx, 0.5), f), _add(ry, _mul(ln, 0.45))], [_sub(R0, 2), 100], [R0, 30], [_sub(R0, 22), 56], [_add(f, 66), 112], [_add(f, 6), 128], [_sub(f, 60), 112], [_add(L0, 22), 56]];
  pt.blob(H(pts), col, undefined, 6);
  if (_truth(((b === "long")))) {
    for (x of [-40, 0, 44]) {
      pt.line(H([[_add(f, x), _sub(ry, 10)], [_add(f, _mul(x, 0.6)), _add(ry, _mul(ln, 0.75))]]), _mul(LINE, 0.5), undefined, false);
    }
  }
}

export function moustache(C) {
  let D, H, col, hd, m, mx, my, p, pt, sg;
  [D, pt, H, p] = [C.D, C.pt, C.H.bind(C), C.p];
  m = get(D, "moustache", "none");
  if (_truth((_contains([null, "none"], m)))) {
    return;
  }
  col = get(D, "beard_col", get(D, "hair", BLACK));
  [mx, my] = [_add(C.fsx, 4), 56];
  if (_truth(((m === "walrus")))) {
    pt.blob(H([[_sub(mx, 70), _add(my, 34)], [_sub(mx, 50), _sub(my, 8)], [mx, _sub(my, 14)], [_add(mx, 50), _sub(my, 8)], [_add(mx, 70), _add(my, 34)], [_add(mx, 36), _add(my, 22)], [mx, _add(my, 18)], [_sub(mx, 36), _add(my, 22)]]), col, _mul(LINE, 0.9), 5);
  }
  else if (_truth(((m === "handlebar")))) {
    for (sg of [-1, 1]) {
      pt.stroke(H([[_add(mx, _mul(sg, 6)), _add(my, 4)], [_add(mx, _mul(sg, 44)), _add(my, 4)], [_add(mx, _mul(sg, 80)), _sub(my, 6)], [_add(mx, _mul(sg, 94)), _sub(my, 28)], [_add(mx, _mul(sg, 80)), _sub(my, 40)]]), col, 18, _mul(LINE, 0.7), true, false);
    }
  }
  else if (_truth(((m === "droop")))) {
    for (sg of [-1, 1]) {
      pt.blob(H([[_add(mx, _mul(sg, 2)), _sub(my, 12)], [_add(mx, _mul(sg, 40)), _sub(my, 12)], [_add(mx, _mul(sg, 78)), _add(my, 10)], [_add(mx, _mul(sg, 98)), _add(my, 58)], [_add(mx, _mul(sg, 86)), _add(my, 74)], [_add(mx, _mul(sg, 62)), _add(my, 42)], [_add(mx, _mul(sg, 30)), _add(my, 22)], [_add(mx, _mul(sg, 2)), _add(my, 16)]]), col, _mul(LINE, 0.85), 5);
    }
    hd = get(D, "hair_dk", dk(col, 0.8));
    for (sg of [-1, 1]) {
      pt.line(H([[_add(mx, _mul(sg, 20)), _add(my, 2)], [_add(mx, _mul(sg, 56)), _add(my, 18)], [_add(mx, _mul(sg, 80)), _add(my, 50)]]), _mul(LINE, 0.35), hd, true);
    }
  }
  else if (_truth(((m === "thin")))) {
    for (sg of [-1, 1]) {
      pt.stroke(H([[_add(mx, _mul(sg, 8)), _add(my, 6)], [_add(mx, _mul(sg, 40)), _add(my, 10)], [_add(mx, _mul(sg, 58)), _add(my, 40)], [_add(mx, _mul(sg, 62)), _add(my, 90)]]), col, 10, _mul(LINE, 0.6), true, false);
    }
  }
}

export function headwear(C, hw) {
  let D, H, a, a_, acc, apex, arc, b, back, base_y, bill, brim, bw, cc, col, crest, crown, cx0, dip, dome, ex, f, half, hgt, hy, i, inner, j, k, o, outer, ox, poly, pt, pts, q, rx, ry, sg, sh, trans, tri, u, x, y, y0;
  [D, pt, H, rx, ry, k, back, f] = [C.D, C.pt, C.H.bind(C), C.rx, C.ry, C.k, C.back, C.fsx];
  hy = C.hy;
  col = _or(get(D, "hat", undefined), () => STEEL);
  acc = _or(get(D, "hat2", undefined), () => GOLD);
  if (_truth(back)) {
    f = 0;
  }
  function Hy(pts) {
    return H(pts.map(([x, y]) => [x, _add(y, hy)]));
  }

  if (_truth(((hw === "beanie")))) {
    pt.blob(Hy([[_sub(_neg(rx), 14), -38], [_sub(_neg(rx), 4), -120], [-60, -178], [40, -182], [_add(rx, 2), -128], [_add(rx, 14), -38], [0, -28]]), col, undefined, 8);
    pt.shape(Hy([[_sub(_neg(rx), 18), -62], [_add(rx, 18), -62], [_add(rx, 18), -24], [_sub(_neg(rx), 18), -24]]), col, LINE);
    for (x of range(-110, 120, 30)) {
      pt.line(Hy([[x, -58], [x, -28]]), _mul(LINE, 0.5));
    }
  }
  else if (_truth((_contains(["nasal", "viking", "kettle", "chinese_helm"], hw)))) {
    sh = _mul(f, 0.4);
    if (_truth(((hw === "nasal")))) {
      dome = [[_sub(_neg(rx), 14), -50], [_sub(_neg(rx), 6), -120], [_add(_mul(_neg(rx), 0.6), sh), _sub(_neg(ry), 20)], [sh, _sub(_neg(ry), 76)], [_add(_mul(rx, 0.6), sh), _sub(_neg(ry), 20)], [_add(rx, 6), -120], [_add(rx, 14), -50]];
    }
    else {
      dome = [[_sub(_neg(rx), 14), -50], [_sub(_neg(rx), 6), -130], [_mul(_neg(rx), 0.62), _sub(_neg(ry), 24)], [sh, _sub(_neg(ry), 44)], [_mul(rx, 0.62), _sub(_neg(ry), 24)], [_add(rx, 6), -130], [_add(rx, 14), -50]];
    }
    pt.shape(Hy(crom(dome, false, 8)), col, LINE);
    if (_truth(!_truth(back))) {
      pt.line(Hy([[sh, (_truth(((hw === "nasal"))) ? _sub(_neg(ry), 60) : _sub(_neg(ry), 40))], [_mul(f, 0.8), -70]]), _mul(LINE, 0.5));
    }
    if (_truth(((hw === "kettle")))) {
      pt.blob(Hy([[_sub(_neg(rx), 90), -40], [_sub(_neg(rx), 50), -78], [_add(rx, 50), -78], [_add(rx, 90), -40], [_add(rx, 40), -30], [_sub(_neg(rx), 40), -30]]), col, LINE, 4);
    }
    else {
      pt.shape(Hy([[_sub(_neg(rx), 18), -84], [_add(rx, 18), -84], [_add(rx, 18), -44], [_sub(_neg(rx), 18), -44]]), dk(col, 0.88), LINE);
      for (x of linspace(_add(_neg(rx), 10), _sub(rx, 10), 6)) {
        pt.dot(..._item(Hy([[x, -64]]), 0), 7, IRON);
      }
    }
    if (_truth(((hw === "chinese_helm")))) {
      pt.stroke(Hy([[sh, _sub(_neg(ry), 40)], [sh, _sub(_neg(ry), 110)]]), acc, 14, _mul(LINE, 0.6), undefined, false);
      pt.blob(Hy([[sh, _sub(_neg(ry), 100)], [_add(sh, 40), _sub(_neg(ry), 60)], [_add(sh, 34), _sub(_neg(ry), 20)], [_sub(sh, 30), _sub(_neg(ry), 24)], [_sub(sh, 40), _sub(_neg(ry), 60)]]), get(D, "plume", RED), _mul(LINE, 0.8), 5);
    }
    if (_truth(_and(!_truth(back), () => ((hw === "nasal"))))) {
      pt.shape(Hy([[_sub(f, 15), -50], [_add(f, 15), -50], [_add(f, 13), 44], [f, 54], [_sub(f, 13), 44]]), col, _mul(LINE, 0.8));
    }
    if (_truth(_and(!_truth(back), () => ((hw === "viking"))))) {
      for (sg of [-1, 1]) {
        ex = _add(f, _mul(_mul(sg, 46), (_truth(_and(f, () => ((sg < 0)))) ? 0.82 : 1.0)));
        q = ellipse_pts(ex, _sub(10, hy), 36, 30, 0, 30);
        pt.stroke(Hy(_vstack([q, _slice(q, null, 2, null)])), col, 13, _mul(LINE, 0.6), undefined, false);
      }
      pt.shape(Hy([[_sub(f, 13), -46], [_add(f, 13), -46], [_add(f, 11), 46], [_sub(f, 11), 46]]), col, _mul(LINE, 0.8));
    }
  }
  else if (_truth(((hw === "greathelm")))) {
    poly = [[_sub(_neg(rx), 26), _sub(_neg(ry), 10)], [_mul(_neg(rx), 0.5), _sub(_neg(ry), 34)], [_mul(rx, 0.5), _sub(_neg(ry), 34)], [_add(rx, 26), _sub(_neg(ry), 10)], [_add(rx, 30), _mul(ry, 0.8)], [_add(rx, 10), _add(ry, 24)], [_sub(_neg(rx), 10), _add(ry, 24)], [_sub(_neg(rx), 30), _mul(ry, 0.8)]];
    pt.blob(Hy(poly), col, undefined, 6);
    if (_truth(!_truth(back))) {
      pt.shape(Hy([[_sub(f, _mul(rx, 0.86)), -4], [_add(f, _mul(rx, 0.82)), -4], [_add(f, _mul(rx, 0.82)), 22], [_sub(f, _mul(rx, 0.86)), 22]]), INK, 0);
      pt.shape(Hy([[_sub(f, 18), _sub(_neg(ry), 20)], [_add(f, 18), _sub(_neg(ry), 20)], [_add(f, 18), _add(ry, 20)], [_sub(f, 18), _add(ry, 20)]]), acc, _mul(LINE, 0.7));
      pt.shape(Hy([[_sub(f, _mul(rx, 0.86)), -26], [_add(f, _mul(rx, 0.84)), -26], [_add(f, _mul(rx, 0.84)), -6], [_sub(f, _mul(rx, 0.86)), -6]]), acc, _mul(LINE, 0.7));
      for (i of range(3)) {
        for (j of range(2)) {
          pt.dot(..._item(Hy([[_add(_add(f, 50), _mul(j, 30)), _add(70, _mul(i, 28))]]), 0), 7, INK);
        }
      }
    }
  }
  else if (_truth(((hw === "kabuto")))) {
    pt.shape(Hy(crom([[_sub(_neg(rx), 20), -40], [_sub(_neg(rx), 6), -120], [_mul(_neg(rx), 0.6), _sub(_neg(ry), 26)], [_mul(f, 0.3), _sub(_neg(ry), 50)], [_mul(rx, 0.6), _sub(_neg(ry), 26)], [_add(rx, 6), -120], [_add(rx, 20), -40]], false, 8)), col, LINE);
    for (x of [-0.6, -0.25, 0.1, 0.45]) {
      pt.line(Hy([[_mul(f, 0.3), _sub(_neg(ry), 46)], [_add(_mul(_mul(x, rx), 1.4), _mul(f, 0.3)), -50]]), _mul(LINE, 0.45));
    }
    pt.shape(Hy([[_sub(_neg(rx), 24), -76], [_add(rx, 24), -76], [_add(rx, 24), -40], [_sub(_neg(rx), 24), -40]]), col, LINE);
    if (_truth(!_truth(back))) {
      for (sg of [-1, 1]) {
        pt.blob(Hy([[_mul(sg, _sub(rx, 20)), -84], [_mul(sg, _add(rx, 50)), -110], [_mul(sg, _add(rx, 70)), -60], [_mul(sg, _add(rx, 20)), -30]]), col, LINE, 3);
        pt.line(Hy([[_mul(sg, _add(rx, 46)), -104], [_mul(sg, _add(rx, 64)), -62]]), _mul(LINE, 0.8), acc);
      }
      pt.blob(Hy([[_sub(f, 16), -80], [_sub(f, 80), -150], [_sub(f, 110), -250], [_sub(f, 70), -230], [f, -110], [_add(f, 70), -230], [_add(f, 110), -250], [_add(f, 80), -150], [_add(f, 16), -80]]), acc, _mul(LINE, 0.8), 3);
      pt.ell(..._item(Hy([[f, -78]]), 0), 22, 22, acc, _mul(LINE, 0.7));
    }
  }
  else if (_truth(((hw === "galea")))) {
    pt.shape(Hy(crom([[_sub(_neg(rx), 16), -44], [_sub(_neg(rx), 6), -120], [_mul(_neg(rx), 0.6), _sub(_neg(ry), 18)], [_mul(f, 0.3), _sub(_neg(ry), 34)], [_mul(rx, 0.6), _sub(_neg(ry), 18)], [_add(rx, 6), -120], [_add(rx, 16), -44]], false, 8)), col, LINE);
    pt.shape(Hy([[_sub(_neg(rx), 18), -78], [_add(rx, 18), -78], [_add(rx, 18), -50], [_sub(_neg(rx), 18), -50]]), dk(col, 0.86), _mul(LINE, 0.9));
    if (_truth(!_truth(back))) {
      for (sg of [-1, 1]) {
        ox = _add(_add(f, _mul(sg, 98)), (_truth(((f === 0))) ? _mul(sg, 6) : -12));
        pt.blob(Hy([[ox, -52], [_add(_mul(sg, _add(rx, 14)), _mul(f, 0.3)), -52], [_add(_mul(sg, _add(rx, 8)), _mul(f, 0.3)), 50], [_add(ox, _mul(sg, 6)), 96], [_sub(ox, _mul(sg, 8)), 40]]), col, LINE, 3);
        pt.dot(..._item(Hy([[_add(ox, _mul(sg, 26)), 20]]), 0), 8, BRONZE);
      }
    }
    crest = get(D, "crest", RED);
    if (_truth(crest)) {
      trans = ((get(D, "crest_dir", undefined) === "trans"));
      half = _mul((_truth(trans) ? 190 : _add(46, _mul(120, k))), (_truth(back) ? 0.9 : 1.0));
      hgt = (_truth(trans) ? 150 : 130);
      cx0 = _sub(_mul(f, 0.3), (_truth(!_truth(trans)) ? _mul(40, k) : 0));
      base_y = _sub(_neg(ry), 22);
      arc = ellipse_pts(cx0, base_y, half, hgt, 0, 24, Math.PI, _mul(2, Math.PI));
      pt.shape(Hy(_vstack([arc, [[_add(cx0, _mul(half, 0.7)), _add(base_y, 6)], [_sub(cx0, _mul(half, 0.7)), _add(base_y, 6)]]])), crest, LINE);
      for (u of linspace(-0.75, 0.75, (_truth(trans) ? 7 : 4))) {
        a_ = _add(_mul(Math.PI, 1.5), _mul(u, 1.2));
        pt.line(Hy([[_add(cx0, _mul(_mul(half, 0.25), Math.cos(a_))), _add(base_y, _mul(_mul(hgt, 0.25), Math.sin(a_)))], [_add(cx0, _mul(_mul(half, 0.85), Math.cos(a_))), _add(base_y, _mul(_mul(hgt, 0.85), Math.sin(a_)))]]), _mul(LINE, 0.45));
      }
      pt.shape(Hy([[_sub(cx0, 26), _sub(base_y, 18)], [_add(cx0, 26), _sub(base_y, 18)], [_add(cx0, 22), _add(base_y, 8)], [_sub(cx0, 22), _add(base_y, 8)]]), BRONZE, _mul(LINE, 0.6));
    }
  }
  else if (_truth(((hw === "crown")))) {
    y0 = _add(_neg(ry), 74);
    pts = [[_add(_neg(rx), 14), y0], [_sub(rx, 14), y0], [_sub(rx, 10), _sub(y0, 70)], [_sub(rx, 40), _sub(y0, 50)], [_mul(rx, 0.5), _sub(y0, 120)], [_mul(rx, 0.25), _sub(y0, 56)], [0, _sub(y0, 140)], [_mul(_neg(rx), 0.25), _sub(y0, 56)], [_mul(_neg(rx), 0.5), _sub(y0, 120)], [_add(_neg(rx), 40), _sub(y0, 50)], [_add(_neg(rx), 10), _sub(y0, 70)]];
    pt.shape(Hy(pts.map(([x, y]) => [_add(x, _mul(f, 0.4)), y])), acc, LINE);
    pt.shape(Hy([[_add(_add(_neg(rx), 12), _mul(f, 0.4)), _sub(y0, 34)], [_add(_sub(rx, 12), _mul(f, 0.4)), _sub(y0, 34)], [_add(_sub(rx, 14), _mul(f, 0.4)), y0], [_add(_add(_neg(rx), 14), _mul(f, 0.4)), y0]]), dk(acc, 0.85), _mul(LINE, 0.8));
    for ([x, cc] of [[-60, RED], [0, BLUE], [60, RED]]) {
      pt.ell(..._item(Hy([[_add(x, _mul(f, 0.4)), _sub(y0, 17)]]), 0), 13, 11, cc, _mul(LINE, 0.5));
    }
    for ([x, y] of [[_sub(rx, 10), _sub(y0, 70)], [_mul(rx, 0.5), _sub(y0, 120)], [0, _sub(y0, 140)], [_mul(_neg(rx), 0.5), _sub(y0, 120)], [_add(_neg(rx), 10), _sub(y0, 70)]]) {
      pt.ell(..._item(Hy([[_add(x, _mul(f, 0.4)), _sub(y, 8)]]), 0), 13, 13, acc, _mul(LINE, 0.6));
    }
  }
  else if (_truth(((hw === "slouch")))) {
    bw = get(D, "brim", 116);
    sh = _mul(f, 0.4);
    crown = [[_mul(_neg(rx), 0.74), -84], [_mul(_neg(rx), 0.76), _sub(_neg(ry), 46)], [_add(_mul(_neg(rx), 0.34), sh), _sub(_neg(ry), 84)], [sh, _sub(_neg(ry), 64)], [_add(_mul(rx, 0.34), sh), _sub(_neg(ry), 84)], [_mul(rx, 0.76), _sub(_neg(ry), 46)], [_mul(rx, 0.74), -84]];
    pt.blob(Hy(crown), col, undefined, 6);
    if (_truth(!_truth(back))) {
      pt.line(Hy([[sh, _sub(_neg(ry), 62)], [_add(sh, 4), _sub(_neg(ry), 20)]]), _mul(LINE, 0.5), undefined, true);
    }
    pt.shape(Hy([[_mul(_neg(rx), 0.75), -122], [_mul(rx, 0.75), -122], [_mul(rx, 0.74), -86], [_mul(_neg(rx), 0.74), -86]]), acc, _mul(LINE, 0.8));
    dip = (_truth(!_truth(back)) ? 22 : 10);
    brim = [[_sub(_neg(rx), bw), -54], [_sub(_neg(rx), _mul(bw, 0.55)), -92], [sh, -102], [_add(rx, _mul(bw, 0.55)), -92], [_add(rx, bw), -54], [_add(rx, _mul(bw, 0.5)), -60], [_mul(f, 0.6), _add(-72, dip)], [_sub(_neg(rx), _mul(bw, 0.5)), -60]];
    pt.blob(Hy(brim), col, undefined, 5);
    pt.line(Hy([[_sub(_neg(rx), _mul(bw, 0.7)), -64], [_mul(f, 0.6), _add(-82, _mul(dip, 0.6))], [_add(rx, _mul(bw, 0.7)), -64]]), _mul(LINE, 0.4), dk(col, 0.7), true);
  }
  else if (_truth(((hw === "boonie")))) {
    sh = _mul(f, 0.35);
    pt.blob(Hy([[_mul(_neg(rx), 0.86), -76], [_mul(_neg(rx), 0.84), _sub(_neg(ry), 34)], [sh, _sub(_neg(ry), 52)], [_mul(rx, 0.84), _sub(_neg(ry), 34)], [_mul(rx, 0.86), -76]]), col, undefined, 6);
    pt.shape(Hy([[_mul(_neg(rx), 0.87), -110], [_mul(rx, 0.87), -110], [_mul(rx, 0.86), -78], [_mul(_neg(rx), 0.86), -78]]), acc, _mul(LINE, 0.7));
    brim = [[_sub(_neg(rx), 72), -30], [_sub(_neg(rx), 40), -86], [sh, -94], [_add(rx, 40), -86], [_add(rx, 72), -30], [_add(rx, 36), -44], [_mul(f, 0.6), -58], [_sub(_neg(rx), 36), -44]];
    pt.blob(Hy(brim), col, undefined, 5);
    for (o of [12, 26]) {
      pt.line(Hy([[_add(_sub(_neg(rx), 64), o), _sub(-38, _mul(o, 0.3))], [_sub(_neg(rx), 30), _add(-70, _mul(o, 0.4))], [_mul(f, 0.6), _add(-80, _mul(o, 0.6))], [_add(rx, 30), _add(-70, _mul(o, 0.4))], [_sub(_add(rx, 64), o), _sub(-38, _mul(o, 0.3))]]), _mul(LINE, 0.3), dk(col, 0.7), true);
    }
    if (_truth(!_truth(back))) {
      for (sg of [-1, 1]) {
        pt.dot(..._item(Hy([[_add(_mul(_mul(sg, rx), 0.6), sh), _sub(_neg(ry), 6)]]), 0), 7, dk(col, 0.6));
      }
    }
  }
  else if (_truth(((hw === "cap")))) {
    sh = _mul(f, 0.4);
    crown = [[_sub(_neg(rx), 8), -62], [_add(_neg(rx), 2), -130], [_mul(_neg(rx), 0.6), _sub(_neg(ry), 24)], [sh, _sub(_neg(ry), 38)], [_mul(rx, 0.6), _sub(_neg(ry), 24)], [_sub(rx, 2), -130], [_add(rx, 8), -62], [sh, -72]];
    pt.blob(Hy(crown), col, undefined, 6);
    if (_truth(back)) {
      pt.shape(Hy([[-46, -66], [46, -66], [40, -40], [-40, -40]]), WHITE, _mul(LINE, 0.6), undefined, false);
      pt.line(Hy([[-46, -54], [46, -54]]), _mul(LINE, 0.5), col);
    }
    else {
      for (x of [-0.55, 0.0, 0.55]) {
        pt.line(Hy([[sh, _sub(_neg(ry), 34)], [_add(_mul(x, rx), _mul(sh, 1.6)), -70]]), _mul(LINE, 0.35), dk(col, 0.7), true);
      }
      if (_truth(get(D, "hat2", undefined))) {
        pt.shape(Hy([[_sub(sh, 36), -128], [_add(sh, 36), -128], [_add(sh, 34), -88], [_sub(sh, 34), -88]]), _item(D, "hat2"), _mul(LINE, 0.5), undefined, false);
      }
      if (_truth(k)) {
        bill = [[_add(_mul(rx, 0.1), f), -72], [_add(rx, 14), -84], [_add(rx, 126), -66], [_add(rx, 132), -48], [_add(rx, 40), -50], [_add(_mul(rx, 0.1), f), -56]];
      }
      else {
        bill = [[_mul(_neg(rx), 0.86), -70], [_mul(_neg(rx), 0.4), -86], [_mul(rx, 0.4), -86], [_mul(rx, 0.86), -70], [_mul(rx, 0.5), -46], [0, -40], [_mul(_neg(rx), 0.5), -46]];
      }
      pt.blob(Hy(bill), get(D, "bill", col), undefined, 5);
    }
    pt.dot(..._item(Hy([[sh, _sub(_neg(ry), 36)]]), 0), 12, dk(col, 0.7));
  }
  else if (_truth(((hw === "tophat")))) {
    pt.shape(Hy([[_add(_neg(rx), 26), -86], [_add(_neg(rx), 16), _sub(_neg(ry), 240)], [_sub(rx, 16), _sub(_neg(ry), 240)], [_sub(rx, 26), -86]]), col, LINE);
    pt.shape(Hy([[_add(_neg(rx), 25), -120], [_sub(rx, 25), -120], [_sub(rx, 26), -86], [_add(_neg(rx), 26), -86]]), acc, _mul(LINE, 0.8));
    pt.blob(Hy([[_sub(_neg(rx), 40), -66], [_sub(_neg(rx), 30), -96], [_add(rx, 30), -96], [_add(rx, 40), -66], [0, -58]]), col, LINE, 4);
  }
  else if (_truth(((hw === "tricorn")))) {
    pt.blob(Hy([[_mul(_neg(rx), 0.7), -110], [_mul(_neg(rx), 0.55), _sub(_neg(ry), 50)], [_mul(rx, 0.55), _sub(_neg(ry), 50)], [_mul(rx, 0.7), -110]]), col, undefined, 4);
    tri = [[_sub(_neg(rx), 80), -120], [_mul(_neg(rx), 0.6), _sub(_neg(ry), 44)], [_mul(f, 0.5), _add(_neg(ry), 4)], [_mul(rx, 0.6), _sub(_neg(ry), 44)], [_add(rx, 80), -120], [_add(_mul(rx, 0.4), _mul(f, 0.4)), -70], [_mul(f, 0.8), -44], [_add(_mul(_neg(rx), 0.4), _mul(f, 0.4)), -70]];
    pt.blob(Hy(tri), col, undefined, 4);
    pt.line(Hy([[_sub(_neg(rx), 74), -116], [_add(_mul(_neg(rx), 0.4), _mul(f, 0.4)), -74], [_mul(f, 0.8), -50], [_add(_mul(rx, 0.4), _mul(f, 0.4)), -74], [_add(rx, 74), -116]]), _mul(LINE, 0.9), acc, true);
  }
  else if (_truth(((hw === "kasa")))) {
    apex = [_mul(f, 0.3), _sub(_neg(ry), 120)];
    poly = [[_sub(_neg(rx), 180), -36], apex, [_add(rx, 180), -36], [_add(rx, 120), -14], [0, -6], [_sub(_neg(rx), 120), -14]];
    pt.blob(Hy(poly), col, undefined, 3);
    for (x of [_sub(_neg(rx), 110), _mul(_neg(rx), 0.6), 0, _mul(rx, 0.6), _add(rx, 110)]) {
      pt.line(Hy([apex, [x, -24]]), _mul(LINE, 0.4), dk(col, 0.6));
    }
    if (_truth(!_truth(back))) {
      for (sg of [-1, 1]) {
        pt.line(Hy([[_add(_mul(sg, _sub(rx, 30)), _mul(f, 0.5)), -20], [_add(_mul(sg, _sub(rx, 50)), _mul(f, 0.6)), 90], [f, _add(ry, 6)]]), _mul(LINE, 0.6), undefined, true);
      }
    }
  }
  else if (_truth(((hw === "turban")))) {
    poly = [[_sub(_neg(rx), 24), -40], [_sub(_neg(rx), 40), -130], [_mul(_neg(rx), 0.6), _sub(_neg(ry), 74)], [_mul(f, 0.2), _sub(_neg(ry), 96)], [_mul(rx, 0.6), _sub(_neg(ry), 74)], [_add(rx, 40), -130], [_add(rx, 24), -40], [_mul(f, 0.6), -60]];
    pt.blob(Hy(poly), col, undefined, 6);
    for ([i, y] of _enumerate([-80, -150, -220])) {
      pt.line(Hy([[_sub(_neg(rx), 20), _add(y, 20)], [_mul(f, 0.3), _sub(y, 30)], [_add(rx, 20), _sub(y, 4)]]), _mul(LINE, 0.5), undefined, true);
    }
    if (_truth(!_truth(back))) {
      pt.ell(..._item(Hy([[_mul(f, 0.7), -110]]), 0), 22, 26, acc, _mul(LINE, 0.7));
      pt.blob(Hy([[_mul(f, 0.7), -130], [_sub(_mul(f, 0.7), 30), -230], [_add(_mul(f, 0.7), 10), -280], [_add(_mul(f, 0.7), 24), -200]]), WHITE, _mul(LINE, 0.7), 4);
    }
  }
  else if (_truth(((hw === "hood")))) {
    if (_truth(back)) {
      pt.blob(Hy([[_sub(_neg(rx), 50), 40], [_sub(_neg(rx), 54), _mul(_neg(ry), 0.4)], [_mul(_neg(rx), 0.5), _sub(_neg(ry), 60)], [_mul(rx, 0.5), _sub(_neg(ry), 60)], [_add(rx, 54), _mul(_neg(ry), 0.4)], [_add(rx, 50), 40], [0, 70]]), col, undefined, 6);
      return;
    }
    outer = [[_sub(_neg(rx), 50), _mul(ry, 0.55)], [_sub(_neg(rx), 54), _mul(_neg(ry), 0.4)], [_mul(_neg(rx), 0.5), _sub(_neg(ry), 60)], [_mul(f, 0.3), _sub(_neg(ry), 66)], [_mul(rx, 0.5), _sub(_neg(ry), 60)], [_add(rx, 54), _mul(_neg(ry), 0.4)], [_add(rx, 50), _mul(ry, 0.55)]];
    inner = [[_add(_sub(rx, 10), _mul(f, 0.3)), _mul(ry, 0.45)], [_add(_sub(rx, 8), _mul(f, 0.2)), -70], [_add(_mul(rx, 0.5), _mul(f, 0.5)), _add(_neg(ry), 52)], [_mul(f, 0.5), _add(_neg(ry), 64)], [_add(_mul(_neg(rx), 0.5), _mul(f, 0.5)), _add(_neg(ry), 52)], [_add(_add(_neg(rx), 8), _mul(f, 0.6)), -70], [_add(_add(_neg(rx), 10), _mul(f, 0.6)), _mul(ry, 0.45)]];
    pt.shape(Hy(_vstack([crom(outer, false, 6), crom(inner, false, 6)])), col, LINE);
  }
  else if (_truth(((hw === "wushamao")))) {
    pt.blob(Hy([[_mul(_neg(rx), 0.62), -120], [_mul(_neg(rx), 0.6), _sub(_neg(ry), 60)], [0, _sub(_neg(ry), 84)], [_mul(rx, 0.6), _sub(_neg(ry), 60)], [_mul(rx, 0.62), -120]]), col, undefined, 6);
    pt.shape(Hy([[_sub(_neg(rx), 6), -40], [_add(_neg(rx), 4), -130], [_sub(rx, 4), -130], [_add(rx, 6), -40]]), col, LINE);
    pt.line(Hy([[_add(_neg(rx), 6), -122], [_sub(rx, 6), -122]]), _mul(LINE, 0.5), [90, 90, 90]);
  }
  else if (_truth(((hw === "nemes")))) {
    [a, b] = [(_truth(get(D, "hat", undefined)) ? col : BLUE), acc];
    pt.shape(Hy([[_sub(_neg(rx), 16), -112], [_mul(_neg(rx), 0.6), _sub(_neg(ry), 24)], [_mul(rx, 0.6), _sub(_neg(ry), 24)], [_add(rx, 16), -112], [_add(rx, 22), -60], [_sub(_neg(rx), 22), -60]]), b, LINE);
    for (y of [_add(_neg(ry), 4), _add(_neg(ry), 44)]) {
      pt.line(Hy([[_mul(_neg(rx), 0.8), y], [_mul(rx, 0.8), y]]), _mul(LINE, 1.6), a);
    }
    pt.shape(Hy([[_sub(_neg(rx), 24), -86], [_add(rx, 24), -86], [_add(rx, 24), -56], [_sub(_neg(rx), 24), -56]]), b, _mul(LINE, 0.9));
    if (_truth(!_truth(back))) {
      for (sg of [-1, 1]) {
        q = [[_add(_mul(sg, _sub(rx, 14)), _mul(f, 0.3)), -40], [_add(_mul(sg, _add(rx, 36)), _mul(f, 0.3)), -50], [_mul(sg, _add(rx, 46)), _add(ry, 40)], [_mul(sg, _add(rx, 30)), _add(ry, 200)], [_mul(sg, _sub(rx, 30)), _add(ry, 200)], [_mul(sg, _sub(rx, 24)), _mul(ry, 0.4)]];
        pt.shape(Hy(q), b, LINE);
        for (y of linspace(10, _add(ry, 170), 6)) {
          pt.line(Hy([[_mul(sg, _sub(rx, 22)), y], [_mul(sg, _add(rx, 38)), y]]), _mul(LINE, 1.5), a);
        }
      }
      pt.blob(Hy([[_sub(f, 14), -64], [_add(f, 14), -64], [_add(f, 18), -130], [f, -150], [_sub(f, 18), -130]]), GOLD, _mul(LINE, 0.7), 4);
    }
  }
}

export function design(base = null, kw = {}) {
  const d = {name: "person", jacket: [70,110,150], jacket_dk: [50,80,110], puffy: false, trousers: [70,70,80],
    boots: LEATHER, hair: [40,60,90], hair_dk: [30,44,66], harness: null, rope: [32,132,240], pack: LEATHER,
    leg_u: 135, leg_l: 130, torso: 270, head_rx: 152, head_ry: 176, hat: null, style: "short", garment: "tunic"};
  if (_truth(base)) Object.assign(d, base);
  Object.assign(d, kw);
  return d;
}

export const KNIGHT = design(null, {name: "knight", garment: "mail", jacket: [236, 238, 240], mail: STEEL, belt: LEATHER, trim: GOLD, heraldry: {field: [236, 238, 240], device: "cross", color: RED}, legwear: "mail", trousers: STEEL, footwear: "boots", boots: IRON, headwear: "nasal", hat: STEEL, style: "short", hair: [40, 70, 120], beard: "short", cape: RED_DK, leg_u: 140, leg_l: 135, torso: 285});
export const KNIGHT_PLATE = design(KNIGHT, {name: "knight_plate", garment: "plate", steel: STEEL, jacket: STEEL, legwear: "greaves", footwear: "sabatons", boots: STEEL, headwear: "greathelm", hat: STEEL, hat2: GOLD, cape: null, heraldry: {field: [150, 60, 30], device: "fleur", color: GOLD}, beard: "none"});
export const LONGBOWMAN = design(null, {name: "longbowman", garment: "tunic", jacket: [70, 120, 60], trim: null, belt: LEATHER, legwear: "hose", trousers: [50, 80, 110], footwear: "shoes", boots: WOOD_DK, headwear: "kettle", hat: STEEL_DK, style: "short", hair: [40, 80, 140], moustache: "none", beard: "stubble", quiver: LEATHER, heraldry: {field: RED, device: "cross", color: WHITE}});
export const LEGIONARY = design(null, {name: "legionary", garment: "segmentata", steel: STEEL, tunic: RED, scarf: RED, legwear: "bare", footwear: "sandals", boots: LEATHER, headwear: "galea", hat: STEEL, crest: null, style: "short", hair: [30, 40, 60], heraldry: {field: RED, device: "wings", color: GOLD}});
export const CENTURION = design(LEGIONARY, {name: "centurion", crest: RED, crest_dir: "trans", cape: RED_DK, steel: [190, 200, 205]});
export const SAMURAI = design(null, {name: "samurai", garment: "lamellar", jacket: [40, 40, 150], jacket_dk: [40, 36, 40], trim: [170, 110, 40], sleeve: [60, 50, 50], belt: [50, 40, 40], legwear: "wraps", trousers: [60, 50, 50], wrap: [110, 100, 100], footwear: "sandals", boots: [50, 70, 90], headwear: "kabuto", hat: [40, 36, 40], hat2: GOLD, style: "topknot", hair: BLACK, moustache: "thin", heraldry: {field: WHITE, device: "mon", color: BLACK}});
export const RONIN = design(SAMURAI, {name: "ronin", garment: "robe", jacket: [110, 80, 60], trim: [60, 50, 50], collar: "cross", legwear: "hakama", trousers: [70, 60, 60], headwear: "none", skirt: 0.4, flare: 60, belt: [60, 50, 50]});
export const OFFICIAL = design(null, {name: "official", garment: "robe", jacket: [50, 50, 170], trim: [40, 36, 40], collar: "round", belt: [60, 160, 120], belt_style: "leather", badge: [60, 170, 230], badge_in: [150, 90, 40], headwear: "wushamao", hat: [40, 36, 40], hat_wings: "long", style: "bun", hair: BLACK, moustache: "thin", beard: "long", footwear: "shoes", boots: BLACK, legwear: "trousers", trousers: [40, 36, 40]});
export const OFFICIAL_MING = design(OFFICIAL, {name: "official_ming", hat_wings: "short", jacket: [60, 110, 40], collar: "round"});
export const CHINESE_SOLDIER = design(null, {name: "chinese_soldier", garment: "lamellar", jacket: [50, 50, 170], jacket_dk: [40, 36, 40], trim: GOLD, sleeve: [40, 40, 130], sode: false, belt: [40, 36, 40], legwear: "wraps", trousers: [40, 36, 40], wrap: [200, 200, 200], footwear: "boots", boots: BLACK, headwear: "chinese_helm", hat: STEEL, hat2: [40, 36, 40], plume: RED, style: "short", hair: BLACK, heraldry: {field: [40, 40, 180], device: "roundel", color: GOLD}});
export const EGYPTIAN = design(null, {name: "egyptian", garment: "kilt", jacket: LINEN, trim: GOLD, belt: GOLD, legwear: "bare", footwear: "sandals", boots: [60, 120, 170], headwear: "nemes", hat: BLUE, hat2: GOLD, style: "none", torso: 260});
export const EGYPT_WORKER = design(EGYPTIAN, {name: "egypt_worker", headwear: "none", style: "short", hair: BLACK, trim: [60, 120, 170], belt: [60, 120, 170], footwear: "bare"});
export const VIKING = design(null, {name: "viking", garment: "tunic", jacket: [70, 100, 130], trim: [50, 60, 150], belt: LEATHER, legwear: "wraps", trousers: [100, 110, 120], wrap: LEATHER, footwear: "boots", boots: WOOD_DK, headwear: "viking", hat: STEEL, style: "long", hair: [60, 140, 200], beard: "long", moustache: "walrus", heraldry: {field: [40, 40, 170], device: "quarterly", color: [220, 225, 230]}, leg_u: 145, leg_l: 140, torso: 295, head_rx: 158});
export const INVENTOR = design(null, {name: "inventor", garment: "coat", jacket: [60, 50, 50], jacket_dk: [40, 34, 34], vest: [60, 90, 130], tie: BLACK, trim: GOLD, legwear: "trousers", trousers: [80, 76, 76], footwear: "shoes", boots: BLACK, headwear: "tophat", hat: [40, 36, 40], hat2: [60, 60, 150], style: "short", hair: [170, 170, 170], moustache: "walrus", beard: "none"});
export const INVENTOR_B = design(INVENTOR, {name: "inventor_b", headwear: "none", style: "bald", hair: [120, 130, 140], moustache: "handlebar", beard: "short", jacket: [90, 70, 50], vest: [40, 40, 120]});
export const PEASANT = design(null, {name: "peasant", garment: "tunic", jacket: [80, 120, 150], trim: null, belt: [70, 140, 170], belt_style: "rope", legwear: "hose", trousers: [60, 90, 110], footwear: "shoes", boots: WOOD_DK, headwear: "hood", hat: [60, 100, 90], style: "short", hair: [40, 80, 130], beard: "stubble"});
export const KING = design(null, {name: "king", garment: "robe", jacket: [130, 40, 80], trim: GOLD, collar: "round", hem_trim: true, belt: GOLD, belt_style: "leather", cape: [40, 30, 160], cape_trim: "ermine", headwear: "crown", hat2: GOLD, style: "short", hair: [40, 70, 120], beard: "short", moustache: "walrus", footwear: "shoes", boots: [40, 30, 140], legwear: "trousers", trousers: [130, 40, 80], torso: 280});
export const QUEEN = design(null, {name: "queen", garment: "robe", jacket: [140, 60, 40], trim: GOLD, collar: "v", hem_trim: true, belt: GOLD, belt_style: "leather", cape: [40, 30, 160], cape_trim: "ermine", headwear: "crown", hat2: GOLD, style: "long", hair: [40, 90, 160], lashes: true, footwear: "shoes", boots: [40, 30, 140], skirt: 1.04, flare: 90, head_rx: 146, head_ry: 170, torso: 255});
export const MONK = design(null, {name: "monk", garment: "robe", jacket: [60, 90, 120], trim: null, collar: "round", sleeves: "wide", belt: [150, 190, 210], belt_style: "rope", headwear: "none", style: "tonsure", hair: [60, 80, 110], footwear: "sandals", boots: LEATHER, legwear: "bare"});
export const MONK_HOOD = design(MONK, {name: "monk_hood", headwear: "hood", hat: [60, 90, 120]});
export const SOLDIER_1800 = design(null, {name: "soldier_1800", garment: "uniform", jacket: [40, 40, 170], jacket_dk: [120, 60, 30], trim: GOLD, strap: WHITE, belt: WHITE, legwear: "striped", trousers: [230, 230, 230], stripe: RED, footwear: "boots", boots: BLACK, headwear: "tricorn", hat: BLACK, hat2: WHITE, style: "short", hair: [170, 170, 170], moustache: "none"});
export const PRESETS = {knight: KNIGHT, knight_plate: KNIGHT_PLATE, longbowman: LONGBOWMAN, legionary: LEGIONARY, centurion: CENTURION, samurai: SAMURAI, ronin: RONIN, official: OFFICIAL, official_ming: OFFICIAL_MING, chinese_soldier: CHINESE_SOLDIER, egyptian: EGYPTIAN, egypt_worker: EGYPT_WORKER, viking: VIKING, inventor: INVENTOR, inventor_b: INVENTOR_B, peasant: PEASANT, king: KING, queen: QUEEN, monk: MONK, monk_hood: MONK_HOOD, soldier_1800: SOLDIER_1800};
export function _bugle(pt, R, D) {
  let bell, br, tube;
  // brass cavalry trumpet along the forearm frame: mouthpiece at the hand, one long loop, bell forward.
  br = get(D, "bugle", [64, 178, 226]);
  tube = R([[20, -10], [120, -34], [210, -30], [250, -10], [210, 14], [120, 18], [60, 8]]);
  pt.stroke(tube, br, 14, _mul(LINE, 0.6), true);
  bell = R([[230, -30], [290, -56], [300, -40], [300, 22], [290, 36], [230, 10]]);
  pt.shape(bell, br, _mul(LINE, 0.7));
  pt.stroke(R([[60, 20], [90, 70], [150, 80], [210, 60], [240, 20]]), [40, 186, 236], 6, _mul(LINE, 0.4), true, false);
}

export function _exam(C, c, side, kind) {
  let D, P_, h, k, o, pt, w, y;
  // an exam sheet held upright in front of the chest: header bar, three question lines, boxes; exam_f adds a red F.
  [pt, D] = [C.pt, C.D];
  o = _add(c, [-90.0, 10.0]);
  [w, h] = [160, 175];
  P_ = (x, y) => _add(o, [x, y]);
  pt.shape([P_(_neg(w), _neg(h)), P_(w, _add(_neg(h), 6)), P_(_sub(w, 4), h), P_(_add(_neg(w), 4), _sub(h, 4))], get(D, "exam", [240, 246, 248]), _mul(LINE, 0.8));
  pt.shape([P_(_add(_neg(w), 24), _add(_neg(h), 24)), P_(_sub(w, 30), _add(_neg(h), 26)), P_(_sub(w, 30), _add(_neg(h), 58)), P_(_add(_neg(w), 24), _add(_neg(h), 56))], [40, 40, 44], 0, undefined, false);
  for (k of range(3)) {
    y = _add(_add(_neg(h), 105), _mul(k, 78));
    pt.line([P_(_add(_neg(w), 30), y), P_(_sub(w, 96), y)], _mul(LINE, 0.35), [110, 110, 120]);
    pt.shape([P_(_sub(w, 78), _sub(y, 30)), P_(_sub(w, 30), _sub(y, 30)), P_(_sub(w, 30), _add(y, 14)), P_(_sub(w, 78), _add(y, 14))], [250, 252, 252], _mul(LINE, 0.35), undefined, false);
  }
  if (_truth(((kind === "exam_f")))) {
    pt.line([P_(110, -60), P_(30, -60), P_(30, 60)], _mul(LINE, 0.9), [52, 56, 214]);
    pt.line([P_(30, 0), P_(90, 0)], _mul(LINE, 0.9), [52, 56, 214]);
  }
  return o;
}

