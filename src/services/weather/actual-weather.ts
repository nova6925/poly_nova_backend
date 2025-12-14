import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// KLGA Coordinates
const LAT = 40.7769;
const LON = -73.8740;

/**
 * Fetch actual observed high temperature for a given date
 * Uses Open-Meteo Historical Weather API (free, no API key required)
 */
export async function fetchActualWeather(targetDate: Date): Promise<number | null> {
    try {
        const dateString = targetDate.toISOString().split('T')[0]; // YYYY-MM-DD

        const url = 'https://archive-api.open-meteo.com/v1/archive';
        const response = await axios.get(url, {
            params: {
                latitude: LAT,
                longitude: LON,
                start_date: dateString,
                end_date: dateString,
                daily: 'temperature_2m_max',
                temperature_unit: 'fahrenheit',
                timezone: 'America/New_York'
            }
        });

        const daily = response.data.daily;
        if (daily && daily.temperature_2m_max && daily.temperature_2m_max.length > 0) {
            const actualHigh = daily.temperature_2m_max[0];
            console.log(`Actual high for ${dateString}: ${actualHigh}°F`);
            return actualHigh;
        }

        console.log(`No actual weather data available for ${dateString}`);
        return null;
    } catch (error) {
        console.error('Error fetching actual weather:', error);
        return null;
    }
}

/**
 * Fetch and store actual weather for a date in the Resolution table
 */
export async function resolveWeather(targetDate: Date): Promise<void> {
    const actualHigh = await fetchActualWeather(targetDate);

    if (actualHigh === null) {
        console.log(`Cannot resolve weather for ${targetDate.toISOString()} - no data available`);
        return;
    }

    // Normalize date to midnight
    const normalizedDate = new Date(targetDate);
    normalizedDate.setUTCHours(0, 0, 0, 0);

    // Check if resolution already exists
    const existing = await prisma.resolution.findUnique({
        where: { targetDate: normalizedDate }
    });

    if (existing) {
        console.log(`Resolution already exists for ${normalizedDate.toISOString()}`);
        return;
    }

    // Create new resolution
    await prisma.resolution.create({
        data: {
            targetDate: normalizedDate,
            actualHigh: actualHigh
        }
    });

    console.log(`Resolved weather for ${normalizedDate.toISOString()}: ${actualHigh}°F`);
}
