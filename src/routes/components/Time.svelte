<script lang="ts">
    import { onMount } from 'svelte';

    let time: string;
    let date: string;
    let clockEmoji: string = "🕐"; // Default clock emoji

    function updateTimeAndDate() {
        const now = new Date();
        const timeOptions: Intl.DateTimeFormatOptions = {
            timeZone: 'Asia/Bangkok', // UTC+7
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        };
        const dateOptions: Intl.DateTimeFormatOptions = {
            timeZone: 'Asia/Bangkok', // UTC+7
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
        };
        time = now.toLocaleTimeString('en-GB', timeOptions);
        date = now.toLocaleDateString('en-GB', dateOptions);
        updateClockEmoji(now.getHours(), now.getMinutes());
    }

    function updateClockEmoji(hour: number, minute: number) {
        const clockEmojis = [
            "🕛", "🕧", "🕐", "🕜", "🕑", "🕝", "🕒", "🕞", "🕓", "🕟", "🕔", "🕠", 
            "🕕", "🕡", "🕖", "🕢", "🕗", "🕣", "🕘", "🕤", "🕙", "🕥", "🕚", "🕦"
        ];
        // Determine the index for the clock emoji (hour and half-hour marks)
        const index = hour % 12 * 2 + (minute >= 30 ? 1 : 0);
        clockEmoji = clockEmojis[index];
    }

    onMount(() => {
        updateTimeAndDate();
        const interval = setInterval(updateTimeAndDate, 1000);
        return () => clearInterval(interval);
    });
</script>

<div class="p-4 mb-2 rounded-md text-xl bg-cyan-500 text-cyan-950">
    {clockEmoji} It's currently {time} - {date} for me.
</div>