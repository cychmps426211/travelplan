// Predefined gradient colors for trip cards
export const GRADIENT_COLORS = {
    blue: {
        name: '藍色海洋',
        gradient: 'from-blue-400 to-cyan-600',
        preview: 'bg-gradient-to-br from-blue-400 to-cyan-600'
    },
    purple: {
        name: '紫色夢幻',
        gradient: 'from-purple-400 to-pink-600',
        preview: 'bg-gradient-to-br from-purple-400 to-pink-600'
    },
    sunset: {
        name: '日落',
        gradient: 'from-orange-400 to-red-600',
        preview: 'bg-gradient-to-br from-orange-400 to-red-600'
    },
    forest: {
        name: '森林',
        gradient: 'from-green-400 to-emerald-600',
        preview: 'bg-gradient-to-br from-green-400 to-emerald-600'
    },
    night: {
        name: '夜空',
        gradient: 'from-indigo-500 to-purple-700',
        preview: 'bg-gradient-to-br from-indigo-500 to-purple-700'
    },
    coral: {
        name: '珊瑚',
        gradient: 'from-pink-400 to-rose-600',
        preview: 'bg-gradient-to-br from-pink-400 to-rose-600'
    }
} as const;

export type GradientColorKey = keyof typeof GRADIENT_COLORS;

export const DEFAULT_GRADIENT: GradientColorKey = 'blue';
