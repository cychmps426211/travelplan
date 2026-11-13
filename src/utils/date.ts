import { Timestamp } from 'firebase/firestore';

// Legacy Timestamp values created before wall-clock strings were added were all encoded in Taiwan (UTC+8).
const LEGACY_TAIWAN_OFFSET_MINUTES = 8 * 60;
const MS_PER_MINUTE = 60 * 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type TimestampLike = Timestamp | Date | { seconds: number; nanoseconds?: number };

export interface WallClockParts {
    date: string; // YYYY-MM-DD
    time: string; // HH:mm
}

function pad2(n: number): string {
    return String(n).padStart(2, '0');
}

function timestampLikeToMillis(value: TimestampLike): number {
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'object' && value !== null) {
        if ('toDate' in value && typeof value.toDate === 'function') {
            return value.toDate().getTime();
        }
        if ('seconds' in value && typeof value.seconds === 'number') {
            return value.seconds * 1000 + Math.floor((value.nanoseconds ?? 0) / 1e6);
        }
    }
    return NaN;
}

function parseDateStrToUtcNoon(dateStr: string): Date {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
    if (!match) return new Date(NaN);
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
}

function formatUtcDateStr(date: Date): string {
    return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

/**
 * Parse a floating wall-clock datetime string ("YYYY-MM-DDTHH:mm") into date and time parts.
 */
export function parseWallClockDateTimeStr(value?: string): WallClockParts | null {
    if (!value) return null;
    const match = /^\s*(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(value);
    if (!match) return null;
    return { date: match[1], time: match[2] };
}

/**
 * Parse a floating wall-clock date string ("YYYY-MM-DD").
 */
export function parseWallClockDateStr(value?: string): string | null {
    if (!value) return null;
    const match = /^\s*(\d{4}-\d{2}-\d{2})/.exec(value);
    return match ? match[1] : null;
}

/**
 * Decode a legacy Firestore Timestamp (created in Taiwan UTC+8) into wall-clock parts
 * independent of the current device timezone.
 */
export function timestampToTaiwanWallClockParts(value: TimestampLike): WallClockParts | null {
    const ms = timestampLikeToMillis(value);
    if (Number.isNaN(ms)) return null;
    const shifted = new Date(ms + LEGACY_TAIWAN_OFFSET_MINUTES * MS_PER_MINUTE);
    return {
        date: formatUtcDateStr(shifted),
        time: `${pad2(shifted.getUTCHours())}:${pad2(shifted.getUTCMinutes())}`,
    };
}

/**
 * Resolve wall-clock date & time from an explicit floating string or fall back to a legacy UTC+8 Timestamp.
 */
export function resolveWallClockDateTime(
    dateTimeStr?: string,
    legacyTimestamp?: TimestampLike
): WallClockParts | null {
    const parsed = parseWallClockDateTimeStr(dateTimeStr);
    if (parsed) return parsed;
    return legacyTimestamp ? timestampToTaiwanWallClockParts(legacyTimestamp) : null;
}

/**
 * Resolve a wall-clock date ("YYYY-MM-DD") from an explicit floating string or fall back to a legacy UTC+8 Timestamp.
 */
export function resolveWallClockDate(dateStr?: string, legacyTimestamp?: TimestampLike): string {
    const parsed = parseWallClockDateStr(dateStr);
    if (parsed) return parsed;
    return legacyTimestamp ? (timestampToTaiwanWallClockParts(legacyTimestamp)?.date ?? '') : '';
}

/**
 * Build a backward-compatible Firestore Timestamp (encoded at UTC+8) from floating wall-clock date & time
 * so Firestore queries/older clients remain ordered consistently regardless of the writer's device timezone.
 */
export function wallClockToCompatTimestamp(dateStr: string, timeStr = '00:00'): Timestamp {
    const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
    const timeMatch = /^(\d{2}):(\d{2})/.exec(timeStr.trim());
    if (!dateMatch || !timeMatch) {
        return Timestamp.fromDate(parseLocalDate(dateStr));
    }
    const year = Number(dateMatch[1]);
    const month = Number(dateMatch[2]);
    const day = Number(dateMatch[3]);
    const hour = Number(timeMatch[1]);
    const minute = Number(timeMatch[2]);
    const utcMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0) - LEGACY_TAIWAN_OFFSET_MINUTES * MS_PER_MINUTE;
    return Timestamp.fromDate(new Date(utcMs));
}

export function getTripStartDateStr(trip: { startDateStr?: string; startDate?: TimestampLike }): string {
    return resolveWallClockDate(trip.startDateStr, trip.startDate);
}

export function getTripEndDateStr(trip: { endDateStr?: string; endDate?: TimestampLike }): string {
    return resolveWallClockDate(trip.endDateStr, trip.endDate);
}

export function getActivityStartParts(activity: {
    startTimeStr?: string;
    startTime?: TimestampLike;
}): WallClockParts | null {
    return resolveWallClockDateTime(activity.startTimeStr, activity.startTime);
}

export function getActivityEndParts(activity: {
    endTimeStr?: string;
    endTime?: TimestampLike;
}): WallClockParts | null {
    return resolveWallClockDateTime(activity.endTimeStr, activity.endTime);
}

export function getActivityStartKey(activity: {
    startTimeStr?: string;
    startTime?: TimestampLike;
}): string {
    const parts = getActivityStartParts(activity);
    return parts ? `${parts.date}T${parts.time}` : '';
}

export function getHotelCheckInParts(hotel: {
    checkInStr?: string;
    checkIn?: TimestampLike;
}): WallClockParts | null {
    return resolveWallClockDateTime(hotel.checkInStr, hotel.checkIn);
}

export function getHotelCheckOutParts(hotel: {
    checkOutStr?: string;
    checkOut?: TimestampLike;
}): WallClockParts | null {
    return resolveWallClockDateTime(hotel.checkOutStr, hotel.checkOut);
}

/**
 * Return today's calendar date in the user's current local timezone as "YYYY-MM-DD".
 */
export function getTodayDateStr(): string {
    const now = new Date();
    return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

/**
 * Compute calendar day difference (laterDateStr - earlierDateStr) without DST or timezone drift.
 */
export function diffCalendarDays(laterDateStr: string, earlierDateStr: string): number {
    const later = parseDateStrToUtcNoon(laterDateStr);
    const earlier = parseDateStrToUtcNoon(earlierDateStr);
    if (Number.isNaN(later.getTime()) || Number.isNaN(earlier.getTime())) return 0;
    return Math.round((later.getTime() - earlier.getTime()) / MS_PER_DAY);
}

/**
 * Add deltaDays to a "YYYY-MM-DD" date string using pure calendar arithmetic.
 */
export function addDaysToDateStr(dateStr: string, deltaDays: number): string {
    const utcDate = parseDateStrToUtcNoon(dateStr);
    if (Number.isNaN(utcDate.getTime())) return dateStr;
    utcDate.setUTCDate(utcDate.getUTCDate() + deltaDays);
    return formatUtcDateStr(utcDate);
}

/**
 * Generate inclusive "YYYY-MM-DD" strings between startDateStr and endDateStr using pure calendar math.
 */
export function eachDayStrOfInterval(startDateStr: string, endDateStr: string): string[] {
    const start = parseDateStrToUtcNoon(startDateStr);
    const end = parseDateStrToUtcNoon(endDateStr);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
        return [];
    }
    const days: string[] = [];
    const cur = new Date(start.getTime());
    while (cur <= end) {
        days.push(formatUtcDateStr(cur));
        cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return days;
}

/**
 * Format "YYYY-MM-DD" as "yyyy/MM/dd" or "MM/dd".
 */
export function formatDateStrSlash(dateStr: string, includeYear = true): string {
    const parsed = parseWallClockDateStr(dateStr);
    if (!parsed) return dateStr;
    return includeYear ? parsed.replace(/-/g, '/') : parsed.slice(5).replace(/-/g, '/');
}

/**
 * Format "YYYY-MM-DD" as zh-TW "MM/dd（週X）" locked to the calendar date regardless of device timezone.
 */
export function formatDateStrWithWeekday(dateStr: string): string {
    const utcDate = parseDateStrToUtcNoon(dateStr);
    if (Number.isNaN(utcDate.getTime())) return dateStr;
    return utcDate.toLocaleDateString('zh-TW', {
        month: '2-digit',
        day: '2-digit',
        weekday: 'short',
        timeZone: 'UTC',
    });
}

/**
 * Safely parse a YYYY-MM-DD string into a local-midnight Date object,
 * avoiding UTC midnight timezone-shift bugs.
 */
export function parseLocalDate(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    if (!year || !month || !day) {
        return new Date(dateStr);
    }
    return new Date(year, month - 1, day);
}

/**
 * Format duration in minutes into readable Traditional Chinese text.
 */
export function formatDuration(minutes: number): string {
    if (minutes >= 60) {
        const hrs = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hrs}小時 ${mins}分鐘` : `${hrs}小時`;
    }
    return `${minutes}分鐘`;
}

/**
 * Extract clean hostname from a URL for readable link labels.
 */
export function getHostnameLabel(url: string, fallbackIndex?: number): string {
    try {
        const parsed = new URL(url);
        return parsed.hostname.replace(/^www\./, '');
    } catch {
        return fallbackIndex !== undefined ? `參考網頁 ${fallbackIndex + 1}` : url;
    }
}

/**
 * Add minutes to an HH:mm time string, clamped cleanly to 23:59 on the same day.
 */
export function addMinutesToTimeStr(timeStr: string, deltaMinutes: number): string {
    const [h, m] = timeStr.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return timeStr;
    const total = Math.min(23 * 60 + 59, Math.max(0, h * 60 + m + deltaMinutes));
    const nextH = Math.floor(total / 60).toString().padStart(2, '0');
    const nextM = (total % 60).toString().padStart(2, '0');
    return `${nextH}:${nextM}`;
}

/**
 * Convert HH:mm string to minutes since midnight.
 */
export function timeStrToMinutes(timeStr: string): number {
    const [h, m] = timeStr.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return 0;
    return h * 60 + m;
}
