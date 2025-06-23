# Bot Service

A LangChain-powered service that parses expense text and categorizes products into predefined categories.

## Features

- Parses text like "Pants 30 bucks" or "Cookie 5 bucks"
- Extracts product name, amount, category and roasts the user for some fun!
- Uses OpenAI GPT-3.5-turbo for intelligent categorization
- Categorizes into: Housing, Transportation, Food, Utilities, Insurance, Medical/Healthcare, Savings, Debt, Education, Entertainment, Other

## Main requirements

- Python >=3.11

- OpenAI API key

### Nice to have

- uv for management

# Setup

I recommend just following the root dir README.md! And if you decide to follow each separately, you should follow the connector-service first!

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

By this point the docker process should be running, the container must have the DB and its schema.

The Python parser service, cd into the service folder if you are still in the root dir:

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
