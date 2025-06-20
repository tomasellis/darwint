import { getUpdates, sendMessage, getMe, TelegramUpdate, generateInlineKeyboardMarkup, deleteMessage, answerCallbackQuery, TelegramCallbackQuery, generateExpensePieChart, sendPhoto } from './telegramUtils.js';
import { db, pool} from './db.js';
import { expenses, messagesQueue, users } from './schema.js';
import { eq, and, gte, sql } from 'drizzle-orm';

let lastUpdateId = 0;

async function insertMessageToQueue(telegramId: number, chatId: number, message: string, telegramMessageId: number) {
  try {
    let user = await db.select().from(users).where(eq(users.telegramId, telegramId)).limit(1);
    
    if (user.length === 0) {
      const newUser = await db.insert(users).values({ telegramId }).returning();
      user = newUser;
    }
    
    await db.insert(messagesQueue).values({
      userId: user[0].id,
      chatId: chatId,
      telegramMessageId,
      payload: {message},
      status: 'pending'
    })

    console.log(`Message queued for user ${telegramId} in chat ${chatId}: ${message}`);
  } catch (error) {
    console.error('Error inserting message to queue:', error);
  }
}

async function processUpdates(updates: TelegramUpdate[]) {
  for (const update of updates) {
    console.log('Processing update:', update);
    
    lastUpdateId = Math.max(lastUpdateId, update.update_id);

    if (update.message && update.message.text && update.message.text.trim() === '/start') {
      await sendMessage(
        update.message.chat.id,
        "👋 Welcome! This is your personal expense tracker bot. Send me an expense in natural language (e.g., 'Lunch 12 USD food'), and I'll add it for you!",
        undefined,
        undefined,
        "Markdown"
      );
      continue; // Skip further processing for /start
    }

    if (update.message && update.message.text && update.message.text.trim() === '/report') {
      const { labels, data } = await getExpenseDataForUser(update.message.chat.id, 'daily');
      const chartBuffer = await generateExpensePieChart(labels, data);

      // Inline keyboard for timeframe selection
      // TODO: Add support for inlineKeyboard in sendPhoto (reply_markup)
      // const inlineKeyboard = generateInlineKeyboardMarkup([
      //   { text: 'Daily', callback_data: 'report_daily' as any },
      //   { text: 'Weekly', callback_data: 'report_weekly' as any },
      //   { text: 'Monthly', callback_data: 'report_monthly' as any },
      //   { text: 'Yearly', callback_data: 'report_yearly' as any },
      // ], 2);

      await sendPhoto(
        update.message.chat.id.toString(),
        chartBuffer,
        'Your daily expenses by category'
      );
      continue; 
    }
    
    if (update.message && update.message.from?.id && update.message.text) {
      console.log('Received message:', update);
      await insertMessageToQueue(
        update.message.from.id,
        update.message.chat.id,
        update.message.text,
        update.message.message_id
      );
    }
    
    if (update.callback_query) {
      console.log('Received callback query:', update.callback_query);
      await handleCallbackQuery(update.callback_query);
    }
  }
}

async function longPollUpdates() {
  try {
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

async function handleParsedMessage(message: {
  messageId: number;
  telegramId: number;
  chatId: number;
  payload: any;
  telegramMessageId: number;
}) {
  try {
    const { messageId: msgId, telegramId, chatId, payload, telegramMessageId } = message;

    const responseMessage =
      `\n✅ *Expense added* ✅\n\n` +
      `📝 *Description:* ${payload.description ?? 'N/A'}\n` +
      `💰 *Amount:* ${payload.amount ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(Number(payload.amount)) : 'N/A'}\n` +
      `🗂️ *Category:* ${payload.category}`

    const inlineKeyboard = generateInlineKeyboardMarkup([
      {text: "❌", callback_data: 'remove'}
    ])


    await sendMessage(chatId, responseMessage, telegramMessageId, inlineKeyboard, "Markdown");
    console.log(`✅ Sent confirmation to user ${telegramId} in chat ${chatId}: ${responseMessage}`);
    await db
      .update(messagesQueue)
      .set({ status: 'sent' })
      .where(eq(messagesQueue.id, msgId));
    console.log(`✅ Message ${msgId} status updated to 'sent'`);
  } catch (error) {
    console.error('Error handling parsed message:', error);
  }
}

async function startParsedMessageListener() {
  console.log('Starting polling for parsed messages in messages_queue...');

  while (true) {
    try {
      const result = await db
        .select({
          messageId: messagesQueue.id,
          telegramId: users.telegramId,
          chatId: messagesQueue.chatId,
          payload: messagesQueue.payload,
          telegramMessageId: messagesQueue.telegramMessageId,
        })
        .from(messagesQueue)
        .innerJoin(users, eq(messagesQueue.userId, users.id))
        .where(eq(messagesQueue.status, 'parsed'))
        .orderBy(messagesQueue.createdAt)
        .limit(1);
      if (result.length > 0) {
        const message = result[0];
        console.log(`🔔 Found parsed message to handle:`, message);
        await handleParsedMessage(message);
      }
    } catch (err) {
      console.error('Polling error:', err);
    }
    await new Promise(resolve => {
      console.log('sleeping...')
      setTimeout(resolve, 1000)
    });
  }
}

async function handleCallbackQuery(callbackQuery: TelegramCallbackQuery) {
  const { message, data } = callbackQuery;
  if (data === 'remove' && message) {
    await db.delete(messagesQueue)
      .where(eq(messagesQueue.telegramMessageId, message.message_id));

      if(message.reply_to_message){
        const deletedExpense = await db.delete(expenses).where(eq(expenses.telegramMessageId, message.reply_to_message.message_id)).returning()
        console.log("\nDeleted: ", deletedExpense)
      }

    await deleteMessage(message.chat.id, message.message_id);

    await answerCallbackQuery(callbackQuery.id, "Expense deleted!");
  }
}

function getStartDateForTimeframe(timeframe: 'daily' | 'weekly' | 'monthly' | 'yearly'): Date {
  const now = new Date();
  switch (timeframe) {
    case 'weekly':
      now.setDate(now.getDate() - 7);
      break;
    case 'monthly':
      now.setMonth(now.getMonth() - 1);
      break;
    case 'yearly':
      now.setFullYear(now.getFullYear() - 1);
      break;
    default: // daily
      now.setHours(0, 0, 0, 0);
      break;
  }
  return now;
}

export async function getExpenseDataForUser(telegramId: number, timeframe: 'daily' | 'weekly' | 'monthly' | 'yearly') {
  const user = await db.select().from(users).where(eq(users.telegramId, telegramId)).limit(1);
  if (!user || user.length === 0) return { labels: [], data: [] };

  const userId = user[0].id;
  const startDate = getStartDateForTimeframe(timeframe);

  const rows = await db
    .select({
      category: expenses.category,
      total: sql`SUM(${expenses.amount})`.as('total')
    })
    .from(expenses)
    .where(
      and(
        eq(expenses.userId, userId),
        gte(expenses.addedAt, startDate)
      )
    )
    .groupBy(expenses.category);

  const labels = rows.map(r => r.category);
  const data = rows.map(r => Number(r.total));
  return { labels, data };
}

async function main() {
  try {
    console.log('Starting Telegram bot with parallel services...');

    console.log('Getting bot info...');
    const botInfo = await getMe();
    console.log('Bot info:', botInfo);
    
    await Promise.all([
      startLongPolling(),
      startParsedMessageListener()
    ]);

  } catch (error) {
    console.error('Error in main:', error);
  }
}

main().catch(console.error);
