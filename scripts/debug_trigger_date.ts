import { collectForecasts } from './src/services/weather/collector';

const dateStr = process.argv[2] || '2025-11-21';
const date = new Date(dateStr);

console.log(`Debugging collection for date: ${date.toISOString()}`);

collectForecasts(date)
    .then(() => console.log('Collection complete'))
    .catch(console.error);
