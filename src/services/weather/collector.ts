import { fetchNWSForecast } from './nws';
import { fetchECMWFForecast } from './ecmwf';
import { fetchOWMForecast } from './owm';

export async function collectForecasts(startDate?: Date) {
    // Target Dates: Start Date + Next 2 Days (Total 3 Days)
    const baseDate = startDate || new Date();
    const dates: Date[] = [];

    for (let i = 0; i < 3; i++) {
        const date = new Date(baseDate);
        date.setDate(baseDate.getDate() + i);
        date.setUTCHours(12, 0, 0, 0); // Set to Noon UTC to avoid date shifting
        dates.push(date);
    }

    console.log('Starting Forecast Collection for dates:', dates.map(d => d.toISOString().split('T')[0]));

    // Run in parallel
    await Promise.allSettled([
        fetchNWSForecast(dates),
        fetchECMWFForecast(dates),
        fetchOWMForecast(dates)
    ]);

    console.log('Forecast Collection Completed.');
}
