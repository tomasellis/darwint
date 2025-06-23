import { db } from '../db/db.js';
import { whitelist } from '../db/schema.js';
import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

(async () => {
    try {
        await db.delete(whitelist);
        console.log('Whitelist table cleared.');
    } catch (err) {
        console.error('Error clearing whitelist:', err);
        process.exit(1);
    }
    process.exit(0);
})();