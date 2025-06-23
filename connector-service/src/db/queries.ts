import { db } from './db.js';
import { expenses, messagesQueue, telegramUpdates, users, whitelist } from './schema.js';
import { eq, and, gte, sql } from 'drizzle-orm';

export async function getExpenseTotalsByCategoryQuery(userId: number, startDate: Date): Promise<Array<{ category: string; total: number }>> {
	return db
		.select({
			category: expenses.category,
			total: sql<number>`SUM(${expenses.amount}::numeric)`.as('total')
		})
		.from(expenses)
		.where(
			and(
				eq(expenses.userId, userId),
				gte(expenses.addedAt, startDate)
			)
		)
		.groupBy(expenses.category);
}

export async function getLastTelegramUpdateIdQuery(): Promise<number> {
	const result = await db
		.select({ telegramUpdateId: telegramUpdates.telegramUpdateId })
		.from(telegramUpdates)
		.orderBy(telegramUpdates.telegramUpdateId)
		.limit(1);
	if (result.length > 0) {
		return result[0].telegramUpdateId;
	}
	return 1;
}

export async function getUserByTelegramIdQuery(telegramId: number) {
	return db.select().from(users).where(eq(users.telegramId, telegramId)).limit(1);
}

export async function getExistingMessageInQueueQuery(userId: number, telegramMessageId: number) {
	return db
		.select({ id: messagesQueue.id })
		.from(messagesQueue)
		.where(
			and(
				eq(messagesQueue.userId, userId),
				eq(messagesQueue.telegramMessageId, telegramMessageId)
			)
		)
		.limit(1);
}

export async function getExpenseDataForUserQuery(telegramId: number, timeframe: 'daily' | 'weekly' | 'monthly' | 'yearly') {
	const user = await getUserByTelegramIdQuery(telegramId);
	if (!user || user.length === 0) return { labels: [], data: [] };

	const userId = user[0].id;
	const startDate = getStartDateForTimeframe(timeframe);

	const rows = await getExpenseTotalsByCategoryQuery(userId, startDate);

	const labels = rows.map((r) => r.category);
	const data = rows.map((r) => Number(r.total));
	return { labels, data };
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

export async function getNextParsedMessageQuery() {
	return db
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
}

export async function getWhitelistEntriesQuery() {
	return db.select().from(whitelist);
}

export async function isTelegramIdWhitelistedQuery(telegramId: number) {
	return db.select().from(whitelist).where(eq(whitelist.telegramId, telegramId)).limit(1);
}
