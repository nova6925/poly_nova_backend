import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeErrors() {
    console.log('=== Analyzing Forecast Errors ===\n');

    const resolutions = await prisma.resolution.findMany({
        orderBy: { targetDate: 'asc' }
    });

    for (const resolution of resolutions) {
        const dateStr = resolution.targetDate.toISOString().split('T')[0];
        console.log(`\nDate: ${dateStr}`);
        console.log(`Actual High: ${resolution.actualHigh}°F`);
        console.log('---');

        // Find forecasts for this date
        const forecasts = await prisma.forecast.findMany({
            where: {
                targetDate: {
                    gte: new Date(resolution.targetDate.getTime() - 1000),
                    lte: new Date(resolution.targetDate.getTime() + 1000)
                }
            }
        });

        if (forecasts.length === 0) {
            console.log('  No forecasts found for this date');
            continue;
        }

        forecasts.forEach(f => {
            const error = Math.abs(f.predictedHigh - resolution.actualHigh);
            const withinMargin = error <= 2 ? '✓' : '✗';
            console.log(`  ${f.source}: ${f.predictedHigh}°F (error: ${error.toFixed(1)}°F) ${withinMargin}`);
        });
    }
}

analyzeErrors()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
