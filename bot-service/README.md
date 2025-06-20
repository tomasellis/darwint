# Bot Service

A LangChain-powered service that parses expense text and categorizes products into predefined categories.

## Features

- Parses text like "Pants 30 bucks" or "Cookie 5 bucks"
- Extracts product name, amount, and category
- Uses OpenAI GPT-3.5-turbo for intelligent categorization
- Fallback parser for simple cases
- Categorizes into: Housing, Transportation, Food, Utilities, Insurance, Medical/Healthcare, Savings, Debt, Education, Entertainment, Other