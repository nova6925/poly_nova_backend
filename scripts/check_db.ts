import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const forecasts = await prisma.forecast.findMany({
        orderBy: { capturedAt: 'desc' }
    });
    console.log(`Total Forecasts: ${forecasts.length}`);
    forecasts.forEach(f => {
        console.log(`${f.source} - Target: ${f.targetDate.toISOString()} - High: ${f.predictedHigh}`);
    });
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
