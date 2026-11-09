// Faithful port of production/cast.py. All colour arrays are BGR.
import { design } from './costumes.js';
import { get } from './np.js';

export const BUCKSKIN = [110, 162, 200];
export const BUCKSKIN_DK = [78, 122, 158];
export const NAVY = [92, 50, 38];
export const SKY = [204, 170, 128];
export const YELLOW = [40, 186, 236];
export const STRAWBLOND = [96, 170, 222];
export const KHAKI = [120, 170, 186];
export const DENIM = [150, 98, 58];
export const CUSTER = design(null, {
  name: "custer", garment: "buckskin", jacket: BUCKSKIN, jacket_dk: BUCKSKIN_DK, fringe: [100, 150, 190], shirt: NAVY,
  trim: [210, 214, 220], kerchief: [48, 44, 200], belt: [46, 66, 96], belt_style: "cartridge",
  legwear: "trousers", trousers: [92, 140, 178], footwear: "tall", boots: [40, 36, 40],
  headwear: "slouch", hat: [178, 206, 218], hat2: [70, 78, 92], brim: 124, hat_dy: -4,
  style: "curly", hair: STRAWBLOND, hair_dk: [60, 120, 180], moustache: "droop", beard: "none",
  leg_u: 152, leg_l: 148, torso: 290, head_rx: 146, head_ry: 182,
});
export const TROOPER = design(null, {
  name: "trooper", garment: "shirt", jacket: NAVY, jacket_dk: [70, 38, 30], trim: [200, 200, 206],
  belt: [60, 92, 120], belt_style: "cartridge", legwear: "striped", trousers: SKY, stripe: YELLOW,
  footwear: "boots", boots: [40, 36, 40], headwear: "slouch", hat: [56, 52, 54], hat2: [36, 32, 34], brim: 86,
  style: "short", hair: [40, 66, 100], moustache: "walrus", beard: "none",
  leg_u: 140, leg_l: 136, torso: 280, head_rx: 150, head_ry: 176,
});
export const TROOPER_B = design(TROOPER, {name: "trooper_b", moustache: "none", beard: "stubble", hair: [30, 40, 56], head_rx: 156});
export const TROOPER_C = design(TROOPER, {
  name: "trooper_c", moustache: "thin", beard: "short", hair: [60, 110, 160],
  hair_dk: [40, 80, 120], leg_u: 132, leg_l: 128,
});
export const ARCHAEOLOGIST = design(null, {
  name: "archaeologist", garment: "shirt", jacket: [214, 190, 160], jacket_dk: [180, 156, 128], sleeves: "rolled",
  vest: KHAKI, trim: [240, 240, 240], belt: [40, 62, 92], legwear: "jeans", trousers: DENIM, footwear: "boots",
  boots: [44, 82, 124], headwear: "boonie", hat: [110, 150, 150], hat2: [80, 110, 112],
  style: "short", hair: [46, 66, 96], beard: "short", moustache: "walrus", glasses: "round",
  leg_u: 140, leg_l: 136, torso: 286, head_rx: 154, head_ry: 178,
});
export const ARCHAEOLOGIST_B = design(null, {
  name: "archaeologist_b", garment: "shirt", jacket: KHAKI, jacket_dk: [94, 140, 156], sleeves: "rolled",
  trim: [70, 90, 100], belt: [40, 50, 60], legwear: "jeans", trousers: [120, 80, 50], footwear: "boots",
  boots: [40, 64, 96], headwear: "cap", hat: [50, 50, 178], hat2: [236, 236, 236], style: "short",
  hair: [40, 52, 70], moustache: "walrus", beard: "none",
  leg_u: 146, leg_l: 142, torso: 276, head_rx: 150, head_ry: 176,
});
export const INDIGO = [128, 84, 52];
export const STROUD_RED = [44, 40, 150];
export const STROUD_BLUE = [96, 50, 34];
export const SELVAGE = [222, 226, 228];
export const HIDE = [118, 160, 196];
export const BEAD_BLUE = [190, 130, 60];
export const BEAD_WHITE = [232, 234, 236];
export const LAKOTA_ELDER = design(null, {
  name: "lakota_elder", garment: "trade_shirt", jacket: INDIGO, jacket_dk: [100, 64, 40], trim: [70, 60, 60],
  print: [170, 140, 110], skirt: 0.24, belt_style: "none",
  blanket: STROUD_RED, blanket_mode: "waist", blanket_band: SELVAGE, blanket_band2: [50, 46, 48], blanket_len: 0.7,
  legwear: "leggings", trousers: STROUD_BLUE, legging_flap: [80, 42, 30], beads: BEAD_BLUE,
  footwear: "moccasins", moccasin: HIDE, boots: HIDE,
  style: "braids", hair: [64, 62, 66], hair_grey: [176, 176, 180], braid_wrap: [44, 62, 88], braid_tie: STROUD_RED,
  braid_len: 270, feather: true, age_lines: true, brow_w: 1.35,
  leg_u: 136, leg_l: 132, torso: 278, head_rx: 150, head_ry: 178,
});
export const CHEYENNE_WOMAN = design(null, {
  name: "cheyenne_woman", garment: "dress", jacket: STROUD_BLUE, jacket_dk: [70, 36, 24], selvage: SELVAGE,
  yoke: STROUD_BLUE, yoke_trim: [52, 52, 190], teeth: [228, 238, 242], belt: [40, 66, 100], brass: [70, 170, 214],
  blanket: [52, 58, 168], blanket_mode: "shawl", blanket_band: [60, 52, 50], shawl_low: -0.02,
  legwear: "leggings", trousers: STROUD_RED, legging_flap: [40, 36, 130], beads: BEAD_WHITE,
  footwear: "moccasins", moccasin: HIDE, boots: HIDE, moc_beads: BEAD_BLUE,
  style: "braids", hair: [40, 38, 44], braid_len: 240, braid_wrap: null, lashes: true,
  leg_u: 126, leg_l: 122, torso: 252, head_rx: 144, head_ry: 170,
});
export const LAKOTA_MAN = design(null, {
  name: "lakota_man", garment: "trade_shirt", jacket: [214, 228, 236], jacket_dk: [170, 190, 200], print: [70, 70, 170],
  trim: [60, 60, 150], skirt: 0.16, vest: [64, 86, 52], vest_trim: BEAD_BLUE, belt: [40, 66, 100], belt_style: "leather",
  breechcloth: STROUD_RED, selvage: SELVAGE, breech_len: 0.66,
  legwear: "leggings", trousers: STROUD_BLUE, legging_flap: [80, 42, 30], beads: BEAD_WHITE,
  footwear: "moccasins", moccasin: HIDE, boots: HIDE, moc_beads: BEAD_BLUE,
  style: "braids", hair: [36, 34, 40], braid_len: 260, braid_wrap: [40, 60, 90], braid_tie: STROUD_RED,
  choker: [232, 236, 238],
  leg_u: 142, leg_l: 138, torso: 284, head_rx: 148, head_ry: 176,
});
export const CAST = {
  custer: CUSTER, trooper: TROOPER, trooper_b: TROOPER_B, trooper_c: TROOPER_C, archaeologist: ARCHAEOLOGIST,
  archaeologist_b: ARCHAEOLOGIST_B, lakota_elder: LAKOTA_ELDER, cheyenne_woman: CHEYENNE_WOMAN,
  lakota_man: LAKOTA_MAN,
};
export const BARTENDER = design(null, {
  name: "bartender", garment: "shirt", jacket: [236, 238, 240], jacket_dk: [200, 204, 208], sleeves: "rolled",
  vest: [40, 50, 60], trim: [40, 40, 40], apron: [240, 242, 244], belt_style: "none",
  legwear: "trousers", trousers: [60, 60, 70], footwear: "shoes", boots: [30, 30, 34],
  style: "short", hair: [30, 30, 36], moustache: "handlebar", beard: "none",
  leg_u: 140, leg_l: 136, torso: 290, head_rx: 150, head_ry: 176,
});
export const PATRON = design(null, {
  name: "patron", garment: "shirt", jacket: [170, 140, 110], jacket_dk: [140, 112, 86], vest: [50, 80, 110],
  kerchief: [60, 60, 170], belt: [40, 60, 90], belt_style: "leather", legwear: "jeans", trousers: [130, 90, 60],
  footwear: "boots", boots: [40, 60, 90], headwear: "slouch", hat: [90, 130, 170], hat2: [50, 70, 100], brim: 96,
  style: "short", hair: [60, 90, 130], moustache: "walrus", beard: "stubble",
  leg_u: 146, leg_l: 142, torso: 280, head_rx: 150, head_ry: 176,
});
export const PATRON_B = design(null, {
  name: "patron_b", garment: "coat", jacket: [70, 60, 56], jacket_dk: [50, 44, 40], vest: [60, 100, 140],
  tie: [30, 30, 30], legwear: "trousers", trousers: [80, 76, 76], footwear: "shoes", boots: [30, 30, 34],
  headwear: "tophat", hat: [40, 36, 40], hat2: [60, 60, 60], style: "short", hair: [70, 80, 100],
  moustache: "thin", beard: "short", leg_u: 138, leg_l: 134, torso: 286, head_rx: 148, head_ry: 178,
});
export const CLERK = design(null, {
  name: "clerk", garment: "coat", jacket: [60, 52, 48], jacket_dk: [44, 38, 34], vest: [80, 70, 66], tie: [30, 30, 30],
  legwear: "trousers", trousers: [60, 56, 54], footwear: "shoes", boots: [30, 30, 34],
  style: "short", hair: [40, 46, 56], moustache: "thin", beard: "none", glasses: "round",
  leg_u: 136, leg_l: 132, torso: 282, head_rx: 146, head_ry: 176,
});
export const RANGER = design(null, {
  name: "ranger", garment: "shirt", jacket: [150, 170, 160], jacket_dk: [120, 140, 130], trim: [50, 80, 60],
  belt: [40, 60, 90], belt_style: "leather", legwear: "trousers", trousers: [60, 90, 60], footwear: "boots",
  boots: [40, 60, 90], headwear: "slouch", hat: [110, 150, 170], hat2: [40, 70, 100], brim: 110,
  style: "short", hair: [50, 70, 100], moustache: "none", beard: "none",
  leg_u: 144, leg_l: 140, torso: 282, head_rx: 150, head_ry: 176,
});
export const ARCHIVIST = design(null, {
  name: "archivist", garment: "blazer", tweed: false, jacket: [110, 120, 150], jacket_dk: [86, 96, 124],
  shirt: [230, 236, 240], tie: [110, 120, 150], legwear: "trousers", trousers: [90, 80, 70], footwear: "shoes",
  boots: [40, 50, 60], style: "ponytail", hair: [170, 172, 176], glasses: "round", lashes: true,
  leg_u: 130, leg_l: 126, torso: 262, head_rx: 146, head_ry: 172,
});
export const ARCHAEOLOGIST_C = design(ARCHAEOLOGIST_B, {
  name: "archaeologist_c", headwear: "none", style: "ponytail",
  hair: [40, 70, 120], moustache: "none", lashes: true, jacket: [160, 190, 210],
  leg_u: 132, leg_l: 128, torso: 262, head_rx: 146, head_ry: 172,
});
export const ARCHAEOLOGIST_D = design(ARCHAEOLOGIST, {
  name: "archaeologist_d", headwear: "slouch", hat: [150, 170, 180],
  hat2: [100, 120, 130], brim: 90, glasses: "none", beard: "short", hair: [180, 180, 184],
  beard_col: [190, 190, 194], vest: [90, 120, 150],
});
export const BUGLER = design(TROOPER, {
  name: "bugler", moustache: "none", beard: "none", hair: [60, 90, 130], head_rx: 146,
  leg_u: 132, leg_l: 128,
});

export function ghost(D, k = 0.55) {
  const out = {...D};
  for (const [key, v] of Object.entries(D)) {
    if (Array.isArray(v) && v.length === 3 && v.every(Number.isInteger)) {
      const g = v.reduce((a, b) => a + b, 0) / 3;
      out[key] = [Math.trunc(g * k + 150 * (1 - k) + 18), Math.trunc(g * k + 150 * (1 - k)), Math.trunc(g * k + 150 * (1 - k) - 6)];
    }
  }
  out.name = get(D, 'name', 'x') + '_ghost';
  return out;
}

export const CUSTER_GHOST = ghost(CUSTER);
export const TROOPER_GHOST = ghost(TROOPER);
Object.assign(CAST, {
  bartender: BARTENDER,
  patron: PATRON,
  patron_b: PATRON_B,
  clerk: CLERK,
  ranger: RANGER,
  archivist: ARCHIVIST,
  archaeologist_c: ARCHAEOLOGIST_C,
  archaeologist_d: ARCHAEOLOGIST_D,
  bugler: BUGLER,
  custer_ghost: CUSTER_GHOST,
  trooper_ghost: TROOPER_GHOST
});
