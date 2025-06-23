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

#### Hicup:

*While testing the webhooks approach, the response time was weirdly higher than when polling the API. I reverted back to polling as I would need a bit more time to find out why this is happening. It would've been my preferred approach but the response time with polling is good enough although I'm leaving the exactly one message idea behind and sending more than one until I get an OK from the API.*

### Atomic Messages

I'm saving each message from each update atomically as one row in my table, if anything goes wrong and the webhook retries I can be sure that I'm not missing any messages and I'm handling dupes as they come.

## Parsing messages

Finally the parsing service. I decided on building a messages queue in my database to handle the requests in order as they come. I'm using Open AI's services with a not so heavy duty prompt to extract the info out of each message we get. If when we try to parse the messages, Open AI's servers are down, we just keep the messages safe in our queue with a *pending* status, and Telegram will keep sending the webhook. When it comes back up, all *pending* messages are processed and sent back in the response payload of each webhook.

## DB Indexes Addendum

I have two main heavy duty queries, one for the messages queue(where I'm mostly interested in a message's status) and one for the user's report(where my main focus is the user's expenses for a certain window of time). I decided to create an index for each of these queries and speed up look-up.


# Setup

### Requirements

```bash
Python 3.11

Node LTS 22.16.0

NPM 11.4.2

Docker or your own Database URL
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

Feel free to skip this if you have your DB url already.

After setting up the .env, with Docker running in the background. Run:

```bash 
docker-compose up -d
```

Finally the services, the Python parser service:

```bash
cd bot-service
```
```bash
pip install -r requirements.txt
```
```bash
python main.py
```

In another terminal, run the Node bridge service:

```bash
cd connector-service
```
```bash
npm install
```
```bash
npm run dev
```
