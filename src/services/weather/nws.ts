import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// KLGA Coordinates
const LAT = 40.7769;
const LON = -73.8740;

// NWS User-Agent (Required by API)
const USER_AGENT = 'PolymarketWeatherBot/1.0 (contact@example.com)';

export async function fetchNWSForecast(targetDates: Date[]) {
    try {
        // 1. Get Grid Points
        const pointsUrl = `https://api.weather.gov/points/${LAT},${LON}`;
        const pointsRes = await axios.get(pointsUrl, { headers: { 'User-Agent': USER_AGENT } });
        const gridId = pointsRes.data.properties.gridId;
        const gridX = pointsRes.data.properties.gridX;
        const gridY = pointsRes.data.properties.gridY;

        // 2. Get Hourly Forecast
        const forecastUrl = `https://api.weather.gov/gridpoints/${gridId}/${gridX},${gridY}/forecast/hourly`;
        const forecastRes = await axios.get(forecastUrl, { headers: { 'User-Agent': USER_AGENT } });

        const periods = forecastRes.data.properties.periods;

        // 3. Find Max Temp for Each Target Date
        for (const targetDate of targetDates) {
            const targetDateString = targetDate.toISOString().split('T')[0]; // YYYY-MM-DD
            let maxTemp = -Infinity;
            let found = false;

            for (const period of periods) {
                const periodDate = period.startTime.split('T')[0];
                if (periodDate === targetDateString) {
                    if (period.temperature > maxTemp) {
                        maxTemp = period.temperature;
                        found = true;
                    }
                }
            }

            if (found) {
                console.log(`NWS Forecast for ${targetDateString}: High of ${maxTemp}°F`);

                // Save to DB
                await prisma.forecast.create({
                    data: {
                        source: 'NWS',
                        targetDate: targetDate,
                        predictedHigh: maxTemp,
                        rawResponse: JSON.stringify(periods.filter((p: any) => p.startTime.startsWith(targetDateString))),
                        capturedAt: new Date()
                    }
                });
            } else {
                console.log(`No NWS forecast available yet for ${targetDateString}`);
            }
        }

    } catch (error) {
        console.error('Error fetching NWS forecast:', error);
    }
}
