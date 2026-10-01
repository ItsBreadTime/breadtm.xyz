/**
 * Discord timestamp styles. Upstream renders post bodies, writing each `<t:…>` as a
 * `<time data-format>` in UTC; the viewer re-renders it in the reader's locale and zone.
 */

export type TimestampStyle = 't' | 'T' | 'd' | 'D' | 'f' | 'F' | 'R';
export const isTimestampStyle = (value: unknown): value is TimestampStyle => typeof value === 'string' && /^[tTdDfFR]$/.test(value);

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [['year', 31_536e6], ['month', 2_592e6], ['day', 864e5], ['hour', 36e5], ['minute', 6e4], ['second', 1e3]];

export function formatTimestamp(date: Date, style: TimestampStyle, options: { locale?: string; timeZone?: string; now?: number } = {}): string {
	const { locale, timeZone } = options;
	const format = (parts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, { ...parts, timeZone }).format(date);
	switch (style) {
		case 't': return format({ hour: 'numeric', minute: '2-digit' });
		case 'T': return format({ hour: 'numeric', minute: '2-digit', second: '2-digit' });
		case 'd': return format({ year: 'numeric', month: '2-digit', day: '2-digit' });
		case 'D': return format({ year: 'numeric', month: 'long', day: 'numeric' });
		case 'F': return format({ weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
		case 'R': {
			const delta = date.getTime() - (options.now ?? Date.now());
			const [unit, ms] = UNITS.find(([, ms]) => Math.abs(delta) >= ms) ?? UNITS[UNITS.length - 1];
			return new Intl.RelativeTimeFormat(locale, { numeric: 'always' }).format(Math.round(delta / ms), unit);
		}
		default: return format({ year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
	}
}
