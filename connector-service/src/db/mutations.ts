import { db } from './db.js';
import { expenses, messagesQueue, telegramUpdates, users } from './schema.js';
import { eq } from 'drizzle-orm';

export async function deleteExpenseByTelegramMessageIdMutation(messageId: number) {
	return db
		.delete(expenses)
		.where(eq(expenses.telegramMessageId, messageId))
		.returning();
}

export async function deleteMessageFromQueueMutation(messageId: number) {
	return db
		.delete(messagesQueue)
		.where(eq(messagesQueue.telegramMessageId, messageId))
		.returning();
}

export async function setLastTelegramUpdateIdMutation(updateId: number): Promise<void> {
	await db.transaction(async (tx) => {
		const existingRecord = await tx
			.select({ id: telegramUpdates.id })
			.from(telegramUpdates)
			.limit(1);
		if (existingRecord.length > 0) {
			await tx
				.update(telegramUpdates)
				.set({ telegramUpdateId: updateId })
				.where(eq(telegramUpdates.id, existingRecord[0].id));
		} else {
			await tx.insert(telegramUpdates).values({ telegramUpdateId: updateId });
		}
	});
}

export async function insertUserMutation(telegramId: number) {
	return db.insert(users).values({ telegramId }).returning();
}

export async function insertMessageToQueueMutation(userId: number, chatId: number, message: string, telegramMessageId: number) {
	return db.insert(messagesQueue).values({
		userId: userId,
		chatId: chatId,
		telegramMessageId,
		payload: { message },
		status: 'pending'
	});
}

export async function updateMessageQueueStatusMutation(id: number, status: 'pending' | 'sent' | 'failed' | 'parsed') {
	return db
		.update(messagesQueue)
		.set({ status })
		.where(eq(messagesQueue.id, id));
}
