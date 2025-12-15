/**
 * Script to generate CLOB API credentials with GNOSIS_SAFE (proxy wallet)
 * Run: npx ts-node scripts/create_clob_keys.ts
 */
import { ClobClient } from '@polymarket/clob-client';
import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const CLOB_API = 'https://clob.polymarket.com';
const POLYGON_RPC = 'https://polygon-rpc.com';

// Your Polymarket proxy wallet address (from Builder Settings)
const PROXY_WALLET = process.env.POLYMARKET_PROXY_WALLET || '0x4d8119d1ce14b04733ff1148685fe3015b2a4bb2';

async function main() {
    const privateKey = process.env.PRIVATE_KEY;

    if (!privateKey) {
        console.error('❌ PRIVATE_KEY environment variable not set!');
        console.log('Set it in .env file or run:');
        console.log('  set PRIVATE_KEY=your_private_key');
        process.exit(1);
    }

    console.log('🔐 Creating CLOB API credentials with GNOSIS_SAFE (proxy wallet)...\n');

    // Initialize wallet
    const provider = new ethers.providers.JsonRpcProvider(POLYGON_RPC);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`MetaMask Wallet (signer): ${wallet.address}`);
    console.log(`Proxy Wallet (funder): ${PROXY_WALLET}`);
    console.log(`Signature Type: 2 (GNOSIS_SAFE)\n`);

    // Initialize CLOB client WITH proxy wallet and signature type 2
    const client = new ClobClient(CLOB_API, 137, wallet as any, undefined, 2, PROXY_WALLET);

    try {
        // Create or derive API credentials
        const creds = await client.createOrDeriveApiCreds();

        console.log('✅ CLOB API Credentials Generated!\n');
        console.log('Full response:', JSON.stringify(creds, null, 2));
        console.log('\n====================================================');
        console.log('Add these to Railway environment variables:\n');
        console.log(`POLYMARKET_API_KEY=${creds.key}`);
        console.log(`POLYMARKET_API_SECRET=${creds.secret}`);
        console.log(`POLYMARKET_PASSPHRASE=${creds.passphrase}`);
        console.log('====================================================\n');

    } catch (err: any) {
        console.error('❌ Error:', err.message);
        if (err.response) {
            console.error('Response:', JSON.stringify(err.response.data, null, 2));
        }
    }
}

main();
