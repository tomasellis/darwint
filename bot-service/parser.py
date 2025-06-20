import os
from typing import List, Optional
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from langchain.output_parsers import PydanticOutputParser

# Load environment variables from root directory
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

class ProductExpense(BaseModel):
    """Schema for parsed product expense data"""
    product_name: Optional[str] = Field(default=None, description="The name of the product or service")
    amount: Optional[float] = Field(default=None, description="The cost amount in dollars")
    category: Optional[str] = Field(default=None, description="The expense category")

class ExpenseParser:
    """Parser for expense text using LangChain and OpenAI"""
    
    def __init__(self):
        self.llm = ChatOpenAI(
            model="gpt-3.5-turbo",
            temperature=0,
            api_key=os.getenv("OPENAI_API_KEY")
        )
        
        self.categories = [
            "Housing", "Transportation", "Food", "Utilities", 
            "Insurance", "Medical/Healthcare", "Savings", 
            "Debt", "Education", "Entertainment", "Other"
        ]
        
        self.parser = PydanticOutputParser(pydantic_object=ProductExpense)
        
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", """
You are a financial assistant specializing in identifying and categorizing personal financial expenses from user messages.
Core Task
Analyze the provided message to determine if it describes a personal financial expense. Use human-like reasoning to interpret context and resolve ambiguity that might be unclear to other AI systems but obvious to humans.
Response Format
Always respond with valid JSON:
If NOT a personal expense (greetings, questions, unrelated statements, or truly ambiguous):
{{"product_name": null, "amount": null, "category": null}}

If IS a personal expense, extract:

product_name: The item, service, or recipient being paid for (string)
amount: Cost in dollars (number only, no symbols or currency words)
category: Single most appropriate category from the exact list below

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

Context: Check how the currency is being used, check that the currency exists or if it can be infered. Do not allow any other type of expenses.
Ambiguity Resolution: Use contextual reasoning. If a human would reasonably understand the expense despite incomplete information, extract it.
Real Currency Only: Only process actual monetary transactions, not virtual/game currency/fake currency or whatever other type of exchange that isn't monetary. If it's something else than a REAL WORLD currency, return nulls.
First Expense Only: If multiple expenses mentioned, extract only the first one.
Exact Categories: Never create new categories or modify existing names.
Conservative Approach: When genuinely unclear (not just incomplete), return nulls.

Examples:
Clear Expenses:

"Paid $50 for groceries" → {{"product_name": "groceries", "amount": 50, "category": "Food"}}
"Netflix 15 bucks" → {{"product_name": "Netflix", "amount": 15, "category": "Entertainment"}}
"Doctor visit 150" → {{"product_name": "Doctor visit", "amount": 150, "category": "Medical/Healthcare"}}
"Gas $40" → {{"product_name": "gas", "amount": 40, "category": "Transportation"}}

Contextually Clear (Human-interpretable):

"Starbucks 6.50" → {{"product_name": "Starbucks", "amount": 6.50, "category": "Food"}}
"Rent due 1200" → {{"product_name": "rent", "amount": 1200, "category": "Housing"}}
"Sent mom 200" → {{"product_name": "sent to mom", "amount": 200, "category": "Other"}}

Non-Expenses:

"How are you today?" → {{"product_name": null, "amount": null, "category": null}}
"What time is it?" → {{"product_name": null, "amount": null, "category": null}}

Truly Ambiguous:

"Paid $200 for something" → {{"product_name": null, "amount": null, "category": null}}
"Spent money yesterday" → {{"product_name": null, "amount": null, "category": null}}

Fake Expenses:

"300 doritos for car" → {{"product_name": null, "amount": null, "category": null}}
"dog for 3 cheetos" → {{"product_name": null, "amount": null, "category": null}}
"30 doritos for a ride" → {{"product_name": null, "amount": null, "category": null}}
"20 lays for a flight" → {{"product_name": null, "amount": null, "category": null}}

Processing Instructions:

Read the entire message for context
Identify if this represents a real financial transaction
If yes, extract the most reasonable interpretation of product/service, amount, and category

{format_instructions}
"""),
            ("user", "{input_text}")
        ])
    
    def parse_expense(self, text: str) -> ProductExpense:
        """Parse expense text and return categorized product data"""
        try:
            chain = self.prompt | self.llm
            # Get raw LLM output
            raw_output = chain.invoke({
                "input_text": text,
                "format_instructions": self.parser.get_format_instructions()
            })
            print("[DEBUG] Raw LLM output:", raw_output)
            # Parse the output
            result = self.parser.parse(raw_output.content if hasattr(raw_output, 'content') else raw_output)
            return result
        except Exception as e:
            print(f"Error parsing expense: {e}")
            # Return an empty ProductExpense if parsing fails
            return ProductExpense(product_name=None, amount=None, category=None)
    
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
        "Doctor visit 150 bucks"
    ]
    
    print("Expense Parser Demo")
    print("=" * 50)
    
    for text in test_cases:
        result = parser.parse_expense(text)
        print(f"Input: {text}")
        print(f"Product: {result.product_name}")
        print(f"Amount: ${result.amount}")
        print(f"Category: {result.category}")
        print("-" * 30)

if __name__ == "__main__":
    main()
