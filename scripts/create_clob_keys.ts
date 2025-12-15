/**
 * Script to generate CLOB API credentials
 * Run: npx ts-node scripts/create_clob_keys.ts
 */
import { ClobClient } from '@polymarket/clob-client';
import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const CLOB_API = 'https://clob.polymarket.com';
const POLYGON_RPC = 'https://polygon-rpc.com';

async function main() {
    const privateKey = process.env.PRIVATE_KEY;

    if (!privateKey) {
        console.error('❌ PRIVATE_KEY environment variable not set!');
        console.log('Set it in .env file or run:');
        console.log('  $env:PRIVATE_KEY="your_private_key"; npx ts-node scripts/create_clob_keys.ts');
        process.exit(1);
    }

    console.log('🔐 Creating CLOB API credentials...\n');

    // Initialize wallet
    const provider = new ethers.providers.JsonRpcProvider(POLYGON_RPC);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`Wallet Address: ${wallet.address}\n`);

    // Initialize CLOB client (without API credentials - we're creating them)
    const client = new ClobClient(CLOB_API, 137, wallet as any);

    try {
        // Create or derive API key
        const apiKeyCreds = await client.createApiKey();

        console.log('✅ CLOB API Credentials Generated!\n');
        console.log('Add these to your Railway/Render environment variables:\n');
        console.log('====================================================');
        console.log(`POLYMARKET_API_KEY=${apiKeyCreds.key}`);
        console.log(`POLYMARKET_API_SECRET=${apiKeyCreds.secret}`);
        console.log(`POLYMARKET_PASSPHRASE=${apiKeyCreds.passphrase}`);
        console.log('====================================================\n');

        console.log('⚠️  Save these! They are linked to your wallet address.');

    } catch (err: any) {
        console.error('❌ Error creating API credentials:', err.message);

        // Try to derive existing credentials
        console.log('\n🔄 Trying to derive existing credentials...');
        try {
            const derived = await client.deriveApiKey();
            console.log('\n✅ Derived existing CLOB API Credentials!\n');
            console.log('Add these to your Railway/Render environment variables:\n');
            console.log('====================================================');
            console.log(`POLYMARKET_API_KEY=${derived.key}`);
            console.log(`POLYMARKET_API_SECRET=${derived.secret}`);
            console.log(`POLYMARKET_PASSPHRASE=${derived.passphrase}`);
            console.log('====================================================\n');
        } catch (deriveErr: any) {
            console.error('❌ Error deriving credentials:', deriveErr.message);
        }
    }
}

main();
