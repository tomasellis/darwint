import { pgTable, serial, text, integer, timestamp, pgEnum } from 'drizzle-orm/pg-core';
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

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  telegramId: text('telegram_id').unique().notNull(),
});

export const expenses = pgTable('expenses', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  description: text('description').notNull(),
  amount: money('amount').notNull(),
  category: text('category').notNull(),
  addedAt: timestamp('added_at').notNull(),
});

export const messagesQueue = pgTable('messages_queue', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  message: text('message').notNull(),
  status: text('status').notNull().default('pending'), // pending, sent, failed
  createdAt: timestamp('created_at').notNull().defaultNow(),
  processedAt: timestamp('processed_at'),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
export type MessageQueue = typeof messagesQueue.$inferSelect;
export type NewMessageQueue = typeof messagesQueue.$inferInsert; 