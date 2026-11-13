import { Camera, Utensils, TrainFront, Bed, ShoppingBag, MapPin, Car, Footprints, Bike } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Activity } from '../types';

export type ActivityTypeKey = Activity['type'];

export interface ActivityTypeMeta {
    value: ActivityTypeKey;
    label: string;
    icon: LucideIcon;
    badgeClass: string;
    dotClass: string;
    activePillClass: string;
}

export const ACTIVITY_TYPES: ActivityTypeMeta[] = [
    {
        value: 'sightseeing',
        label: '觀光',
        icon: Camera,
        badgeClass: 'bg-sky-50 text-sky-700 border-sky-200/70 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20',
        dotClass: 'bg-sky-500 ring-sky-100 dark:ring-sky-950',
        activePillClass: 'bg-sky-500/10 text-sky-700 border-sky-500/40 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/40',
    },
    {
        value: 'food',
        label: '美食',
        icon: Utensils,
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/70 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
        dotClass: 'bg-amber-500 ring-amber-100 dark:ring-amber-950',
        activePillClass: 'bg-amber-500/10 text-amber-700 border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/40',
    },
    {
        value: 'transport',
        label: '交通',
        icon: TrainFront,
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
        dotClass: 'bg-emerald-500 ring-emerald-100 dark:ring-emerald-950',
        activePillClass: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/40',
    },
    {
        value: 'lodging',
        label: '住宿',
        icon: Bed,
        badgeClass: 'bg-violet-50 text-violet-700 border-violet-200/70 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20',
        dotClass: 'bg-violet-500 ring-violet-100 dark:ring-violet-950',
        activePillClass: 'bg-violet-500/10 text-violet-700 border-violet-500/40 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/40',
    },
    {
        value: 'shopping',
        label: '購物',
        icon: ShoppingBag,
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/70 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
        dotClass: 'bg-rose-500 ring-rose-100 dark:ring-rose-950',
        activePillClass: 'bg-rose-500/10 text-rose-700 border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/40',
    },
    {
        value: 'other',
        label: '其他',
        icon: MapPin,
        badgeClass: 'bg-zinc-100 text-zinc-700 border-zinc-200/80 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
        dotClass: 'bg-zinc-500 ring-zinc-200 dark:ring-zinc-800',
        activePillClass: 'bg-zinc-900/10 text-zinc-900 border-zinc-400 dark:bg-zinc-100/10 dark:text-zinc-100 dark:border-zinc-500',
    },
];

export const ACTIVITY_TYPE_MAP: Record<string, ActivityTypeMeta> = Object.fromEntries(
    ACTIVITY_TYPES.map((item) => [item.value, item])
);

export function getActivityMeta(type: string): ActivityTypeMeta {
    return ACTIVITY_TYPE_MAP[type] || ACTIVITY_TYPE_MAP.other;
}

export const TRAVEL_MODE_ICONS: Record<string, { label: string; icon: LucideIcon }> = {
    TRANSIT: { label: '大眾運輸', icon: TrainFront },
    DRIVING: { label: '開車', icon: Car },
    WALKING: { label: '步行', icon: Footprints },
    BICYCLING: { label: '自行車', icon: Bike },
};
