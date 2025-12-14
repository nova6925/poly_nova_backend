import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Clearing all forecast data...');
    const result = await prisma.forecast.deleteMany({});
    console.log(`Deleted ${result.count} records.`);
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
