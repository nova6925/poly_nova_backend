import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addNWSForecast() {
    const targetDate = new Date('2025-11-19T12:00:00.000Z');

    await prisma.forecast.create({
        data: {
            source: 'NWS',
            targetDate: targetDate,
            predictedHigh: 52,
            rawResponse: JSON.stringify({ note: 'Manually added for demo' }),
            capturedAt: new Date()
        }
    });

    console.log('✓ Added NWS forecast for Nov 19: 52°F');
    await prisma.$disconnect();
}

addNWSForecast();
