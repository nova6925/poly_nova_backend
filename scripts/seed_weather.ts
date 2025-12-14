import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding weather forecasts...');

    const targetDate = new Date('2025-11-19T00:00:00Z');

    await prisma.forecast.createMany({
        data: [
            {
                source: 'NWS',
                targetDate: targetDate,
                predictedHigh: 75.5,
                rawResponse: '{"mock": "data"}',
                capturedAt: new Date()
            },
            {
                source: 'ECMWF',
                targetDate: targetDate,
                predictedHigh: 74.2,
                rawResponse: '{"mock": "data"}',
                capturedAt: new Date()
            },
            {
                source: 'OWM',
                targetDate: targetDate,
                predictedHigh: 76.0,
                rawResponse: '{"mock": "data"}',
                capturedAt: new Date()
            }
        ]
    });

    console.log('Seeding completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
