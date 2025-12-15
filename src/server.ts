import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';
import cron from 'node-cron';
import cors from '@fastify/cors';
import { checkFeed } from './services/watcher';
import { trackVideos, initializeTracker } from './services/tracker';
import { collectForecasts } from './services/weather/collector';
import { resolveWeather } from './services/weather/actual-weather';
import { calculateAccuracy } from './services/weather/accuracy';
import { runWeatherScraper } from './services/weather/scraper';
import { placeBet, handleWeatherTrigger } from './services/betting';


// Fix BigInt serialization
(BigInt.prototype as any).toJSON = function () {
    return this.toString();
};

const fastify = Fastify({ logger: true });
const prisma = new PrismaClient();

// Register CORS plugin synchronously
fastify.register(cors, {
    origin: true,
    credentials: true
});

// Health Check
fastify.get('/health', async () => {
    return { status: 'ok' };
});

// List tracked videos
fastify.get('/videos', async () => {
    const videos = await prisma.video.findMany({
        orderBy: { publishedAt: 'desc' },
        take: 10
    });
    return videos;
});

// Get video history
fastify.get('/videos/:id/history', async (request: any, reply) => {
    const { id } = request.params;
    const video = await prisma.video.findUnique({
        where: { id },
        include: { snapshots: { orderBy: { capturedAt: 'asc' } } }
    });

    if (!video) {
        reply.code(404).send({ error: 'Video not found' });
        return;
    }

    return video;
});

// Trigger Forecast Collection
fastify.post('/weather/collect', async (request, reply) => {
    const { startDate } = request.body as { startDate?: string };
    const date = startDate ? new Date(startDate) : undefined;

    console.log(`Triggering collection for start date: ${date || 'Today'}`);

    // Run collection in background
    collectForecasts(date).catch(console.error);

    return { status: 'success', message: 'Collection triggered', startDate: date };
});

// Get weather forecasts
fastify.get('/weather/forecasts', async () => {
    const forecasts = await prisma.forecast.findMany({
        orderBy: { capturedAt: 'desc' },
        take: 100 // Limit to recent 100 to avoid huge payloads
    });

    // Group by source
    const grouped = forecasts.reduce((acc: any, curr) => {
        if (!acc[curr.source]) {
            acc[curr.source] = [];
        }
        acc[curr.source].push(curr);
        return acc;
    }, {});

    return grouped;
});

// Get Model Accuracy Metrics
fastify.get('/weather/accuracy', async () => {
    const accuracy = await calculateAccuracy();
    return accuracy;
});

// Manually add a resolution (actual temperature)
fastify.post('/weather/resolution', async (request, reply) => {
    const { targetDate, actualHigh } = request.body as { targetDate: string; actualHigh: number };

    if (!targetDate || actualHigh === undefined) {
        reply.code(400).send({ error: 'targetDate and actualHigh are required' });
        return;
    }

    const date = new Date(targetDate);
    date.setUTCHours(0, 0, 0, 0);

    // Check if already exists
    const existing = await prisma.resolution.findUnique({
        where: { targetDate: date }
    });

    if (existing) {
        reply.code(409).send({ error: 'Resolution already exists for this date' });
        return;
    }

    const resolution = await prisma.resolution.create({
        data: {
            targetDate: date,
            actualHigh: actualHigh
        }
    });

    return { status: 'success', resolution };
});

// Get all resolutions
fastify.get('/weather/resolutions', async () => {
    const resolutions = await prisma.resolution.findMany({
        orderBy: { targetDate: 'desc' }
    });
    return resolutions;
});

// Trigger resolution for a specific date (fetch actual weather)
fastify.post('/weather/resolve', async (request, reply) => {
    const { targetDate } = request.body as { targetDate: string };

    if (!targetDate) {
        reply.code(400).send({ error: 'targetDate is required' });
        return;
    }

    const date = new Date(targetDate);
    await resolveWeather(date);

    return { status: 'success', message: 'Resolution triggered', targetDate: date };
});

// Get Weather Logs (Scraper Data)
fastify.get('/weather/logs', async () => {
    const logs = await prisma.weatherLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50
    });
    return logs;
});

// ========== MARKET BETTING API ==========

const GAMMA_API = 'https://gamma-api.polymarket.com';
const BOT_API = process.env.BOT_API_URL || 'http://localhost:4000';

// Search Markets by Slug (Proxy to Gamma API)
fastify.get('/markets/search', async (request, reply) => {
    const { slug } = request.query as { slug?: string };

    if (!slug) {
        return reply.code(400).send({ error: 'slug parameter required' });
    }

    try {
        const res = await fetch(`${GAMMA_API}/events?slug=${encodeURIComponent(slug)}`);
        const data = await res.json();

        if (!data || data.length === 0) {
            return reply.code(404).send({ error: 'Event not found' });
        }

        const event = data[0];
        const markets = event.markets.map((m: any) => ({
            id: m.id,
            title: m.groupItemTitle || m.question,
            tokenId: m.clobTokenIds?.[0] || null,
            outcome: m.outcome,
            active: m.active
        }));

        return {
            eventId: event.id,
            eventTitle: event.title,
            markets
        };
    } catch (err: any) {
        return reply.code(500).send({ error: err.message });
    }
});

// Place Bet (Forward to Bot)
fastify.post('/markets/bet', async (request, reply) => {
    const body = request.body as { tokenId: string; amount: number; side: string; marketTitle?: string };

    if (!body.tokenId || !body.amount) {
        return reply.code(400).send({ error: 'tokenId and amount required' });
    }

    try {
        const res = await fetch(`${BOT_API}/bet`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                market: body.marketTitle || 'Unknown',
                amount: body.amount,
                side: body.side || 'YES'
            })
        });
        const data = await res.json();
        return data;
    } catch (err: any) {
        return reply.code(500).send({ error: `Bot unreachable: ${err.message}` });
    }
});

// ========== BOT API ==========

const MARKET_SLUG = process.env.MARKET_SLUG || 'highest-temperature-in-nyc-on-december-15';

// Trigger from weather scraper
fastify.post('/bot/trigger', async (request, reply) => {
    const body = request.body as { maxTemp: number; condition: string };

    if (!body.maxTemp) {
        return reply.code(400).send({ error: 'maxTemp required' });
    }

    try {
        const result = await handleWeatherTrigger(body, MARKET_SLUG);
        return result;
    } catch (err: any) {
        return reply.code(500).send({ error: err.message });
    }
});

// Manual bet
fastify.post('/bot/bet', async (request, reply) => {
    const body = request.body as { tokenId: string; market: string; amount?: number; side?: string };

    if (!body.market || !body.tokenId) {
        return reply.code(400).send({ error: 'market and tokenId required' });
    }

    try {
        const result = await placeBet({
            tokenId: body.tokenId,
            marketTitle: body.market,
            amount: body.amount,
            side: body.side as 'YES' | 'NO'
        });
        return result;
    } catch (err: any) {
        return reply.code(500).send({ error: err.message });
    }
});

// Root route
fastify.get('/', async () => {
    return { status: 'ok', message: 'Poly Nova Backend is running' };
});

const start = async () => {
    try {
        const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
        await fastify.listen({ port, host: '0.0.0.0' });
        console.log(`Server running on port ${port}`);

        // Initialize Tracker Cache
        await initializeTracker(prisma);

        // Schedule Watcher (RSS) - Every 1 minute
        cron.schedule('* * * * *', async () => {
            console.log('Running RSS Watcher...');
            await checkFeed(prisma);
        });

        // Schedule Tracker (API) - Every 1 minute
        cron.schedule('* * * * *', async () => {
            console.log('Running API Tracker...');
            await trackVideos(prisma);
        });

        // Schedule Weather Collector - Every 4 hours
        cron.schedule('0 */4 * * *', async () => {
            console.log('Running Weather Forecast Collector...');
            await collectForecasts();
        });

        // Schedule Weather Scraper (Wunderground) - Every 1 minute
        cron.schedule('* * * * *', async () => {
            console.log('Running Weather Scraper...');
            await runWeatherScraper(prisma);
        });

    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
