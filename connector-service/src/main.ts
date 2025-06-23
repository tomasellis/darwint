import { getUpdates, sendMessage, getMe, TelegramUpdate, generateInlineKeyboardMarkup, deleteMessage, answerCallbackQuery, TelegramCallbackQuery, generateExpensePieChart, sendPhoto } from './telegramUtils.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Chart, registerables } from 'chart.js';
import { getLastTelegramUpdateIdQuery, getUserByTelegramIdQuery, getExistingMessageInQueueQuery, getExpenseDataForUserQuery, getNextParsedMessageQuery } from './db/queries.js';
import { deleteExpenseByTelegramMessageIdMutation, deleteMessageFromQueueMutation, insertUserMutation, setLastTelegramUpdateIdMutation, insertMessageToQueueMutation, updateMessageQueueStatusMutation } from './db/mutations.js';

let lastUpdateId = 0;

Chart.register(...registerables, ChartDataLabels);

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


async function startLongPolling() {
	console.log('Starting long polling for updates...');

	lastUpdateId = await getLastUpdateIdFromDB();
	console.log(`Initialized lastUpdateId from DB: ${lastUpdateId}`);

	while (true) {
		await longPollUpdates();
	}
}

async function longPollUpdates() {
	try {
		const updates = await getUpdates(lastUpdateId, undefined, 30, []);

		if (updates.length > 0) {
			console.log(`Received ${updates.length} updates`);
			updates.sort((a, b) => a.update_id - b.update_id);
			await processUpdates(updates);

			const maxUpdateId = Math.max(...updates.map(u => u.update_id));
			lastUpdateId = maxUpdateId + 1;

			await updateLastUpdateIdInDB(lastUpdateId);
		}

	} catch (error: any) {
		if (error.message && error.message.includes('409')) {
			console.log('Another bot instance is running, waiting before retry...');
			await new Promise(resolve => setTimeout(resolve, 5000));
		} else {
			console.error('Error polling updates:', error);
			await new Promise(resolve => setTimeout(resolve, 1000));
		}
	}
}

async function processUpdates(updates: TelegramUpdate[]) {
	for (const update of updates) {
		console.log('Processing update:', update);

		if (update.message && update.message.text) {
			// Handle /start
			if (update.message.text.trim() === '/start') {
				await sendMessage(
					update.message.chat.id,
					"👋 Welcome! This is your personal expense tracker bot. Send me an expense in natural language (e.g., 'Lunch 12 USD food'), and I'll add it for you!",
					undefined,
					undefined,
					"Markdown"
				);
				await setLastTelegramUpdateIdMutation(update.update_id)
				continue;
			}

			// Handle /report
			if (update.message.text.trim() === '/report') {
				await sendMessage(
					update.message.chat.id,
					'Please select a timeframe for your report:',
					undefined,
					{
						inline_keyboard: [
							[{ text: 'Daily', callback_data: 'report_daily' }],
							[{ text: 'Weekly', callback_data: 'report_weekly' }],
							[{ text: 'Monthly', callback_data: 'report_monthly' }],
							[{ text: 'Yearly', callback_data: 'report_yearly' }]
						]
					},
					'Markdown'
				);
				await setLastTelegramUpdateIdMutation(update.update_id)
				continue;
			}

			// handle any other text
			if (update.message.from?.id && update.message.text) {
				console.log('Received message:', update);
				await addMessageToQueue(
					update.message.from.id,
					update.message.chat.id,
					update.message.text,
					update.message.message_id
				);
				await setLastTelegramUpdateIdMutation(update.update_id)
				continue;
			}
		}

		// Handle callback
		if (update.callback_query) {
			console.log('Received callback query:', update.callback_query);
			await handleCallbackQuery(update.callback_query);
		}

	}
}


async function addMessageToQueue(telegramId: number, chatId: number, message: string, telegramMessageId: number) {
	try {
		let user = await getUserByTelegramIdQuery(telegramId);

		if (user.length === 0) {
			const newUser = await insertUserMutation(telegramId);
			user = newUser;
		}

		const existingMessage = await getExistingMessageInQueueQuery(user[0].id, telegramMessageId);

		if (existingMessage.length > 0) {
			console.log(`Message already exists in queue for user ${telegramId}, message ID ${telegramMessageId}`);
			return;
		}

		await insertMessageToQueueMutation(user[0].id, chatId, message, telegramMessageId);

		console.log(`Message queued for user ${telegramId} in chat ${chatId}: ${message}`);
	} catch (error) {
		console.error('Error inserting message to queue:', error);
	}
}

async function startParsedMessageListener() {
	console.log('Starting polling for parsed messages in messages_queue...');

	while (true) {
		try {
			const result = await getNextParsedMessageQuery();
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
			{ text: "❌", callback_data: 'remove' }
		])


		await sendMessage(chatId, responseMessage, telegramMessageId, inlineKeyboard, "Markdown");
		console.log(`✅ Sent confirmation to user ${telegramId} in chat ${chatId}: ${responseMessage}`);
		await updateMessageQueueStatusMutation(msgId, 'sent');
	} catch (error) {
		console.error('Error handling parsed message:', error);
	}
}

async function handleCallbackQuery(callbackQuery: TelegramCallbackQuery) {
	const { message, data } = callbackQuery;

	if (data && data.startsWith('report_') && message) {
		const timeframe = data.replace('report_', '') as 'daily' | 'weekly' | 'monthly' | 'yearly';

		const { labels, data: chartData } = await getExpenseDataForUserQuery(message.chat.id, timeframe);
		const hasData = labels.length > 0 && chartData.some((v) => v > 0);
		if (!hasData) {
			await sendMessage(
				message.chat.id,
				'No expenses found for this period. Add some expenses to see your report!'
			);
			await answerCallbackQuery(callbackQuery.id, 'No expenses found');
			return;
		}

		const chartBuffer = await generateExpensePieChart(labels, chartData);

		await sendPhoto({
			chat_id: message.chat.id,
			photoBuffer: chartBuffer,
			caption: `Your ${timeframe} expenses by category`,
			parse_mode: 'Markdown',
		});

		await answerCallbackQuery(callbackQuery.id, `Showing ${timeframe} report`);
		return;
	}

	// User pressed X button to remove expense
	if (data === 'remove' && message) {
		await deleteMessageFromQueueMutation(message.message_id);

		if (message.reply_to_message) {
			const deletedExpense = await deleteExpenseByTelegramMessageIdMutation(message.reply_to_message.message_id);
			console.log("\nDeleted: ", deletedExpense);
		}

		await deleteMessage(message.chat.id, message.message_id);
		await answerCallbackQuery(callbackQuery.id, "Expense deleted!");
	}
}


async function getLastUpdateIdFromDB(): Promise<number> {
	try {
		return await getLastTelegramUpdateIdQuery();
	} catch (error) {
		console.error('Error getting last update ID from DB:', error);
		return 1;
	}
}

async function updateLastUpdateIdInDB(updateId: number): Promise<void> {
	try {
		await setLastTelegramUpdateIdMutation(updateId);
		console.log(`✅ Updated last update ID in DB: ${updateId}`);
	} catch (error) {
		console.error('Error updating last update ID in DB:', error);
	}
}


main().catch(console.error);


