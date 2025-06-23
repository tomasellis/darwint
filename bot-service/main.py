# bot-service/main.py

import os
import time
import psycopg2
from dotenv import load_dotenv
from parser import ExpenseParser
import json


load_dotenv()

DB_PARAMS = {
    "dbname": os.getenv("POSTGRES_DB"),
    "user": os.getenv("POSTGRES_USER"),
    "password": os.getenv("POSTGRES_PASSWORD"),
    "host": os.getenv("POSTGRES_HOST"),
    "port": os.getenv("POSTGRES_PORT"),
}

# Ensure all DB params are set
missing = [k for k, v in DB_PARAMS.items() if v is None]
if missing:
    raise RuntimeError(f"Missing required DB environment variables: {', '.join(missing)}")

LISTEN_CHANNEL = "messages_queue_broadcast_new"
PARSED_CHANNEL = "messages_queue_broadcast_parsed"

expense_parser = ExpenseParser()

def main():
    print("Polling messages_queue for new messages...")
    while True:
        process_next_message()

def process_next_message():
    with psycopg2.connect(**DB_PARAMS) as conn2:  # type: ignore
        with conn2.cursor() as cur2:
            cur2.execute("""
                SELECT id, user_id, payload, telegram_message_id FROM messages_queue
                WHERE status = 'pending'
                ORDER BY created_at
                LIMIT 1;
            """)
            row = cur2.fetchone()
            if row:
                msg_id, user_id, payload, telegram_message_id = row
                # If payload is a string, decode it
                if isinstance(payload, str):
                    payload = json.loads(payload)
                print(f"📨 Got message: id={msg_id}, user_id={user_id}, message={payload['message']}")
                try:
                    parsed_expense = expense_parser.parse_expense(payload['message'])
                    print(f"🔍 Parsed expense: {parsed_expense.product_name}, ${parsed_expense.amount}, {parsed_expense.category}, {parsed_expense.roast}")

                    if (
                        (parsed_expense.product_name is None
                        or parsed_expense.amount is None
                        or parsed_expense.category is None
                        or parsed_expense.roast is None)
                    ):
                        cur2.execute("DELETE FROM messages_queue WHERE id = %s", (msg_id,))
                        print(f"🗑️ Message {msg_id} removed from messages_queue (not an expense)")
                    else:
                        cur2.execute("""
                            INSERT INTO expenses (user_id, description, amount, category, telegram_message_id, added_at)
                            VALUES (%s, %s, %s, %s, %s, NOW())
                        """, (user_id, parsed_expense.product_name, parsed_expense.amount, parsed_expense.category, telegram_message_id))
                        print(f"✅ Expense added to database for user {user_id}")
                        cur2.execute(
                            """
                            UPDATE messages_queue
                            SET status = 'parsed', processed_at = NOW(), payload = %s
                            WHERE id = %s
                            """,
                            (json.dumps({"category": parsed_expense.category, "amount":parsed_expense.amount, "description": parsed_expense.product_name, "roast": parsed_expense.roast}), msg_id)
                        )
                        print(f"✅ Message {msg_id} marked as 'parsed'")
                except Exception as e:
                    print(f"❌ Error parsing expense: {e}")
            else:
                print("sleeping...")
                time.sleep(1)

if __name__ == "__main__":
    main()