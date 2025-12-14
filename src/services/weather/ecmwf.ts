import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// KLGA Coordinates
const LAT = 40.7769;
const LON = -73.8740;

export async function fetchECMWFForecast(targetDates: Date[]) {
    try {
        // Open-Meteo API for ECMWF (Free non-commercial)
        // https://open-meteo.com/en/docs/ecmwf-api
        const url = 'https://api.open-meteo.com/v1/forecast';

        // Sort dates to find range
        const sortedDates = targetDates.sort((a, b) => a.getTime() - b.getTime());
        const startDate = sortedDates[0].toISOString().split('T')[0];
        const endDate = sortedDates[sortedDates.length - 1].toISOString().split('T')[0];

        const response = await axios.get(url, {
            params: {
                latitude: LAT,
                longitude: LON,
                hourly: 'temperature_2m',
                // models: 'ecmwf_ifs04', // Removing to use default "Best Match"
                temperature_unit: 'fahrenheit',
                timezone: 'America/New_York',
                start_date: startDate,
                end_date: endDate
            }
        });

        const hourly = response.data.hourly;
        const times = hourly.time as string[];
        const temps = hourly.temperature_2m as number[];

        for (const targetDate of targetDates) {
            const targetDateString = targetDate.toISOString().split('T')[0];
            let maxTemp = -Infinity;
            let found = false;

            for (let i = 0; i < times.length; i++) {
                const time = times[i]; // "2025-11-19T00:00"
                if (time.startsWith(targetDateString)) {
                    if (temps[i] !== null && temps[i] > maxTemp) {
                        maxTemp = temps[i];
                        found = true;
                    }
                }
            }

            if (found) {
                console.log(`ECMWF Forecast for ${targetDateString}: High of ${maxTemp}°F`);

                // Save to DB
                await prisma.forecast.create({
                    data: {
                        source: 'ECMWF',
                        targetDate: targetDate,
                        predictedHigh: maxTemp,
                        rawResponse: JSON.stringify(response.data),
                        capturedAt: new Date()
                    }
                });
            } else {
                console.log(`No ECMWF forecast available for ${targetDate.toISOString()}`);
            }
        }

    } catch (error) {
        console.error('Error fetching ECMWF forecast:', error);
    }
}
