import { db } from './db.js';
import { expenses } from './schema.js';

const userId = 1;
const now = new Date();

function daysAgo(n: number) {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  return d;
}

let telegramMsgId = 1000;

const seedExpenses = [
  // Today (daily)
  { description: 'coffee', amount: '$5.00', category: 'Food', addedAt: daysAgo(0) },
  { description: 'lunch', amount: '$12.00', category: 'Food', addedAt: daysAgo(0) },
  { description: 'bus', amount: '$3.00', category: 'Transportation', addedAt: daysAgo(0) },
  // This week (1-6 days ago)
  { description: 'groceries', amount: '$40.00', category: 'Food', addedAt: daysAgo(2) },
  { description: 'uber', amount: '$15.00', category: 'Transportation', addedAt: daysAgo(3) },
  { description: 'movie', amount: '$18.00', category: 'Entertainment', addedAt: daysAgo(5) },
  // This month (7-29 days ago)
  { description: 'gym', amount: '$50.00', category: 'Health', addedAt: daysAgo(10) },
  { description: 'book', amount: '$20.00', category: 'Education', addedAt: daysAgo(15) },
  { description: 'dinner', amount: '$30.00', category: 'Food', addedAt: daysAgo(20) },
  // This year (30-364 days ago)
  { description: 'flight', amount: '$300.00', category: 'Travel', addedAt: daysAgo(40) },
  { description: 'hotel', amount: '$500.00', category: 'Travel', addedAt: daysAgo(100) },
  { description: 'laptop', amount: '$1200.00', category: 'Other', addedAt: daysAgo(200) },
  { description: 'gift', amount: '$60.00', category: 'Other', addedAt: daysAgo(300) },
];

const values = seedExpenses.map((e, i) => ({
  userId: userId,
  description: e.description,
  amount: e.amount,
  category: e.category,
  telegramMessageId: telegramMsgId + i,
  addedAt: e.addedAt,
}));

await db.insert(expenses).values(values);
console.log('Seeded expenses:', values);
