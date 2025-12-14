import { PrismaClient } from '@prisma/client';
import { resolveWeather } from './src/services/weather/actual-weather';
import { calculateAccuracy } from './src/services/weather/accuracy';

const prisma = new PrismaClient();

async function testAccuracy() {
    console.log('=== Testing Model Accuracy Feature ===\n');

    // Step 1: Add some test resolutions for past dates
    console.log('Step 1: Adding test resolutions...');
    const testDates = [
        { date: '2025-11-19', actualHigh: 51.5 },
        { date: '2025-11-20', actualHigh: 49.8 }
    ];

    for (const { date, actualHigh } of testDates) {
        const targetDate = new Date(date);
        targetDate.setUTCHours(0, 0, 0, 0);

        const existing = await prisma.resolution.findUnique({
            where: { targetDate }
        });

        if (!existing) {
            await prisma.resolution.create({
                data: { targetDate, actualHigh }
            });
            console.log(`  ✓ Added resolution for ${date}: ${actualHigh}°F`);
        } else {
            console.log(`  - Resolution for ${date} already exists`);
        }
    }

    // Step 2: Calculate accuracy
    console.log('\nStep 2: Calculating accuracy metrics...');
    const accuracy = await calculateAccuracy();

    if (accuracy.length === 0) {
        console.log('  ⚠ No accuracy data available. Make sure you have forecasts that match the resolution dates.');
        return;
    }

    console.log('\n=== Accuracy Results ===\n');
    accuracy.forEach((model, index) => {
        console.log(`${index + 1}. ${model.source}`);
        console.log(`   MAE: ${model.mae}°F`);
        console.log(`   RMSE: ${model.rmse}°F`);
        console.log(`   Accuracy: ${model.accuracyPercent}%`);
        console.log(`   Forecasts: ${model.totalResolved} / ${model.totalForecasts}`);
        console.log('');
    });

    console.log(`🏆 Most Accurate Model: ${accuracy[0].source}`);
}

testAccuracy()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
