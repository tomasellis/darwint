<p align="center">
  <img src="https://github.com/user-attachments/assets/f38246c4-49bc-4a29-98c9-37f0867ff792" width="571" alt="image" />
</p>

# Description

[DarwintBot](https://t.me/DarwintBot) is a Telegram bot that uses both a Python and a Node service to keep an account of the user's expenses.

- Features an LLM assisted parser to check if the messages received are expenses or not.
- A command to get back the {daily, weekly, monthly, yearly} total of expenses separated by categories and displayed in a pie chart.
- A whitelist. If the database table *whitelist* has at least one user, then only users in the whitelist can interact with the bot. If it's empty, then every user can interact with the bot. I made this decision to keep the production bot working for everyone and made a few simple scripts to test whitelisting in dev.

There are currently two bots alive. [DarwintBot](https://t.me/DarwintBot) is the production one, it must work without hiccups. There's also [dev-DarwintBot](https://t.me/DevDarwintBot) that may or may not be up and running, which is used for development.

# Using the Bot

After following the setup steps below, the bot must be up and running in dev or you can try it out talking with [DarwintBot](https://t.me/DarwintBot). If you created a dev one, you should be able to message it using whatever name you gave it while talking with [@BotFather](https://telegram.me/BotFather).

The bot has 3 main features:

### Parsing expenses and roasting!

Send it a message like: 10USD in Bananas or 200 lunch and it will reply with the added product. This way the user confirms that the expense was added. These replies also come with an "X" button that can be used to delete said expense if there was a mistake in the parsing. And most important of all, with a 0.2 temperature the bot tries to roast the users expenses!

<p align="center">
  <img width="486" alt="image" src="https://github.com/user-attachments/assets/6f555aa2-5e3b-474a-be2d-83cbf1d1b565" />
</p>

### /report

Is one of the two commands the bot has, the first being **/start** which is just the welcome message. /report comes back with a series of buttons that the user can click to get back a pie chart with their saved expenses(daily, weekly, monthly or yearly).

<p align="center">
  <img width="351" alt="image" src="https://github.com/user-attachments/assets/5457894b-07c1-431a-abb0-3081ca449d0d" />
</p>

# Process

## Exactly One Message

I want to give the users a proper experience and as the bot's only interaction with the user are messages I have to make sure that it works properly, one thing that could happen if I'm not careful is duped replies.

While setting up the bot I found out that the **Telegram API has no idempotency token** for sending the bot’s messages; I want to make sure I send the messages exactly once to the user. Alright, then I went to look for a way to get the bot's messages, this way I could make sure that I had sent the response even if my system were to fail.

The main thing that calls to attention in the Telegram Bot API docs are the **two ways to get updates for the bot**. We have either [long polling(can be short) or webhooks](https://core.telegram.org/bots/faq#how-do-i-get-updates). I couldn't get back the bot's own messages using these methods. It ocurred to me that I could use another bot to forward the messages from the chat to another one, using it as a bridge and there is also *tdlib*, the library for building telegram clients. I had to make a choice, and using the whole client library was way out of scope plus it needed more than the bot token for auth. [Bots are also not allowed to communicate with each other to prevent loops as per the docs.](https://core.telegram.org/bots/faq#why-doesn-39t-my-bot-see-messages-from-other-bots)

Then, the choice was between long polling and webhooks.

#### Long polling:

I have no way of knowing if the bot's response to a message was received by the user, say the server crashes after the SEND message request was fired, I can't know if the user received the message or not. The choices I have in this situation are to send at most one message(risking missing a reply) or to send them until I get an OK response(risking more than one reply to the user on the same message) after my request to the Telegram API. Let's put that on hold.

#### Webhooks:

[With webhooks I can let Telegram's server handle the SEND message request.](https://core.telegram.org/bots/faq#how-can-i-make-requests-in-response-to-updates) After I receive a webhook, I can send a response with a payload including the message response from the bot. Then I only have to worry about getting dupes in my backend. If anything happens midway through Telegram's webhook request, Telegram retries it. I only have to check if I have already parsed the message, if I haven't, I parse it and send it back as a response. If I do have it, I send back the parsed payload. Telegram handles the rest and this way I'm sending only one message to the user.

#### Hiccup:

*While testing the webhooks approach, the response time was weirdly higher than when polling the API. I reverted back to polling as I would need a bit more time to find out why this is happening. It would've been my preferred approach but the response time with polling is good enough although I'm leaving the exactly one message idea behind and sending more than one until I get an OK from the API.*

### Atomic Messages

I'm saving each message from each update atomically as one row in my table, if anything goes wrong and the webhook retries I can be sure that I'm not missing any messages and I'm handling dupes as they come. This still works for the polling method as we get an array of updates on each polling run. If we don't acknowledge the update_id + 1 to Telegram, we'll get back the same poll of Updates. Then we compare with our DB, add the ones we don't have and ignore the others. After everything is saved, we acknowledge this update_id by requestingn update_id + 1.

## Parsing messages

Finally the parsing service. I decided on building a messages queue in my database to handle the requests in order as they come. I'm using Open AI's services with a not so heavy duty prompt to extract the info out of each message we get. If when we try to parse the messages, Open AI's servers are down, we just keep the messages safe in our queue with a *pending* status. When it comes back up, all *pending* messages are processed and sent back to the users with a reply.

## DB Indexes Addendum

I have two main heavy duty queries, one for the messages queue(where I'm mostly interested in a message's status) and one for the user's report(where my main focus is the user's expenses for a certain window of time). I decided to create an index for each of these queries and speed up look-up.

# Setup

### Requirements

```bash
Python 3.11.11

Node LTS 22.16.0

NPM 11.4.2

Docker
```

Clone the repo:

```bash
git clone https://github.com/tomasellis/darwint.git
```

```bash
cd darwint
```

There's a directory for each service. You need to run each one separately. Both of them use the same .env that should be placed in the root folder.

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

The Python parser service, must be run in another terminal:

```bash
cd bot-service
```

If you are an **uv user**, run:

```bash
uv sync
```

Then feel free to activate that .venv/bin/activate or just use ``uv run python main.py`` to use the same Python version I developed with.

```bash
uv run python main.py
```

or the classic Python way:

```bash
python -m venv venv
```

```bash
source venv/bin/activate  # or .\venv\Scripts\activate on windows
```

```bash
pip install -r requirements.txt
```

```bash
python main.py
```

It should also start, and then sleep in wait:

```bash
Polling messages_queue for new messages...
sleeping...
sleeping...
sleeping...
```

# Whitelist Test

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
