import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function calculateAccuracyScores() {
    // 1. Get Resolution Data
    const resolutions = await prisma.resolution.findMany();
    if (resolutions.length === 0) {
        console.log('No resolution data available yet.');
        return;
    }

    // 2. Group Forecasts by Source
    const sources = ['NWS', 'ECMWF', 'OWM'];
    const scores: Record<string, number> = {};

    for (const source of sources) {
        let totalError = 0;
        let count = 0;

        for (const resolution of resolutions) {
            // Find forecasts for this target date from this source
            // We might have multiple forecasts (e.g. 7 days out, 1 day out).
            // For simplicity, let's take the *latest* forecast before the target date.
            const forecast = await prisma.forecast.findFirst({
                where: {
                    source: source,
                    targetDate: resolution.targetDate,
                    capturedAt: {
                        lt: resolution.targetDate // Forecast must be made *before* the day
                    }
                },
                orderBy: {
                    capturedAt: 'desc'
                }
            });

            if (forecast) {
                const error = Math.abs(forecast.predictedHigh - resolution.actualHigh);
                totalError += error;
                count++;
            }
        }

        if (count > 0) {
            scores[source] = totalError / count; // MAE
            console.log(`Model Accuracy Score: ${source} (Avg Error): ${scores[source].toFixed(2)}°F`);
        } else {
            console.log(`No valid forecasts found for ${source} to score.`);
        }
    }

    return scores;
}
