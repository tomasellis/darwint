import readline from 'readline';
import { db } from '../db/db.js';
import { whitelist } from '../db/schema.js';
import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Enter the Telegram ID to whitelist: ', async (id) => {
    const telegramId = Number(id);
    if (isNaN(telegramId)) {
        console.error('Invalid ID. Please enter a numeric Telegram ID.');
        rl.close();
        process.exit(1);
    }
    try {
        await db.insert(whitelist).values({ telegramId });
        console.log(`Successfully added Telegram ID ${telegramId} to whitelist.`);
    } catch (err) {
        console.error('Error adding to whitelist:', err);
    } finally {
        rl.close();
        process.exit(0);
    }
});