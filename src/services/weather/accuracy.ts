import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ModelAccuracy {
    source: string;
    mae: number;          // Mean Absolute Error
    rmse: number;         // Root Mean Square Error
    accuracyPercent: number; // % within ±2°F
    totalForecasts: number;
    totalResolved: number;
}

/**
 * Calculate accuracy metrics for all models
 */
export async function calculateAccuracy(): Promise<ModelAccuracy[]> {
    // Get all resolutions (actual temperatures)
    const resolutions = await prisma.resolution.findMany();

    if (resolutions.length === 0) {
        console.log('No resolutions available for accuracy calculation');
        return [];
    }

    // Get all forecasts
    const forecasts = await prisma.forecast.findMany();

    // Group forecasts by source
    const forecastsBySource: { [source: string]: any[] } = {};
    forecasts.forEach(f => {
        if (!forecastsBySource[f.source]) {
            forecastsBySource[f.source] = [];
        }
        forecastsBySource[f.source].push(f);
    });

    const results: ModelAccuracy[] = [];

    // Calculate metrics for each source
    for (const [source, sourceForecasts] of Object.entries(forecastsBySource)) {
        const errors: number[] = [];
        let withinMargin = 0;

        // Match forecasts to resolutions
        for (const forecast of sourceForecasts) {
            // Normalize forecast date to midnight for comparison
            const forecastDate = new Date(forecast.targetDate);
            forecastDate.setUTCHours(0, 0, 0, 0);

            // Find matching resolution
            const resolution = resolutions.find(r => {
                const resDate = new Date(r.targetDate);
                resDate.setUTCHours(0, 0, 0, 0);
                return resDate.getTime() === forecastDate.getTime();
            });

            if (resolution) {
                const error = Math.abs(forecast.predictedHigh - resolution.actualHigh);
                errors.push(error);

                // Check if within ±2°F margin
                if (error <= 2) {
                    withinMargin++;
                }
            }
        }

        if (errors.length > 0) {
            // Calculate MAE (Mean Absolute Error)
            const mae = errors.reduce((sum, e) => sum + e, 0) / errors.length;

            // Calculate RMSE (Root Mean Square Error)
            const mse = errors.reduce((sum, e) => sum + e * e, 0) / errors.length;
            const rmse = Math.sqrt(mse);

            // Calculate accuracy percentage
            const accuracyPercent = (withinMargin / errors.length) * 100;

            results.push({
                source,
                mae: parseFloat(mae.toFixed(2)),
                rmse: parseFloat(rmse.toFixed(2)),
                accuracyPercent: parseFloat(accuracyPercent.toFixed(1)),
                totalForecasts: sourceForecasts.length,
                totalResolved: errors.length
            });
        }
    }

    // Sort by MAE (lower is better)
    results.sort((a, b) => a.mae - b.mae);

    return results;
}

/**
 * Get accuracy for a specific model
 */
export async function getModelAccuracy(source: string): Promise<ModelAccuracy | null> {
    const allAccuracy = await calculateAccuracy();
    return allAccuracy.find(a => a.source === source) || null;
}
