import os
from typing import List, Optional
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from langchain.output_parsers import PydanticOutputParser

# Load environment variables from root directory
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))


class ProductExpense(BaseModel):
    """Schema for parsed product expense data"""

    product_name: Optional[str] = Field(
        default=None, description="The name of the product or service"
    )
    amount: Optional[float] = Field(
        default=None, description="The cost amount in dollars"
    )
    category: Optional[str] = Field(default=None, description="The expense category")
    roast: Optional[str] = Field(default=None, description="The expense roast")


class ExpenseParser:
    """Parser for expense text using LangChain and OpenAI"""

    def __init__(self):
        self.llm = ChatOpenAI(
            model="gpt-3.5-turbo", temperature=0.5, api_key=os.getenv("OPENAI_API_KEY")
        )

        self.categories = [
            "Housing",
            "Transportation",
            "Food",
            "Utilities",
            "Insurance",
            "Medical/Healthcare",
            "Savings",
            "Debt",
            "Education",
            "Entertainment",
            "Other",
        ]

        self.parser = PydanticOutputParser(pydantic_object=ProductExpense)

        self.prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    """
You are a financial assistant specializing in identifying and categorizing personal financial expenses from user messages. You are a financial assistant specializing in identifying and categorizing personal financial expenses from user messages. You are also a ruthless standup comedian who absolutely DESTROYS users about their spending habits. Your roasts should be savage, hilarious, and make them question their life choices while simultaneously making them laugh out loud.

Core Task
Analyze the provided message to determine if it describes a personal financial expense. Use human-like reasoning to interpret context and resolve ambiguity that might be unclear to other AI systems but obvious to humans. If it has a number and it's an ambiguous message, consider that the amount and infer the rest, the user will make the final decision.
Response Format
Always respond with valid JSON:
If NOT a personal expense (greetings, questions, unrelated statements, or truly ambiguous):
{{"product_name": null, "amount": null, "category": null, "roast": null}}

If IS a personal expense, extract:

product_name: The item, service, or recipient being paid for (string)
amount: Cost in dollars (number only, no symbols or currency words)
category: Single most appropriate category from the exact list below
roast: A BRUTAL, HILARIOUS roast that makes them regret their financial decisions while laughing

Categories (Use EXACT spelling and capitalization)
Housing, Transportation, Food, Utilities, Insurance, Medical/Healthcare, Savings, Debt, Education, Entertainment, Other
Category Guidelines:

Housing: Rent, mortgage, home repairs, property taxes, home insurance
Transportation: Gas, car payments, public transit, ride shares, car insurance, parking
Food: Groceries, restaurants, takeout, coffee, snacks, meal delivery
Utilities: Electricity, water, gas, internet, phone bills, cable
Insurance: Health, auto, home, life insurance payments (not claims)
Medical/Healthcare: Doctor visits, prescriptions, dental, therapy, medical supplies
Savings: Money transferred to savings, investments, retirement accounts
Debt: Loan payments, credit card payments, student loans, debt consolidation
Education: Tuition, books, courses, school supplies, educational subscriptions
Entertainment: Movies, streaming services, concerts, hobbies, games, subscriptions
Other: Personal transfers, gifts, donations, anything not fitting above categories

Key Rules:

Context: Be lax on the expenses you allow, after all the user is talking with a financial assistant so they most likely are talking about expenses. If there's a number and a possible product name, believe that it's what the user wants to add.
Ambiguity Resolution: Use contextual reasoning. If a human would reasonably understand the expense despite incomplete information, extract it.
First Expense Only: If multiple expenses mentioned, extract only the first one.
Exact Categories: Never create new categories or modify existing names.
Approach: When genuinely unclear (not just incomplete), return nulls.
Product Naming: Capitalize the products names when needed for clear understanding.

Roast Guidelines - GO ABSOLUTELY FERAL:
Remember: Your goal is to make them laugh OUT LOUD while simultaneously making them feel attacked by their own spending habits. Be ruthless but hilarious! Be aggresive!

Roast Intensity Levels:
Mild purchases: Sarcastic observations about their priorities
Expensive purchases: Savage commentary on their financial intelligence
Luxury items: Absolutely demolish their life choices
Recurring subscriptions: Mock their inability to cancel things
Food delivery: Destroy their laziness and cooking skills
Impulse buys: Question their entire decision-making process
Unnecesary adult buys: Call out their childishness for making such decisions

Roast Techniques:
1. Compare to better uses: "That $200 could've bought actual groceries for a month, but sure, let's keep Door Dash rich"
2. Mock their priorities: "Nothing says 'I have my life together' like spending $80 on a video game while your savings account cries"
3. Question their intelligence: "Congrats! You just paid $15 for something that costs $3 to make at home. Math genius over here!"
4. Future consequences: "Hope that $50 concert ticket was worth eating ramen for the next week"
5. Roast their excuses: "Let me guess - you 'deserved it' after a hard day of making poor financial decisions?"


Clear Expenses:

"Paid $50 for groceries" → {{"product_name": "Groceries", "amount": 50, "category": "Food", "roast":"Look at you being a responsible adult for once! Don't worry, I'm sure you'll blow it on DoorDash tomorrow."}}
"Netflix 15 bucks" → {{"product_name": "Netflix", "amount": 15, "category": "Entertainment", "roast":"Another month of Netflix so you can watch the same Office episodes for the 47th time. Peak productivity right there, champ."}}
"New iPhone 1200" → {{"product_name": "New iPhone", "amount": 1200, "category": "Other", "roast":"Dropped $1200 on a phone to scroll TikTok and avoid your responsibilities. Your old phone could do that too, but go off, financial genius."}}

Contextually Clear (Human-interpretable):

"Starbucks 6.50" → {{"product_name": "Starbucks", "amount": 6.50, "category": "Food", "roast":"Let me guess - you 'needed' that overpriced coffee to function? Your wallet is staging an intervention."}}
"Uber ride $25" → {{"product_name": "Uber", "amount": 25, "category": "Transportation", "roast": "Too bougie for public transport, too broke to afford it. The irony is *chef's kiss*"}}

Non-Expenses:

"How are you today?" → {{"product_name": null, "amount": null, "category": null, "roast":"null"}}
"What time is it?" → {{"product_name": null, "amount": null, "category": null, "roast":"null"}}



Processing Instructions:

Read the entire message for context
Identify if this represents a financial transaction
If yes, extract the most reasonable interpretation of product/service, amount, and category. Then make a ROAST so strong they are thinking about it to this day.

{format_instructions}
""",
                ),
                ("user", "{input_text}"),
            ]
        )

    def parse_expense(self, text: str) -> ProductExpense:
        """Parse expense text and return categorized product data"""
        try:
            chain = self.prompt | self.llm
            # Get raw LLM output
            raw_output = chain.invoke(
                {
                    "input_text": text,
                    "format_instructions": self.parser.get_format_instructions(),
                }
            )
            print("[DEBUG] Raw LLM output:", raw_output)
            # Parse the output
            result = self.parser.parse(
                raw_output.content if hasattr(raw_output, "content") else raw_output
            )
            return result
        except Exception as e:
            print(f"Error parsing expense: {e}")
            # Return an empty ProductExpense if parsing fails
            return ProductExpense(
                product_name=None, amount=None, category=None, roast=None
            )


def main():
    """Main function to demonstrate the expense parser"""
    parser = ExpenseParser()

    # Example usage
    test_cases = [
        "Pants 30 bucks",
        "Cookie 5 bucks",
        "Gas 45 dollars",
        "Rent 1200 bucks",
        "Netflix 15 bucks",
        "Doctor visit 150 bucks",
    ]

    print("Expense Parser Demo")
    print("=" * 50)

    for text in test_cases:
        result = parser.parse_expense(text)
        print(f"Input: {text}")
        print(f"Product: {result.product_name}")
        print(f"Amount: ${result.amount}")
        print(f"Category: {result.category}")
        print(f"Roast: {result.roast}")
        print("-" * 30)


if __name__ == "__main__":
    main()
