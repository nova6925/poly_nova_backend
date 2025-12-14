import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDates() {
    const forecasts = await prisma.forecast.findMany({
        where: {
            targetDate: {
                gte: new Date('2025-11-19'),
                lte: new Date('2025-11-21')
            }
        },
        orderBy: { targetDate: 'asc' }
    });

    console.log('Forecasts:');
    forecasts.forEach(f => {
        console.log(`  ${f.source} - ${f.targetDate.toISOString()} - ${f.predictedHigh}°F`);
    });

    const resolutions = await prisma.resolution.findMany();
    console.log('\nResolutions:');
    resolutions.forEach(r => {
        console.log(`  ${r.targetDate.toISOString()} - ${r.actualHigh}°F`);
    });

    await prisma.$disconnect();
}

checkDates();
