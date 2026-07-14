<script lang="ts">
    import { onMount } from 'svelte';

    const timeOptions: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Bangkok',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    };

    const dateOptions: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
    };

    const clockPartOptions: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Bangkok',
        hour: 'numeric',
        minute: 'numeric',
        hourCycle: 'h23'
    };

    const initialClock = getClockState();

    let time = $state(initialClock.time);
    let date = $state(initialClock.date);
    let clockEmoji = $state(initialClock.clockEmoji);

    function getClockState(now = new Date()) {
        const parts = new Intl.DateTimeFormat('en-GB', clockPartOptions).formatToParts(now);
        const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
        const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0);

        return {
            time: now.toLocaleTimeString('en-GB', timeOptions),
            date: now.toLocaleDateString('en-GB', dateOptions),
            clockEmoji: getClockEmoji(hour, minute)
        };
    }

    function updateTimeAndDate() {
        const nextClock = getClockState();
        time = nextClock.time;
        date = nextClock.date;
        clockEmoji = nextClock.clockEmoji;
    }

    function getClockEmoji(hour: number, minute: number) {
        const clockEmojis = [
            "🕛", "🕧", "🕐", "🕜", "🕑", "🕝", "🕒", "🕞", "🕓", "🕟", "🕔", "🕠", 
            "🕕", "🕡", "🕖", "🕢", "🕗", "🕣", "🕘", "🕤", "🕙", "🕥", "🕚", "🕦"
        ];
        const index = hour % 12 * 2 + (minute >= 30 ? 1 : 0);
        return clockEmojis[index];
    }

    onMount(() => {
        updateTimeAndDate();
        const interval = setInterval(updateTimeAndDate, 1000);
        return () => clearInterval(interval);
    });
</script>

<div class="p-2 md:p-4 mb-2 rounded-md text-md md:text-xl bg-violet-600 text-violet-200">
    <span>{clockEmoji} It's currently {time} - {date} for me.</span>
    <noscript>
        <span class="block mt-1 text-sm md:text-base text-violet-100">
            Time shown when this page loaded. Refresh to update it.
        </span>
    </noscript>
</div>
