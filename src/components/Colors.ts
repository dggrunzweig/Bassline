export interface Palette {
  text_header: string, text_1: string, text_2: string, link: string,
      border_button_accent: string, border_button_standard: string,
      border_button_active: string, border_button_step: string,
      button_bg: string, dot_1_bg: string, dot_2_bg: string, dot_border: string,
      knob_border: string, knob_dot: string, gradient_1: string,
      gradient_2: string, gradient_3: string,
}


const ColorPaletteOpenSky = {
  text_header: ' text-slate-50 ',
  text_1: ' text-slate-50 ',
  text_2: ' text-slate-500 ',
  link: ' text-indigo-300 ',
  border_button_accent: ' border-slate-100/80 ',
  border_button_standard: ' border-slate-400/80 ',
  border_button_active: ' border-slate-50/60 ',
  border_button_step: ' border-orange-500 shadow-orange-300 ',
  button_bg: ' bg-slate-50/30 ',
  dot_1_bg: ' bg-indigo-400/50 ',
  dot_2_bg: ' bg-slate-100/70 ',
  dot_border: ' border-slate-50 ',
  knob_border: ' border-slate-50 ',
  knob_dot: ' bg-slate-50 ',
  gradient_1: ' from-indigo-50 ',
  gradient_2: ' via-indigo-300 ',
  gradient_3: ' to-blue-950 '
}

const ColorPaletteTillDawn = {
  text_header: ' text-red-600 ',
  text_1: ' text-stone-100 ',
  text_2: ' text-stone-200 ',
  link: ' text-red-400 ',
  border_button_accent: ' border-stone-100/80 ',
  border_button_standard: ' border-stone-400/80 ',
  border_button_active: ' border-stone-50/60 ',
  border_button_step: ' border-red-500 shadow-red-300 ',
  button_bg: ' bg-stone-400/30 ',
  dot_1_bg: ' bg-red-500/80 ',
  dot_2_bg: ' bg-stone-100/70 ',
  dot_border: ' border-stone-50 ',
  knob_border: ' border-stone-50 ',
  knob_dot: ' bg-red-500/90 ',
  gradient_1: ' from-slate-950 ',
  gradient_2: ' via-stone-800 ',
  gradient_3: ' to-stone-950 '
}

export const ColorPalette = (palette_index: number): Palette => {
  switch (palette_index) {
    case 0:
      return ColorPaletteOpenSky;
    case 1:
      return ColorPaletteTillDawn;
    default:
      return ColorPaletteOpenSky;
  }
}