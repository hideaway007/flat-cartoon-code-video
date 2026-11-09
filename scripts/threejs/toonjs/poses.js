// Faithful port of production/poses.py (sheet / __main__ omitted).
import { pose } from './toon.js';

export function P(base, kw) { return pose({...base, ...kw}); }
export function rest(kw = {}) { return P({}, kw); }
export function rest_side(kw = {}) { return P({facing: "r"}, kw); }
export function back(kw = {}) { return P({facing: "b"}, kw); }
export function explain(kw = {}) { return P({facing: "r", hL: [170, 110], handL: "open", mouth: "talk", brows: [4, 4]}, kw); }
export function two(kw = {}) { return P({facing: "r", hL: [230, -110], handL: "two", mouth: "grin", brows: [14, 12]}, kw); }
export function point(kw = {}) { return P({facing: "r", hL: [290, -10], handL: "point", mouth: "talk", brows: [-8, 2]}, kw); }
export function spread(kw = {}) {
  return P({
    facing: "r", hL: [-220, -40], hR: [230, -30], handL: "open", handR: "open",
    eyes: "wide", mouth: "shout", brows: [16, 16],
  }, kw);
}
export function wave(kw = {}) { return P({facing: "r", hL: [-110, -210], handL: "open", mouth: "grin", eyes: "closed"}, kw); }
export function think(kw = {}) {
  return P({
    facing: "r", hL: [150, -40], handL: "fist", look: [6, -6], mouth: "flat",
    brows: [10, 6],
  }, kw);
}
export function crossed(kw = {}) {
  return P({
    facing: "r", hL: [160, 110], hR: [-30, 120], handL: "fist", handR: "fist",
    eyes: "half", mouth: "flat",
  }, kw);
}
export function shrug(kw = {}) {
  return P({
    facing: "r", hL: [-60, 20], hR: [120, 30], handL: "open", handR: "open",
    eyes: "half", mouth: "flat", look: [-8, 0], lean: -3,
  }, kw);
}
export function cheer(kw = {}) {
  return P({
    hL: [-60, -260], hR: [60, -260], handL: "fist", handR: "fist", eyes: "closed",
    mouth: "grin", brows: [10, 12],
  }, kw);
}
export function shock(kw = {}) {
  return P({
    hL: [-140, -60], hR: [140, -60], handL: "open", handR: "open", eyes: "wide",
    mouth: "shout", brows: [22, 20], lean: -6,
  }, kw);
}
export function gulp(kw = {}) { return P({eyes: "wide", mouth: "gulp", sweat: 1.0, brows: [20, 10], hL: [-30, 240]}, kw); }
export function worried(kw = {}) { return P({eyes: "dot", mouth: "gulp", brows: [24, 6], hL: [60, 150], hR: [-60, 150]}, kw); }
export function coil_proud(kw = {}) {
  return P({
    prop: "coil_chest", hL: [22, 200], hR: [-22, 200], mouth: "grin", eyes: "closed",
    brows: [6, 6],
  }, kw);
}
export function coil_thrust(kw = {}) {
  return P({
    prop: "coil_chest", hL: [-20, 150], hR: [20, 150], lean: 5, mouth: "shout",
    eyes: "wide", brows: [16, 18], coil: [0, 40, 1.35],
  }, kw);
}
export function tie(kw = {}) { return P({facing: "r", lean: 14, hL: [230, 210], hR: [180, 235], look: [6, 8], mouth: "flat"}, kw); }
export function tug(kw = {}) {
  return P({
    facing: "r", lean: -16, hip: [-24, 14], feet: [-120, 80], hL: [240, 150], hR: [175, 165],
    handL: "fist", handR: "fist", eyes: "squint", mouth: "grit", brows: [-20, 0],
  }, kw);
}
export function look_up_back(kw = {}) { return P({facing: "b", head_dy: -34}, kw); }
export function shade_eyes_back(kw = {}) { return P({facing: "b", head_dy: -34, hL: [70, -150]}, kw); }
export function hold_sword(kw = {}) { return P({facing: "r", hL: [70, 230], heldL: "sword", rotL: -62, mouth: "flat"}, kw); }
export function raise_sword(kw = {}) {
  return P({
    facing: "r", hL: [-40, -272], handL: "fist", heldL: "sword", rotL: 82, eyes: "wide",
    mouth: "shout", brows: [-14, 6], hR: [120, 120],
  }, kw);
}
export function strike_sword(kw = {}) {
  return P({
    facing: "r", lean: 12, feet: [-110, 100], hL: [250, 40], heldL: "sword", rotL: 88,
    eyes: "squint", mouth: "grit", brows: [-20, 0], hR: [-60, 160],
  }, kw);
}
export function guard(kw = {}) {
  return P({
    facing: "r", feet: [-90, 80], hL: [150, 150], heldL: "sword", rotL: -40, hR: [170, 70],
    heldR: "shield_heater", mouth: "flat", brows: [-12, 0],
  }, kw);
}
export function shield_up(kw = {}) {
  return P({
    facing: "r", lean: -4, feet: [-100, 80], hR: [150, -70], heldR: "shield_heater",
    hL: [20, -250], heldL: "sword", rotL: 60, eyes: "wide", mouth: "grit",
    brows: [-16, 4],
  }, kw);
}
export function stand_spear(kw = {}) { return P({hR: [-30, 210], heldR: "spear", rotR: -90, fixR: 1, hL: [30, 200], mouth: "flat"}, kw); }
export function spear_shield(kw = {}) {
  return P({
    hR: [-30, 210], heldR: "spear", rotR: -90, fixR: 1, hL: [70, 150], heldL: "scutum",
    mouth: "flat",
  }, kw);
}
export function thrust_spear(kw = {}) {
  return P({
    facing: "r", lean: 14, feet: [-130, 110], hL: [210, 150], heldL: "spear", rotL: -14, fixL: 1,
    hR: [118, 121], eyes: "squint", mouth: "shout", brows: [-20, 0],
  }, kw);
}
export function march(kw = {}) {
  return P({
    facing: "r", feet: [-80, 70], lift: [0, 26], hL: [60, 225], hR: [-40, 225],
    head: 2, mouth: "flat",
  }, kw);
}
export function march_spear(kw = {}) {
  return P({
    facing: "r", feet: [-80, 70], lift: [0, 26], hL: [80, 40], heldL: "spear", rotL: -112, fixL: 1,
    hR: [-30, 225], mouth: "flat",
  }, kw);
}
export function draw_bow(kw = {}) {
  return P({
    facing: "r", feet: [-90, 80], hR: [285, -40], heldR: "bow", hL: [105, -150],
    heldL: "arrow", eyes: "squint", mouth: "flat", brows: [-14, 0], lean: -3,
  }, kw);
}
export function aim_crossbow(kw = {}) {
  return P({
    facing: "r", feet: [-80, 80], hL: [150, -120], heldL: "crossbow", rotL: 0, fixL: 1,
    hR: [110, -92], eyes: "squint", mouth: "flat", brows: [-12, 0],
  }, kw);
}
export function hammer_up(kw = {}) {
  return P({
    facing: "r", lean: -8, feet: [-90, 90], hL: [-40, -250], heldL: "hammer", rotL: 36,
    hR: [150, 120], eyes: "squint", mouth: "grit", brows: [-16, 0],
  }, kw);
}
export function hammer_down(kw = {}) {
  return P({
    facing: "r", lean: 16, feet: [-90, 90], hL: [240, 150], heldL: "hammer", rotL: 120,
    hR: [160, 170], eyes: "squint", mouth: "open", mopen: 0.4, brows: [-16, 0],
  }, kw);
}
export function read_scroll(kw = {}) {
  return P({
    hL: [-10, 105], hR: [10, 105], heldL: "scroll_open", heldR: "scroll_open",
    look: [0, 6], mouth: "talk", brows: [6, 6],
  }, kw);
}
export function read_book(kw = {}) {
  return P({
    facing: "r", hL: [165, 40], heldL: "book", look: [8, 10], mouth: "flat",
    brows: [6, 4],
  }, kw);
}
export function write_quill(kw = {}) {
  return P({
    facing: "r", lean: 8, hL: [190, 120], heldL: "quill", rotL: -125, fixL: 1, look: [8, 10],
    mouth: "flat", brows: [8, 4],
  }, kw);
}
export function hold_torch(kw = {}) { return P({facing: "r", hL: [230, 110], heldL: "torch", rotL: -62, fixL: 1, mouth: "flat"}, kw); }
export function torch_up(kw = {}) {
  return P({
    facing: "r", hL: [-30, -270], heldL: "torch", rotL: -96, fixL: 1, eyes: "wide", mouth: "shout",
    brows: [12, 10],
  }, kw);
}
export function hold_flag(kw = {}) {
  return P({
    facing: "r", hL: [175, 60], heldL: "flag", rotL: -68, fixL: 1, hR: [120, 200],
    mouth: "grin", eyes: "closed",
  }, kw);
}
export function hold_banner(kw = {}) { return P({hR: [-30, 200], heldR: "banner", rotR: -90, fixR: 1, hL: [30, 220], mouth: "flat"}, kw); }
export function hold_lantern(kw = {}) { return P({facing: "r", hL: [150, 60], heldL: "lantern", look: [4, 0], mouth: "flat"}, kw); }
export function use_wrench(kw = {}) {
  return P({
    facing: "r", lean: 10, hL: [220, 100], heldL: "wrench", rotL: 60, hR: [230, 140],
    look: [8, 8], mouth: "flat", brows: [-6, 0],
  }, kw);
}
export function hold_staff(kw = {}) { return P({facing: "r", hL: [200, 130], heldL: "staff", rotL: -72, fixL: 1, mouth: "smile"}, kw); }
export function bow_greeting(kw = {}) {
  return P({
    facing: "r", lean: 32, head: 6, hL: [40, 240], hR: [10, 240], eyes: "closed",
    mouth: "flat",
  }, kw);
}
export function gongshou(kw = {}) {
  return P({
    lean: 4, hL: [112, 80], hR: [-112, 80], handL: "fist", handR: "open", eyes: "closed",
    mouth: "smile",
  }, kw);
}
export function salute(kw = {}) { return P({hL: [72, -258], handL: "open", mouth: "flat", brows: [-6, 0]}, kw); }
export function kneel(kw = {}) {
  return P({
    facing: "r", hip: [-40, 132], feet: [-222, 147], hL: [150, 160], hR: [40, 200],
    head: 8, eyes: "closed", mouth: "flat",
  }, kw);
}
export function present(kw = {}) { return P({facing: "r", hL: [260, 10], handL: "open", mouth: "talk", brows: [6, 6]}, kw); }
export function pharaoh(kw = {}) {
  return P({
    hL: [150, 80], heldL: "crook", rotL: -58, fixL: 1, hR: [-60, 220], mouth: "flat",
    eyes: "half",
  }, kw);
}
export function cheer_sword(kw = {}) {
  return P({
    hL: [-40, -270], heldL: "sword", rotL: 90, hR: [60, -250], handR: "fist",
    eyes: "closed", mouth: "shout", brows: [12, 14],
  }, kw);
}
export function unimpressed(kw = {}) { return P({eyes: "half", mouth: "flat", brows: [-6, -4], look: [0, 2]}, kw); }
export function smug(kw = {}) { return P({eyes: "half", mouth: "smile", brows: [10, 10], head: -4}, kw); }
export function outraged(kw = {}) { return P({eyes: "wide", mouth: "shout", mopen: 1.0, brows: [-20, 4], crack: 1.0, head: 3}, kw); }

export const EX = {
  unimpressed: {eyes: "half", mouth: "flat", brows: [-6, -4], look: [0, 2]},
  smug: {eyes: "half", mouth: "smile", brows: [10, 10], head: -4},
  outraged: {eyes: "wide", mouth: "shout", mopen: 1.0, brows: [-20, 4], crack: 1.0, head: 3},
  side_eye: {eyes: "side", look: [8, 0], mouth: "flat", brows: [-8, -2]},
  eye_roll: {eyes: "roll", mouth: "flat", brows: [8, 12], head: -4},
  disbelief: {eyes: "mismatch", mouth: "twitch", brows: [0, 10]},
  panic: {eyes: "wide", mouth: "jawdrop", mopen: 1.0, sweat: 2.0, pale: 1.0, brows: [22, 16]},
  cry: {eyes: "teary", mouth: "frown", tears: 1.0, brows: [24, 6]},
  dazed: {eyes: "spiral", mouth: "gulp", brows: [10, 4], head: 6},
  starstruck: {eyes: "stars", mouth: "grin", blush: 1.0, brows: [12, 14]},
  furious: {eyes: "squeeze", mouth: "teeth", vein: 1.0, brows: [-22, 0]},
  cringe: {eyes: "squeeze", mouth: "teeth", sweat: 1.0, brows: [18, 2]},
  sulk: {eyes: "side", look: [-8, 0], mouth: "pout", blush: 0.5, brows: [12, -2]},
  dread: {eyes: "dot", mouth: "frown", pale: 1.0, sweat: 1.0, brows: [24, 8]},
};
export function side_eye(kw = {}) { return P(EX["side_eye"], kw); }
export function eye_roll(kw = {}) { return P(EX["eye_roll"], kw); }
export function disbelief(kw = {}) { return P(EX["disbelief"], kw); }
export function panic(kw = {}) { return P(EX["panic"], kw); }
export function cry(kw = {}) { return P(EX["cry"], kw); }
export function dazed(kw = {}) { return P(EX["dazed"], kw); }
export function starstruck(kw = {}) { return P(EX["starstruck"], kw); }
export function furious(kw = {}) { return P(EX["furious"], kw); }
export function cringe(kw = {}) { return P(EX["cringe"], kw); }
export function sulk(kw = {}) { return P(EX["sulk"], kw); }
export function dread(kw = {}) { return P(EX["dread"], kw); }

export const EXPRESSIONS = [side_eye, eye_roll, disbelief, panic, cry, dazed, starstruck, furious, cringe, sulk, dread];
export function hold_mug(kw = {}) { return P({facing: "r", hL: [130, 120], heldL: "mug", mouth: "flat", eyes: "half"}, kw); }
export function sip_mug(kw = {}) { return P({facing: "r", hL: [70, -10], heldL: "mug", head: -8, eyes: "closed", mouth: "flat"}, kw); }
export function push_specs(kw = {}) {
  return P({
    facing: "f", hR: [-150, -120], handR: "point", specs: 0.6, head_dy: 10, eyes: "dot",
    look: [-4, 0], brows: [-4, -4], mouth: "flat",
  }, kw);
}
export function stare(kw = {}) {
  return P({
    facing: "f", specs: 1.0, head_dy: 12, eyes: "dot", brows: [-8, -6], mouth: "flat",
    hL: [30, 240], hR: [-30, 240],
  }, kw);
}
export function stamp_up(kw = {}) {
  return P({
    facing: "r", lean: -6, hL: [230, -230], heldL: "stamp", eyes: "half", look: [8, -4],
    brows: [-8, 0], mouth: "flat",
  }, kw);
}
export function stamp_down(kw = {}) {
  return P({
    facing: "r", lean: 16, feet: [-90, 90], hL: [250, 170], heldL: "stamp", eyes: "half",
    brows: [-10, -2], mouth: "grit",
  }, kw);
}
export function mark_pen(kw = {}) {
  return P({
    facing: "r", lean: 10, hL: [250, 170], heldL: "red_pen", rotL: -130, fixL: 1,
    look: [8, 10], eyes: "half", mouth: "flat",
  }, kw);
}
export function slap_sticker(kw = {}) {
  return P({
    facing: "r", lean: 8, feet: [-80, 90], hL: [300, -60], handL: "point",
    heldL: "sticker", eyes: "closed", mouth: "grin", brows: [10, 10],
  }, kw);
}
export function lean_talk(kw = {}) {
  return P({
    facing: "r", lean: -4, hip: [10, 0], hL: [270, -40], handL: "open", hR: [-60, 120],
    mouth: "talk", brows: [12, 10],
  }, kw);
}
export function sweep_detector(kw = {}) {
  return P({
    facing: "r", lean: 8, head: 8, hL: [196, 172], heldL: "detector", sweep: -0.8,
    hR: [-20, 230], look: [8, 12], mouth: "flat", brows: [4, 2],
  }, kw);
}
export function sweep_detector_b(kw = {}) {
  return P({
    facing: "r", lean: 10, head: 10, hL: [236, 150], heldL: "detector", sweep: 0.8,
    hR: [-30, 226], look: [10, 12], mouth: "flat", brows: [4, 2],
  }, kw);
}
export function detector_front(kw = {}) {
  return P({
    facing: "f", lean: 4, head: 6, hL: [60, 200], heldL: "detector", sweep: -0.7,
    look: [0, 12], mouth: "flat",
  }, kw);
}
export function detector_front_b(kw = {}) {
  return P({
    facing: "f", lean: 4, head: -6, hL: [110, 196], heldL: "detector", sweep: 0.7,
    look: [0, 12], mouth: "flat",
  }, kw);
}
export function detector_beep(kw = {}) {
  return P({
    facing: "r", lean: 4, head: 4, hL: [160, 190], heldL: "detector", sweep: 0.0,
    hR: [180, 40], handR: "point", eyes: "wide", look: [8, 14], mouth: "open",
    mopen: 0.6, brows: [16, 14],
  }, kw);
}
export function hold_detector(kw = {}) { return P({facing: "r", hL: [70, 236], heldL: "detector", sweep: -1.25, mouth: "smile"}, kw); }
export function tell(kw = {}) {
  return P({
    facing: "r", hL: [170, 150], handL: "open", hR: [-20, 236], head: -3, eyes: "half",
    look: [4, 2], mouth: "talk", mopen: 0.3, brows: [2, 0],
  }, kw);
}
export function toast(kw = {}) {
  return P({
    facing: "r", hL: [250, -170], heldL: "beer", mouth: "grin", eyes: "closed",
    brows: [8, 6],
  }, kw);
}
export function hold_up_item(kw = {}) {
  return P({
    facing: "r", hL: [190, -40], handL: "fist", heldL: "cartridge", look: [10, -6],
    mouth: "open", mopen: 0.4, brows: [12, 8],
  }, kw);
}
export function kneel_find(kw = {}) {
  return P({
    facing: "r", hip: [-40, 132], feet: [-222, 147], hL: [200, -60], heldL: "cartridge",
    hR: [40, 200], look: [10, -8], mouth: "open", mopen: 0.5, eyes: "wide",
  }, kw);
}
export function push_drawer(kw = {}) {
  return P({
    facing: "r", lean: 14, feet: [-90, 80], hL: [280, 110], hR: [220, 130],
    handL: "open", handR: "open", mouth: "flat", eyes: "half", brows: [-6, -2],
  }, kw);
}
export function hold_exam(kw = {}) {
  return P({
    facing: "f", hL: [150, 190], hR: [-60, 210], heldL: "exam", mouth: "gulp",
    sweat: 0.8, brows: [20, 8],
  }, kw);
}
export function hang_picture(kw = {}) { return P({facing: "b", hL: [-120, -250], hR: [120, -250], handL: "open", handR: "open"}, kw); }
export function ride_note(kw = {}) { return P({facing: "r", hL: [150, -60], heldL: "note", mouth: "flat"}, kw); }

export const ALL = [
  rest, rest_side, back, explain, two, point, spread, wave, think, crossed, shrug, cheer, shock, gulp,
  worried, coil_proud, coil_thrust, tie, tug, look_up_back, shade_eyes_back,
  hold_sword, raise_sword, strike_sword, guard, shield_up, stand_spear, spear_shield, thrust_spear, march,
  march_spear, draw_bow, aim_crossbow, hammer_up, hammer_down, read_scroll, read_book, write_quill, hold_torch,
  torch_up, hold_flag, hold_banner, hold_lantern, use_wrench, hold_staff, bow_greeting, gongshou, salute, kneel,
  present, pharaoh, cheer_sword, unimpressed, smug, outraged,
  hold_mug, sip_mug, push_specs, stare, stamp_up, stamp_down, mark_pen, slap_sticker, lean_talk,
  sweep_detector, sweep_detector_b, detector_front, detector_front_b, detector_beep, hold_detector,
  tell, toast, hold_up_item, kneel_find, push_drawer, hold_exam, hang_picture,
].concat(EXPRESSIONS);

export const LEGACY = ALL.slice(0, 21);

export const SHOWCASE = {
  knight: [() => guard({heldR: "shield_kite"}), raise_sword, () => kneel({heldL: "sword", rotL: 90, fixL: 1, hL: [200, -20]})],
  knight_plate: [guard, strike_sword, cheer_sword],
  longbowman: [() => draw_bow({heldR: "longbow"}), () => rest_side({heldL: "longbow", rotL: -90, fixL: 1, hL: [80, 150]}), march],
  legionary: [
    spear_shield, () => guard({heldL: "gladius", heldR: "scutum", rotL: -30}),
    () => march_spear({heldR: "scutum", hR: [60, 160]}),
  ],
  centurion: [() => point({heldR: "scutum", hR: [130, 120]}), () => raise_sword({heldL: "gladius"}), salute],
  samurai: [
    () => raise_sword({heldL: "katana", hR: [30, -250], rotL: 70}), bow_greeting,
    () => hold_sword({heldL: "katana"}),
  ],
  ronin: [() => strike_sword({heldL: "katana"}), gongshou, rest_side],
  official: [read_scroll, gongshou, () => explain()],
  official_ming: [read_book, write_quill, bow_greeting],
  chinese_soldier: [() => thrust_spear(), aim_crossbow, () => stand_spear({heldL: "shield_round", hL: [60, 150]})],
  egyptian: [pharaoh, present, () => rest_side({heldL: "staff", rotL: -90, fixL: 1, hL: [90, 150]})],
  egypt_worker: [hammer_up, hammer_down, () => march()],
  viking: [() => hammer_up({heldL: "axe"}), () => guard({heldL: "axe", rotL: -20, heldR: "shield_round"}), cheer_sword],
  inventor: [use_wrench, hold_lantern, explain],
  inventor_b: [read_book, () => hammer_down({heldL: "mallet"}), think],
  peasant: [hold_torch, torch_up, () => hold_staff()],
  king: [() => hold_staff({heldL: "sword", rotL: 90, hL: [170, 40]}), present, hold_banner],
  queen: [rest, () => present(), read_scroll],
  monk: [read_book, hold_lantern, kneel],
  monk_hood: [write_quill, () => hold_staff(), bow_greeting],
  soldier_1800: [salute, hold_flag, march],
};
