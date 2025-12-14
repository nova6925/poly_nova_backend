import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// KLGA Coordinates
const LAT = 40.7769;
const LON = -73.8740;
const API_KEY = process.env.OPENWEATHER_API_KEY;

export async function fetchOWMForecast(targetDates: Date[]) {
    if (!API_KEY) {
        console.warn('OpenWeatherMap API Key not set. Skipping.');
        return;
    }

    try {
        // OpenWeatherMap One Call API 3.0 (or 2.5 if legacy)
        // Note: One Call 3.0 is paid/subscription usually, but 2.5 forecast is free.
        // We'll use the standard 5-day/3-hour forecast for free tier compatibility if possible,
        // or One Call if the key supports it. Let's assume standard forecast for broader compatibility.
        // https://api.openweathermap.org/data/2.5/forecast

        const url = 'https://api.openweathermap.org/data/2.5/forecast';

        const response = await axios.get(url, {
            params: {
                lat: LAT,
                lon: LON,
                appid: API_KEY,
                units: 'imperial' // Fahrenheit
            }
        });

        const list = response.data.list;

        for (const targetDate of targetDates) {
            const targetDateString = targetDate.toISOString().split('T')[0];

            let maxTemp = -Infinity;
            let found = false;

            for (const item of list) {
                const itemDate = item.dt_txt.split(' ')[0]; // "2025-11-19 12:00:00"
                if (itemDate === targetDateString) {
                    if (item.main.temp_max > maxTemp) {
                        maxTemp = item.main.temp_max;
                        found = true;
                    }
                }
            }

            if (found) {
                console.log(`OWM Forecast for ${targetDateString}: High of ${maxTemp}°F`);

                // Save to DB
                await prisma.forecast.create({
                    data: {
                        source: 'OWM',
                        targetDate: targetDate,
                        predictedHigh: maxTemp,
                        rawResponse: JSON.stringify(response.data),
                        capturedAt: new Date()
                    }
                });
            } else {
                console.log(`No OWM forecast available yet for ${targetDateString} (5-day limit on free tier)`);
            }
        }

    } catch (error) {
        console.error('Error fetching OWM forecast:', error);
    }
}
