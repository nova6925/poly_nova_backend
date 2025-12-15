
import { ClobClient, Side } from '@polymarket/clob-client';
import { ethers } from 'ethers';

const CLOB_API = 'https://clob.polymarket.com';
const GAMMA_API = 'https://gamma-api.polymarket.com';
const POLYGON_RPC = process.env.RPC_URL || 'https://polygon-rpc.com';
const DEFAULT_BET_SIZE = parseInt(process.env.BET_SIZE || '5');

// CLOB API Credentials (auto-generated if not provided)
let CLOB_API_KEY = process.env.POLYMARKET_API_KEY;
let CLOB_API_SECRET = process.env.POLYMARKET_API_SECRET;
let CLOB_PASSPHRASE = process.env.POLYMARKET_PASSPHRASE;
let credentialsInitialized = false;

// Initialize/derive CLOB credentials on server start
export async function initClobCredentials(): Promise<boolean> {
    if (credentialsInitialized && CLOB_API_KEY && CLOB_API_SECRET && CLOB_PASSPHRASE) {
        return true;
    }

    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
        console.log('[Bot] ❌ PRIVATE_KEY not set. Cannot create CLOB credentials.');
        return false;
    }

    console.log('[Bot] 🔐 Initializing CLOB API credentials...');

    try {
        const provider = new ethers.providers.JsonRpcProvider(POLYGON_RPC);
        const wallet = new ethers.Wallet(privateKey, provider);
        console.log(`[Bot] Wallet: ${wallet.address}`);

        // Create client without credentials to generate/derive them
        const client = new ClobClient(CLOB_API, 137, wallet as any);

        try {
            // Try to derive existing credentials first
            const creds = await client.deriveApiKey();
            console.log('[Bot] Derived creds:', JSON.stringify(creds, null, 2));
            CLOB_API_KEY = creds.key;
            CLOB_API_SECRET = creds.secret;
            CLOB_PASSPHRASE = creds.passphrase;
            console.log('[Bot] ✅ Derived existing CLOB credentials');
        } catch {
            console.log('[Bot] Creating new CLOB credentials...');
            const creds = await client.createApiKey();
            console.log('[Bot] Created creds:', JSON.stringify(creds, null, 2));
            CLOB_API_KEY = creds.key;
            CLOB_API_SECRET = creds.secret;
            CLOB_PASSPHRASE = creds.passphrase;
            console.log('[Bot] ✅ Created new CLOB credentials');
        }

        console.log(`[Bot] API Key: ${CLOB_API_KEY?.substring(0, 8)}...`);
        credentialsInitialized = true;
        return true;

    } catch (err: any) {
        console.error('[Bot] ❌ Failed to initialize CLOB credentials:', err.message);
        return false;
    }
}

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

    // Ensure CLOB credentials are initialized
    if (!CLOB_API_KEY || !CLOB_API_SECRET || !CLOB_PASSPHRASE) {
        const initialized = await initClobCredentials();
        if (!initialized) {
            console.log(`[Bot] ⚠️ SIMULATION: CLOB credentials not available. Would BUY ${side} on "${marketTitle}" for $${amount}`);
            return { simulated: true, market: marketTitle, amount, side };
        }
    }

    if (!process.env.PRIVATE_KEY) {
        console.log(`[Bot] ⚠️ SIMULATION: Missing private key. Would BUY ${side} on "${marketTitle}" for $${amount}`);
        return { simulated: true, market: marketTitle, amount, side };
    }

    try {
        // Initialize wallet for signing (ethers v5)
        const provider = new ethers.providers.JsonRpcProvider(POLYGON_RPC);
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

        // Initialize CLOB Client with BOTH wallet (for signing) AND API credentials (for auth)
        const client = new ClobClient(CLOB_API, 137, wallet as any, {
            key: CLOB_API_KEY!,
            secret: CLOB_API_SECRET!,
            passphrase: CLOB_PASSPHRASE!
        });

        console.log(`[Bot] 💸 PLACING ORDER: BUY ${side} on "${marketTitle}" for $${amount}`);
        console.log(`[Bot] Token ID: ${request.tokenId}`);

        // REAL BETTING ENABLED
        // Step 1: Create and sign the order
        const signedOrder = await client.createOrder({
            tokenID: request.tokenId!,
            price: 0.99,
            side: side === 'YES' ? Side.BUY : Side.SELL,
            size: amount,
            feeRateBps: 0,
            nonce: 0
        });
        console.log(`[Bot] ✅ Order Created:`, JSON.stringify(signedOrder, null, 2));

        // Step 2: Submit the order to the exchange
        const response = await client.postOrder(signedOrder);
        console.log(`[Bot] ✅ Order Submitted:`, JSON.stringify(response, null, 2));

        return { success: true, order: signedOrder, response, market: marketTitle, amount, side };

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
