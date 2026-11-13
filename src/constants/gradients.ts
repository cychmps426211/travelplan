// Refined editorial gradient presets for trip cards
export const GRADIENT_COLORS = {
    blue: {
        name: '海霧藍',
        gradient: 'from-slate-700 via-sky-800 to-cyan-900',
        preview: 'bg-gradient-to-br from-slate-700 via-sky-800 to-cyan-900'
    },
    purple: {
        name: '暮光紫',
        gradient: 'from-slate-800 via-violet-900 to-fuchsia-950',
        preview: 'bg-gradient-to-br from-slate-800 via-violet-900 to-fuchsia-950'
    },
    sunset: {
        name: '暖砂橘',
        gradient: 'from-stone-700 via-amber-800 to-orange-950',
        preview: 'bg-gradient-to-br from-stone-700 via-amber-800 to-orange-950'
    },
    forest: {
        name: '深林苔',
        gradient: 'from-zinc-800 via-emerald-900 to-teal-950',
        preview: 'bg-gradient-to-br from-zinc-800 via-emerald-900 to-teal-950'
    },
    night: {
        name: '午夜靛',
        gradient: 'from-zinc-900 via-indigo-950 to-slate-900',
        preview: 'bg-gradient-to-br from-zinc-900 via-indigo-950 to-slate-900'
    },
    coral: {
        name: '枯木玫',
        gradient: 'from-stone-800 via-rose-900 to-pink-950',
        preview: 'bg-gradient-to-br from-stone-800 via-rose-900 to-pink-950'
    }
} as const;

export type GradientColorKey = keyof typeof GRADIENT_COLORS;

export const DEFAULT_GRADIENT: GradientColorKey = 'blue';
