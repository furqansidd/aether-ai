import sys
import os

# Fix for Vercel: ensure the api/ directory is on the Python path
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import pandas as pd
from supabase import create_client, Client
from dotenv import load_dotenv
import tempfile
import json
import re

# ── LangChain imports (merged from agent.py) ────────────────────────────────
from langchain_experimental.agents import create_pandas_dataframe_agent
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage

load_dotenv()

# ── Helper: build LLM ────────────────────────────────────────────────────────
def get_llm():
    api_key = os.getenv("OPENROUTER_API_KEY")
    return ChatOpenAI(
        model="openai/gpt-4o-mini",
        openai_api_key=api_key,
        openai_api_base="https://openrouter.ai/api/v1",
        temperature=0,
    )

# ── Helper: build Pandas agent ───────────────────────────────────────────────
def get_pandas_agent(df: pd.DataFrame, chat_history: list = None):
    llm = get_llm()

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
        handle_parsing_errors=True,
    )
    return agent

# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(title="Aether AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Supabase clients (safe init) ─────────────────────────────────────────────
url: str = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL", "")
key: str = os.getenv("SUPABASE_ANON_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY", "")
service_key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("VITE_SUPABASE_SERVICE_ROLE_KEY", "")

try:
    supabase: Client = create_client(url, key)
except Exception as e:
    print(f"Error initializing Supabase client: {e}")
    supabase = None

try:
    # Use Service Role Key for admin operations if available, fallback to anon key
    admin_supabase: Client = create_client(url, service_key if service_key else key)
    if not service_key:
        print("WARNING: SUPABASE_SERVICE_ROLE_KEY is missing. Admin operations (like listing storage) may fail due to RLS.")
except Exception as e:
    print(f"Error initializing Admin Supabase client: {e}")
    admin_supabase = None

# ── Auth Dependency ─────────────────────────────────────────────────────────
security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    print(f"DEBUG: Validating token: {token[:10]}...")
    try:
        # Verify the token with Supabase
        user_res = supabase.auth.get_user(token)
        if not user_res or not user_res.user:
            print("DEBUG: Token validation failed: No user returned")
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        print(f"DEBUG: Token validated for user: {user_res.user.id}")
        return user_res.user
    except Exception as e:
        print(f"DEBUG: Auth error: {e}")
        raise HTTPException(status_code=401, detail="Could not validate credentials")

# ── Models ────────────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    file_path: str
    message: str
    history: list = []

# ── Helpers ───────────────────────────────────────────────────────────────────
def parse_agent_response(response_text: str):
    """Extracts JSON chart configuration if present in the agent response."""
    chart_data = None
    clean_text = response_text

    match = re.search(r'```json\s*(\{.*?\})\s*```', response_text, re.DOTALL)
    if match:
        try:
            parsed = json.loads(match.group(1))
            if "chart" in parsed:
                chart_data = parsed["chart"]
            clean_text = response_text.replace(match.group(0), "").strip()
        except json.JSONDecodeError:
            pass

    return clean_text, chart_data

# ── Routes ────────────────────────────────────────────────────────────────────
@app.post("/api/chat")
async def chat_with_data(request: ChatRequest, user = Depends(get_current_user)):
    try:
        if supabase is None:
            raise HTTPException(status_code=500, detail="Supabase client not initialized. Check environment variables.")

        # Security Check: Ensure the file_path belongs to the user
        # Expected format: "user_id/filename"
        if not request.file_path.startswith(f"{user.id}/"):
            raise HTTPException(status_code=403, detail="You do not have access to this dataset.")

        # 1. Download file from Supabase
        # Use admin_supabase to ensure we can access the file regardless of RLS,
        # but only after we've verified the path belongs to the user.
        if admin_supabase is None:
             raise HTTPException(status_code=500, detail="Admin Supabase client not initialized.")
             
        res = admin_supabase.storage.from_("datasets").download(request.file_path)

        # 2. Save temporarily and load into pandas
        with tempfile.NamedTemporaryFile(delete=False, suffix=".csv") as tmp:
            tmp.write(res)
            tmp_path = tmp.name

        if request.file_path.endswith(".csv"):
            df = pd.read_csv(tmp_path)
        elif request.file_path.endswith(".xlsx"):
            df = pd.read_excel(tmp_path)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format")

        os.remove(tmp_path)

        # 3. Build chat history objects
        print(f"DEBUG: Received history size: {len(request.history) if request.history else 0}")
        chat_history = []
        if request.history:
            for i, msg in enumerate(request.history):
                # print(f"  [{i}] {msg['role']}: {msg['content'][:50]}...")
                if msg["role"] == "user":
                    chat_history.append(HumanMessage(content=msg["content"]))
                else:
                    chat_history.append(AIMessage(content=msg["content"]))

        # 4. Rewrite query to be standalone if history exists
        standalone_query = request.message
        if chat_history:
            history_text = "\n".join([f"{msg.type}: {msg.content}" for msg in chat_history])
            rewrite_prompt = f"""Given the following conversation history and the user's latest request, rewrite the user's latest request to be a standalone request that contains all necessary context from the history.
            If the latest request is completely unrelated to the history, just return it as is. Do not answer the request, just rewrite it into a single clear instruction.

History:
{history_text}

Latest request: {request.message}
Standalone request:"""
            try:
                llm = get_llm()
                rewrite_response = llm.invoke(rewrite_prompt)
                standalone_query = rewrite_response.content.strip()
                print(f"DEBUG: Rewrote query to: {standalone_query}")
            except Exception as e:
                print(f"DEBUG: Failed to rewrite query: {e}")

        # 5. Create Agent and Invoke
        agent = get_pandas_agent(df, chat_history=chat_history)
        raw_response = agent.invoke({"input": standalone_query})

        # 6. Parse Response
        answer_text = raw_response["output"]
        clean_text, chart_data = parse_agent_response(answer_text)

        return {"response": clean_text, "chart": chart_data}

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/datasets")
async def list_datasets(user = Depends(get_current_user)):
    """List all files in the Supabase 'datasets' storage bucket for the current user."""
    print(f"DEBUG: Listing datasets for user: {user.id}")
    try:
        if admin_supabase is None:
            raise HTTPException(status_code=500, detail="Admin Supabase client not initialized.")

        # List files in the user's specific folder using service role
        user_folder = user.id
        # Note: list() without parameters lists the root. list(path) lists inside.
        res = admin_supabase.storage.from_("datasets").list(user_folder)
        print(f"DEBUG: Supabase list response for {user_folder}: {res}")
        
        files = []
        if res and isinstance(res, list):
            for f in res:
                # Skip placeholder files or folders
                if f.get("name") == ".emptyKeep" or not f.get("id"):
                    continue
                
                # f['name'] is typically just the basename
                full_path = f"{user_folder}/{f['name']}"
                files.append({
                    "name": full_path,
                    "display_name": f["name"],
                    "size": f.get("metadata", {}).get("size", 0),
                    "created_at": f.get("created_at", ""),
                    "updated_at": f.get("updated_at", ""),
                })
        
        files.sort(key=lambda x: x["created_at"], reverse=True)
        return {"datasets": files}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/datasets/{file_path:path}")
async def delete_dataset(file_path: str, user = Depends(get_current_user)):
    """Delete a file from the Supabase 'datasets' storage bucket."""
    print(f"Backend: Received delete request for: {file_path} from user: {user.id}")
    try:
        if admin_supabase is None:
            raise HTTPException(status_code=500, detail="Admin Supabase client not initialized.")

        # Security Check: Ensure the file_path belongs to the user
        if not file_path.startswith(f"{user.id}/"):
            raise HTTPException(status_code=403, detail="You do not have permission to delete this file.")

        res = admin_supabase.storage.from_("datasets").remove([file_path])
        print(f"Backend: Supabase removal response: {res}")

        if not res or len(res) == 0:
            return {"message": f"File {file_path} not found or already deleted", "status": "not_found"}

        return {"message": f"Successfully deleted {file_path}", "status": "deleted"}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
