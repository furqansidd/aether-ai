from langchain_experimental.agents import create_pandas_dataframe_agent
from langchain_openai import ChatOpenAI
import pandas as pd
import os
from dotenv import load_dotenv

load_dotenv()

def get_llm():
    # Using gpt-4o-mini as fallback
    api_key = os.getenv("OPENROUTER_API_KEY")
    return ChatOpenAI(
        model="openai/gpt-4o-mini",
        openai_api_key=api_key,
        openai_api_base="https://openrouter.ai/api/v1",
        temperature=0,
    )

from langchain_core.messages import HumanMessage, AIMessage

def get_pandas_agent(df: pd.DataFrame, chat_history: list = None):
    llm = get_llm()
    
    # Base instructions
    PREFIX = """
    You are an expert Data Analyst AI for "Aether AI". A pandas dataframe is ALREADY loaded in your python environment as the variable `df`.
    Do NOT ask the user to upload a file. Always use your python tools to interact with the `df` variable.
    
    CRITICAL INSTRUCTION FOR CHARTS:
    If the user asks for a chart or visualization, you must output a structured JSON representing the chart configuration for the frontend to render.
    
    Use the following format at the very end of your response exactly as shown:
    ```json
    {
      "chart": {
        "type": "bar",
        "data": [{"name": "A", "value": 10}, {"name": "B", "value": 20}],
        "xKey": "name",
        "yKey": "value"
      }
    }
    ```
    
    Valid types are: 'line', 'bar', 'pie'. 
    Use the python tool to calculate the exact `data` array you need to send. 
    Do NOT output python plotting code (no matplotlib/seaborn). Only output the JSON.
    """
    
    # We pass the history as extra context in the prefix for the pandas agent
    history_str = ""
    if chat_history:
        for msg in chat_history:
            role = "USER" if isinstance(msg, HumanMessage) else "AI"
            history_str += f"{role}: {msg.content}\n"
            
    final_prefix = PREFIX + f"\n\nCONVERSATION LOG FOR CONTEXT:\n{history_str}"
    
    agent = create_pandas_dataframe_agent(
        llm,
        df,
        verbose=True,
        prefix=final_prefix,
        agent_type="tool-calling",
        allow_dangerous_code=True,
        handle_parsing_errors=True
    )
    return agent
