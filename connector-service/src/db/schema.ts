import { pgTable, serial, text, integer, timestamp, pgEnum, jsonb, index } from 'drizzle-orm/pg-core';
import { customType } from 'drizzle-orm/pg-core';

// custom money type for PostgreSQL
export const money = customType<{
	data: string;
	driverData: string;
}>({
	dataType() {
		return 'money';
	},
});

export const whitelist = pgTable('whitelist', {
	id: serial('id').primaryKey(),
	telegramId: integer('telegram_id').unique().notNull(),
});

export const users = pgTable('users', {
	id: serial('id').primaryKey(),
	telegramId: integer('telegram_id').unique().notNull(),
});

export const expenses = pgTable('expenses', {
	id: serial('id').primaryKey(),
	userId: integer('user_id').notNull().references(() => users.id),
	description: text('description').notNull(),
	amount: money('amount').notNull(),
	category: text('category').notNull(),
	telegramMessageId: integer('telegram_message_id').notNull(),
	addedAt: timestamp('added_at').notNull(),
}, (t) => [
	index('user_expenses_idx').on(t.userId.asc(), t.addedAt.asc()),
]);

export const messageStatusEnum = pgEnum('message_status', ['pending', 'sent', 'failed', 'parsed']);

export const messagesQueue = pgTable('messages_queue', {
	id: serial('id').primaryKey(),
	userId: integer('user_id').notNull().references(() => users.id),
	chatId: integer('chat_id').notNull(),
	telegramMessageId: integer('telegram_message_id').notNull(),
	payload: jsonb('payload').notNull(),
	status: messageStatusEnum('status').notNull().default('pending'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	processedAt: timestamp('processed_at'),
}, (t) => [
	index('message_status_idx').on(t.status.desc(), t.createdAt.asc()),
]);

export const telegramUpdates = pgTable('telegram_updates', {
	id: serial('id').primaryKey(),
	telegramUpdateId: integer('telegram_update_id').notNull(),
	createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
export type MessageQueue = typeof messagesQueue.$inferSelect;
export type NewMessageQueue = typeof messagesQueue.$inferInsert;
export type TelegramUpdate = typeof telegramUpdates.$inferSelect;
export type NewTelegramUpdate = typeof telegramUpdates.$inferInsert;
export type Whitelist = typeof whitelist.$inferSelect;
export type NewWhitelist = typeof whitelist.$inferInsert; 