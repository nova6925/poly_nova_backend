
import { ClobClient } from '@polymarket/clob-client';
import { ethers } from 'ethers';

const CLOB_API = 'https://clob.polymarket.com';
const GAMMA_API = 'https://gamma-api.polymarket.com';
const POLYGON_RPC = process.env.RPC_URL || 'https://polygon-rpc.com';
const DEFAULT_BET_SIZE = parseInt(process.env.BET_SIZE || '5');

// Builder API Credentials (from Polymarket Builder Settings)
const BUILDER_API_KEY = process.env.POLYMARKET_API_KEY;
const BUILDER_API_SECRET = process.env.POLYMARKET_API_SECRET;
const BUILDER_PASSPHRASE = process.env.POLYMARKET_PASSPHRASE;

// State
let currentBetMarketId = "";

interface BetRequest {
    tokenId?: string;
    marketTitle: string;
    amount?: number;
    side?: 'YES' | 'NO';
}

interface TriggerRequest {
    maxTemp: number;
    condition: string;
}

// Helper: Get Markets from Gamma API
async function getMarkets(slug: string) {
    try {
        const res = await fetch(`${GAMMA_API}/events?slug=${encodeURIComponent(slug)}`);
        const data = await res.json();
        if (data && data.length > 0) return data[0].markets;
    } catch (err) { /* Network error */ }
    return [];
}

// Helper: Map Temperature to Market
function mapTempToMarket(temp: number, markets: any[]) {
    for (const market of markets) {
        const title = market.groupItemTitle || market.question;

        // Range "20-30"
        const rangeMatch = title.match(/(\d+)\s*[-to]\s*(\d+)/);
        if (rangeMatch) {
            const min = parseInt(rangeMatch[1]);
            const max = parseInt(rangeMatch[2]);
            if (temp >= min && temp <= max) return market;
        }

        // "Under X"
        if (title.toLowerCase().includes('under') || title.includes('<')) {
            const num = title.match(/(\d+)/);
            if (num && temp < parseInt(num[1])) return market;
        }

        // "Over X"
        if (title.toLowerCase().includes('over') || title.toLowerCase().includes('above') || title.includes('>')) {
            const num = title.match(/(\d+)/);
            if (num && temp > parseInt(num[1])) return market;
        }
    }
    return null;
}

// Core: Place Bet
export async function placeBet(request: BetRequest) {
    const { marketTitle, amount = DEFAULT_BET_SIZE, side = 'YES' } = request;

    // Check for Builder API credentials first
    if (!BUILDER_API_KEY) {
        console.log(`[Bot] ⚠️ SIMULATION: No API key configured. Would BUY ${side} on "${marketTitle}" for $${amount}`);
        return { simulated: true, market: marketTitle, amount, side };
    }

    try {
        // Initialize CLOB Client with Builder API credentials
        const client = new ClobClient(CLOB_API, 137, undefined, {
            key: BUILDER_API_KEY,
            secret: BUILDER_API_SECRET!,
            passphrase: BUILDER_PASSPHRASE!
        });

        console.log(`[Bot] 💸 PLACING ORDER: BUY ${side} on "${marketTitle}" for $${amount}`);

        // REAL BETTING ENABLED
        const order = await client.createOrder({
            tokenID: request.tokenId!,
            price: 0.99,
            side: side === 'YES' ? 'BUY' : 'SELL',
            size: amount,
            feeRateBps: 0,
            nonce: 0
        });
        console.log(`[Bot] ✅ Order Placed: ${order.orderID}`);
        return { success: true, orderId: order.orderID, market: marketTitle, amount, side };

    } catch (err: any) {
        console.error('[Bot] Betting Failed:', err.message);
        throw err;
    }
}

// Core: Handle Weather Trigger
export async function handleWeatherTrigger(request: TriggerRequest, marketSlug: string) {
    const { maxTemp, condition } = request;
    console.log(`[Bot] 🚨 Received trigger: ${maxTemp}°F (${condition})`);

    const markets = await getMarkets(marketSlug);
    if (markets.length === 0) {
        return { error: 'Could not fetch markets' };
    }

    const targetMarket = mapTempToMarket(maxTemp, markets);
    if (!targetMarket) {
        return { error: `No market found for ${maxTemp}°F` };
    }

    console.log(`[Bot] 🎯 Target: "${targetMarket.groupItemTitle}"`);

    if (targetMarket.id === currentBetMarketId) {
        console.log(`[Bot] ✅ Already holding position on this market.`);
        return { status: 'holding', market: targetMarket.groupItemTitle };
    }

    if (!targetMarket.clobTokenIds || targetMarket.clobTokenIds.length === 0) {
        return { error: 'Market has no token ID' };
    }

    const result = await placeBet({
        tokenId: targetMarket.clobTokenIds[0],
        marketTitle: targetMarket.groupItemTitle
    });

    currentBetMarketId = targetMarket.id;
    return { status: 'bet_placed', market: targetMarket.groupItemTitle, result };
}
