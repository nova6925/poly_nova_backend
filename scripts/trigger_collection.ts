import { collectForecasts } from './src/services/weather/collector';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Triggering Real Forecast Collection...');
    await collectForecasts();
    console.log('Collection finished.');
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
