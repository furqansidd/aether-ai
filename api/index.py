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
    You are an advanced Data Science Agent for "Aether AI". A pandas dataframe is ALREADY loaded in your python environment as the variable `df`.
    Do NOT ask the user to upload a file. Always use your python tools to interact with the `df` variable.

    INTELLIGENCE LAYER:
    Before generating a chart, analyze which format is best:
    - If there are too many categories for a Pie chart, use a Bar chart instead.
    - Use Scatter Plots for showing correlations (e.g., Age vs Fare).
    - Use Line Charts for showing trends over continuous variables (e.g., Time or Age).
    - Use Box Plots for showing distributions and outliers.
    - Use Histograms for showing the frequency distribution of a single variable.
    - Use Heatmaps for showing correlation matrices between numerical variables.

    CRITICAL INSTRUCTION FOR CHARTS (PREVENTING TIMEOUTS):
    1. If plotting RAW DATA (e.g. thousands of rows for a Scatter Plot), DO NOT output raw data arrays. Instead, output `x_column` and `y_column` so the backend can inject the data.
    2. If plotting AGGREGATED/CALCULATED DATA (e.g. GroupBy results, Survival Rates by Age, Counts), you MUST use your python tool to calculate the exact arrays and output them as `x_data` and `y_data` in the JSON.
    
    If the user asks for a chart, plot, or heatmap, you MUST output this JSON block.

    Use the following format at the very end of your response exactly as shown:
    ```json
    {
      "chart": {
        "type": "heatmap",
        // FOR RAW DATA PLOTS:
        "x_column": "Age",
        "y_column": "Fare",
        "color_column": "Survived",
        // OR, FOR AGGREGATED DATA PLOTS:
        "x_data": [1, 2, 3],
        "y_data": [0.5, 0.6, 0.7],
        
        "layout": {
          "title": "Chart Title",
          "xaxis": { "title": "X-Axis Label" },
          "yaxis": { "title": "Y-Axis Label" },
          "showlegend": true
        }
      }
    }
    ```
    - `type` must be one of: 'scatter', 'bar', 'pie', 'box', 'histogram', 'heatmap', 'line'.
    - `x_column` and `y_column` must be exact column names from the dataframe. Use `null` if not applicable.
    - `color_column` is optional. Use `null` if not needed.
    - `x_data` and `y_data` should ONLY be used for aggregated metrics that don't exist as columns.
    
    CONTEXTUAL CLARITY RULES:
    1. Every chart MUST include an X-axis label and a Y-axis label in the `layout`.
    2. You MUST explicitly enable legends by setting `"showlegend": true` in the `layout`.

    NARRATIVE RULE:
    After showing a chart, explain one "strange" or "unexpected" finding in the data.

    Do NOT output python plotting code. Only output the JSON.
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
        agent_type="openai-tools",
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
        if supabase is None:
            raise Exception("Supabase client is None (Initialization failed)")
            
        # Verify the token with Supabase
        user_res = supabase.auth.get_user(token)
        if not user_res or not user_res.user:
            print("DEBUG: Token validation failed: No user returned")
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        print(f"DEBUG: Token validated for user: {user_res.user.id}")
        return user_res.user
    except Exception as e:
        print(f"DEBUG: Auth error: {e}")
        # Return the actual error message so the user can see what failed
        raise HTTPException(status_code=401, detail=f"Auth Error: {str(e)}")

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
        clean_text, chart_config = parse_agent_response(answer_text)

        # 7. Hydrate the chart data using the backend dataframe
        chart_data = None
        if chart_config:
            try:
                chart_type = chart_config.get("type", "scatter")
                x_col = chart_config.get("x_column")
                y_col = chart_config.get("y_column")
                x_data = chart_config.get("x_data")
                y_data = chart_config.get("y_data")
                color_col = chart_config.get("color_column")
                
                traces = []
                
                # Helper to clean NaN values for JSON serialization
                def clean_series(series):
                    return series.fillna("").tolist()
                
                if chart_type == "heatmap":
                    # Calculate correlation matrix for numeric columns
                    numeric_df = df.select_dtypes(include=['number'])
                    corr = numeric_df.corr()
                    # Replace NaN in correlation matrix with None/empty string for JSON
                    corr = corr.fillna("")
                    trace = {
                        "type": "heatmap",
                        "x": corr.columns.tolist(),
                        "y": corr.columns.tolist(),
                        "z": corr.values.tolist(),
                        "colorscale": "Viridis"
                    }
                    traces.append(trace)
                elif x_data is not None and y_data is not None:
                    # AI provided exact data arrays (for aggregated metrics)
                    trace = {"type": chart_type, "x": x_data, "y": y_data}
                    if chart_type == "scatter":
                        trace["mode"] = "markers"
                    elif chart_type == "line":
                        trace["type"] = "scatter"
                        trace["mode"] = "lines"
                    elif chart_type == "pie":
                        trace["labels"] = trace.pop("x", [])
                        trace["values"] = trace.pop("y", [])
                    traces.append(trace)
                elif color_col and color_col in df.columns:
                    for name, group in df.groupby(color_col):
                        trace = {"type": chart_type, "name": str(name)}
                        if x_col and x_col in group.columns:
                            trace["x"] = clean_series(group[x_col])
                        if y_col and y_col in group.columns:
                            trace["y"] = clean_series(group[y_col])
                        
                        if chart_type == "scatter":
                            trace["mode"] = "markers"
                        elif chart_type == "line":
                            trace["type"] = "scatter"
                            trace["mode"] = "lines"
                        elif chart_type == "pie":
                            trace["labels"] = trace.pop("x", [])
                            trace["values"] = trace.pop("y", [])
                            
                        traces.append(trace)
                else:
                    trace = {"type": chart_type}
                    if x_col and x_col in df.columns:
                        trace["x"] = clean_series(df[x_col])
                    if y_col and y_col in df.columns:
                        trace["y"] = clean_series(df[y_col])
                        
                    if chart_type == "scatter":
                        trace["mode"] = "markers"
                    elif chart_type == "line":
                        trace["type"] = "scatter"
                        trace["mode"] = "lines"
                    elif chart_type == "pie":
                        trace["labels"] = trace.pop("x", [])
                        trace["values"] = trace.pop("y", [])
                        
                    traces.append(trace)
                
                chart_data = {
                    "data": traces,
                    "layout": chart_config.get("layout", {})
                }
            except Exception as e:
                print(f"DEBUG: Failed to build chart data: {e}")
                chart_data = None

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
