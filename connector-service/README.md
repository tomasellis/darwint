# Telegram Bot Service

A Node.js service that polls the Telegram API for bot updates, processes messages, and stores them in PostgreSQL with a queue system.

## Features

- Polls Telegram API every second for new messages
- Processes the messages and adds them if they don't exist in our DB
- Stores processed messages in PostgreSQL database
- Implements a queue system for message processing
- Polls the database queue every for pending messages
- At minimum one reply to the user

## Prerequisites

- Node.js LTS
- PostgreSQL database
- Docker
- Telegram Bot Token (get one from [@BotFather](https://t.me/botfather))

I recommend following the setup from the root dir. If you don't start here:

Create a .env inside /darwint:

.env:

```bash
TELEGRAM_API_BASE_URL='https://api.telegram.org/bot'
TELEGRAM_BOT_TOKEN=******************
OPENAI_API_KEY=**********************

POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=darwint
POSTGRES_PORT=5432
POSTGRES_HOST=localhost

NODE_ENV=development
```

You must have a Postgresql database running.
============================================

We'll be using a PostgreSQL database.

After setting up the .env, with the Docker desktop running or Docker service running in the background. Run:

```bash
docker-compose up -d
```

Finally the services, run the Node bridge service:

```bash
cd connector-service
```

```bash
npm install
```

Then we setup our Database:

```bash
npm run drizzle:push
```

and the service:

```bash
npm run dev
```

It should start, get the bot's data and go to sleep:

```bash
sleeping...
sleeping...
sleeping...
```

Whitelist Test

Once you have the bot up and running. You can easily add a telegram id to the database using:

```bash
npm run whitelist:add
```

It'll ask for the ID then. You should see yours logged in your NODE service whenever you send a message to the bot. In the form of **message.from.id** !

To test if you are whitelisted, just add your ID and send a message.

To test if you are blacklisted, just add whatever number and try sending a message.

And you can clear the table with:

```bash
npm run whitelist:clear
```
