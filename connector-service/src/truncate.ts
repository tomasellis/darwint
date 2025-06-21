import { pool } from './db.js';


async function truncateTable(tableName: string) {
  if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
    throw new Error('Invalid table name.');
  }
  try {
    const res = await pool.query(`TRUNCATE TABLE ${tableName} RESTART IDENTITY CASCADE;`);
    console.log({res})
    console.log(`Table '${tableName}' truncated successfully.`);
  } catch (err) {
    console.error(`Failed to truncate table '${tableName}':`, err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

const tableName = process.argv[2];
if (!tableName) {
  console.error('Usage: tsx src/truncate.ts <table_name>');
  process.exit(1);
}

truncateTable(tableName); 