import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import { addActiveVideo } from './tracker';

const CHANNEL_ID = process.env.CHANNEL_ID || 'UCX6OQ3DkcsbYNE6H8uQQuVA';
const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;

let lastProcessedVideoId: string | null = null;

export async function checkFeed(prisma: PrismaClient) {
    try {
        const response = await axios.get(RSS_URL);
        const result = await parseStringPromise(response.data);

        const entry = result.feed.entry?.[0];
        if (!entry) return;

        const videoId = entry['yt:videoId'][0];
        const title = entry.title[0];
        const publishedAt = new Date(entry.published[0]);

        // Optimization: Skip DB check if we just processed this video
        if (videoId === lastProcessedVideoId) {
            return;
        }

        console.log(`Processing video: ${title} (${videoId})`);

        // Use upsert to handle race conditions safely
        await prisma.video.upsert({
            where: { id: videoId },
            update: { title }, // Update title just in case
            create: {
                id: videoId,
                title,
                publishedAt
            }
        });

        // Always ensure it's in the tracker (idempotent)
        addActiveVideo({ id: videoId, publishedAt });
        console.log('Video ensured in database and tracker.');

        // Update cache
        lastProcessedVideoId = videoId;

    } catch (error) {
        console.error('Error fetching RSS feed:', error);
    }
}
