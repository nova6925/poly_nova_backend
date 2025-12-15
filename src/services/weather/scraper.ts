
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

puppeteer.use(StealthPlugin());

const TARGET_URL = 'https://www.wunderground.com/hourly/us/ny/new-york-city/KLGA/date/2025-12-15';
const BOT_TRIGGER_URL = process.env.BOT_TRIGGER_URL || 'http://localhost:4000/trigger';

// Skip scraper on cloud (no Chrome available)
const IS_CLOUD = process.env.RENDER || process.env.NODE_ENV === 'production';

// State
let lastKnownTemp: number | null = null;
let lastSavedTime = 0;
const SAVE_INTERVAL = 60 * 60 * 1000; // 1 hour

export async function runWeatherScraper(prisma: PrismaClient) {
    // Skip on cloud - use local weather_scraper instead
    if (IS_CLOUD) {
        console.log('[Scraper] Skipping - Chrome not available on cloud. Use local weather_scraper.');
        return;
    }

    console.log('[Scraper] Starting weather check...');

    let browser = null;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();

        // Block heavy resources
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

        await page.waitForSelector('#hourly-forecast-table', { timeout: 15000 }).catch(() => { });

        const data = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('#hourly-forecast-table tbody tr'));
            return rows.map(row => ({
                temp: row.querySelector('td:nth-child(3) .wu-value')?.textContent?.trim() || '',
                condition: row.querySelector('td:nth-child(2) .show-for-medium')?.textContent?.trim() || ''
            })).filter(r => r.temp);
        });

        const temps = data.map(d => parseInt(d.temp) || 0);
        const maxTemp = Math.max(...temps);
        const condition = data.find(d => parseInt(d.temp) === maxTemp)?.condition || 'Unknown';

        console.log(`[Scraper] Max Temp: ${maxTemp}°F (${condition})`);

        // Check if changed
        const now = Date.now();
        const tempChanged = lastKnownTemp !== null && maxTemp !== lastKnownTemp;
        const hourlyTrigger = (now - lastSavedTime) >= SAVE_INTERVAL;

        if (lastKnownTemp === null || tempChanged || hourlyTrigger) {
            // Save to DB
            await prisma.weatherLog.create({
                data: { maxTemp, condition, location: 'KLGA' }
            });
            console.log(`[Scraper] ✅ Saved to DB`);
            lastSavedTime = now;

            // Trigger Bot if temp CHANGED
            if (tempChanged) {
                console.log(`[Scraper] 🚨 Temp changed from ${lastKnownTemp} to ${maxTemp}! Triggering bot...`);
                try {
                    await axios.post(BOT_TRIGGER_URL, { maxTemp, condition });
                    console.log(`[Scraper] ✅ Bot triggered`);
                } catch (err: any) {
                    console.log(`[Scraper] ⚠️ Bot trigger failed (is it running?): ${err.message}`);
                }
            }
        }

        lastKnownTemp = maxTemp;

    } catch (error: any) {
        console.error('[Scraper] Error:', error.message);
    } finally {
        if (browser) await browser.close();
    }
}
