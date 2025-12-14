import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const API_KEY = process.env.YOUTUBE_API_KEY;
const API_URL = 'https://www.googleapis.com/youtube/v3/videos';


// In-memory cache for active videos
let activeVideos: { id: string; publishedAt: Date }[] = [];

export async function initializeTracker(prisma: PrismaClient) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    activeVideos = await prisma.video.findMany({
        where: {
            publishedAt: {
                gte: oneDayAgo
            }
        },
        select: { id: true, publishedAt: true }
    });
    console.log(`Tracker initialized with ${activeVideos.length} active videos.`);
}

export function addActiveVideo(video: { id: string; publishedAt: Date }) {
    activeVideos.push(video);
}

export async function trackVideos(prisma: PrismaClient) {
    if (!API_KEY || API_KEY === 'YOUR_YOUTUBE_API_KEY_HERE') {
        console.warn('YouTube API Key not set. Skipping tracking.');
        return;
    }

    // Filter out videos older than 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    activeVideos = activeVideos.filter(v => v.publishedAt >= oneDayAgo);

    if (activeVideos.length === 0) return;

    const videoIds = activeVideos.map(v => v.id).join(',');

    try {
        const response = await axios.get(API_URL, {
            params: {
                part: 'statistics',
                id: videoIds,
                key: API_KEY
            }
        });

        const items = response.data.items;

        for (const item of items) {
            const viewCount = BigInt(item.statistics.viewCount);

            await prisma.viewSnapshot.create({
                data: {
                    videoId: item.id,
                    viewCount
                }
            });
            console.log(`Logged views for ${item.id}: ${viewCount}`);
        }

    } catch (error) {
        console.error('Error fetching YouTube API:', error);
    }
}
