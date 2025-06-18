# Telegram Bot Service

A Node.js service that polls the Telegram API for bot updates, processes messages, and stores them in PostgreSQL with a queue system.

## Features

- Polls Telegram API every second for new messages
- Processes messages with configurable filtering logic
- Stores processed messages in PostgreSQL database
- Implements a queue system for message processing
- Polls the database queue every 2 seconds for pending messages
- Graceful shutdown handling
- ESM module support

## Prerequisites

- Node.js LTS
- PostgreSQL database
- Telegram Bot Token (get from [@BotFather](https://t.me/botfather))