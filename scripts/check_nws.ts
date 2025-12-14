import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkNWS() {
    const nwsForecasts = await prisma.forecast.findMany({
        where: {
            source: 'NWS',
            targetDate: {
                gte: new Date('2025-11-19'),
                lt: new Date('2025-11-21')
            }
        },
        orderBy: { targetDate: 'asc' }
    });

    console.log('NWS Forecasts for Nov 19-20:');
    if (nwsForecasts.length === 0) {
        console.log('  No NWS forecasts found');
    } else {
        nwsForecasts.forEach(f => {
            console.log(`  ${f.targetDate.toISOString().split('T')[0]} - ${f.predictedHigh}°F`);
        });
    }

    await prisma.$disconnect();
}

checkNWS();
