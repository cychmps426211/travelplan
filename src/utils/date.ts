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
