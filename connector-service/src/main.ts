import { getUpdates, sendMessage, getMe } from './telegramUtils';
import { db } from './db.js';
import { messagesQueue, users } from './schema.js';
import { eq } from 'drizzle-orm';

let lastUpdateId = 0;

async function insertMessageToQueue(telegramId: string, message: string) {
  try {
    let user = await db.select().from(users).where(eq(users.telegramId, telegramId)).limit(1);
    
    if (user.length === 0) {
      const newUser = await db.insert(users).values({ telegramId }).returning();
      user = newUser;
    }
    
    await db.insert(messagesQueue).values({
      userId: user[0].id,
      message: message,
      status: 'pending'
    });
    
    console.log(`Message queued for user ${telegramId}: ${message}`);
  } catch (error) {
    console.error('Error inserting message to queue:', error);
  }
}

async function processUpdates(updates: any[]) {
  for (const update of updates) {
    console.log('Processing update:', update);
    
    lastUpdateId = Math.max(lastUpdateId, update.update_id);
    
    if (update.message) {
      console.log('Received message:', update.message.text);
      await insertMessageToQueue(update.message.from.id.toString(), update.message.text);
    }
    
    if (update.callback_query) {
      console.log('Received callback query:', update.callback_query);
    }
  }
}

async function longPollUpdates() {
  try {
    // this will wait up to 30 seconds for new updates before returning
    const updates = await getUpdates(lastUpdateId + 1, undefined, 30);
    
    if (updates.length > 0) {
      console.log(`Received ${updates.length} updates`);
      await processUpdates(updates);
    }
  } catch (error: any) {
    if (error.message && error.message.includes('409')) {
      console.log('Another bot instance is running, waiting before retry...');
      // wait before retrying when there's a conflict
      await new Promise(resolve => setTimeout(resolve, 5000));
    } else {
      console.error('Error polling updates:', error);
      // wait a bit before retrying on other errors
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

async function startLongPolling() {
  console.log('Starting long polling for updates...');
  while (true) {
    await longPollUpdates();
  }
}

async function main() {
  try {
    console.log('Starting Telegram bot with long polling...');

    console.log('Getting bot info...');
    const botInfo = await getMe();
    console.log('Bot info:', botInfo);
    
    await startLongPolling();

  } catch (error) {
    console.error('Error in main:', error);
  }
}

main().catch(console.error);
