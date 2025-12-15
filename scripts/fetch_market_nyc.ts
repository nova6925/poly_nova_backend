
import axios from 'axios';

const GAMMA_API = 'https://gamma-api.polymarket.com';
const CLOB_API = 'https://clob.polymarket.com';

async function main() {
    const slug = 'highest-temperature-in-nyc-on-december-15';
    console.log(`Fetching event: ${slug}...`);

    try {
        // 1. Get Event Details from Gamma
        const eventRes = await axios.get(`${GAMMA_API}/events`, {
            params: { slug }
        });

        if (!eventRes.data || eventRes.data.length === 0) {
            console.error('Event not found!');
            return;
        }

        const event = eventRes.data[0];
        console.log(`Event Found: ${event.title}`);
        console.log(`ID: ${event.id}`);
        console.log(`Markets: ${event.markets.length}`);

        // 2. Iterate through markets (e.g., "Under 30F", "30-40F", etc.)
        for (const market of event.markets) {
            console.log(`\n-----------------------------------`);
            console.log(`Market: ${market.groupItemTitle || market.question}`);
            console.log(`ID: ${market.id}`);

            // The main outcome token is usually the first one (asset_id) or we look at clobTokenIds if available
            // For binary markets, clobTokenIds[0] is usually YES, [1] is NO (or vice versa, need to check)
            // Polymarket usually creates a Condition ID.

            // Let's look for clobTokenIds
            if (market.clobTokenIds && market.clobTokenIds.length > 0) {
                const tokenId = market.clobTokenIds[0]; // Usually the 'Yes' outcome for this specific bucket
                console.log(`Token ID (Outcome): ${tokenId}`);

                // 3. Get Price from CLOB
                try {
                    const bookRes = await axios.get(`${CLOB_API}/book`, {
                        params: { token_id: tokenId }
                    });

                    const bestBid = bookRes.data.bids.length > 0 ? bookRes.data.bids[0].price : 'No bids';
                    const bestAsk = bookRes.data.asks.length > 0 ? bookRes.data.asks[0].price : 'No asks';

                    console.log(`Best Buy Price (Ask): ${bestAsk}`);
                    console.log(`Best Sell Price (Bid): ${bestBid}`);
                } catch (err) {
                    console.log('Error fetching order book:', err.message);
                }
            } else {
                console.log('No CLOB Token ID found.');
            }
        }

    } catch (err) {
        console.error('Error:', err.message);
        if (err.response) {
            console.error('Data:', err.response.data);
        }
    }
}

main();
