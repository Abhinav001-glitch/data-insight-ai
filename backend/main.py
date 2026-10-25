import io
import os
import uuid
from pathlib import Path
import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from analyst import analyse, profile_dataframe

app = FastAPI(title="Personal Data Analyst AI")
FRONTEND_URLS = os.getenv(
    "FRONTEND_URLS",
    "http://localhost:5173"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        url.strip()
        for url in FRONTEND_URLS.split(",")
        if url.strip()
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)
datasets = {}
results = {}

MAX_BYTES = 20*1024*1024
MAX_ROWS = 100_000
MAX_COLS = 200
ALLOWED_EXTENSIONS = {'.csv', '.xlsx', '.json'}

def read_dataset(filename, content):
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException( 400, "Upload a CSV, XLSX, or JSON file")
    try:
        if ext == ".csv":
            df = pd.read_csv(io.BytesIO(content))
        elif ext == ".xlsx":
            df = pd.read_excel(io.BytesIO(content))
        else:
            df = pd.read_json(io.BytesIO(content))
    except Exception as exc:
        raise HTTPException(400, f"Could not read the file: {exc}")

    if df.empty:
        raise HTTPException(400, "The dataset is Empty")

    if len(df)>MAX_ROWS or len(df.columns) > MAX_COLS:
        raise HTTPException(413, "Dataset exceeds the rows or column limit")

    df.columns = [str(c) for c in df.columns]
    if not df.columns.is_unique:
        raise HTTPException(400, "Column names must be unique")
    return df

class Question(BaseModel):
    question: str = Field(min_length=1, max_length=10000)

@app.get("/app/health")
def health():
    return {"status": "ok"}

@app.post("/api/upload")
async def upload(file: UploadFile = File(...)):
    content = await file.read(MAX_BYTES+1)
    if len(content)> MAX_BYTES:
        raise HTTPException(status_code=413, detail="Maximum upload size is 20MB")
    df = read_dataset(file.filename or "", content)
    dataset_id = str(uuid.uuid4())
    datasets[dataset_id] = df
    return {
        "dataset_id": dataset_id,
        "filename": file.filename,
        "profile": profile_dataframe(df),
        "preview": df.head(10).to_json(orient = "records", date_format= "iso"),
        "rows": len(df),
        "columns": len(df.columns),
    }

@app.post("/api/analyze/{dataset_id}")
def run_analysis(dataset_id: str, body: Question):
    df = datasets.get(dataset_id)
    if df is None:
        raise HTTPException(404, "Dataset not found. Upload it again.")
    try:
        output = analyse(df, body.question)
        result_id = str(uuid.uuid4())
        results[result_id] = output
        output["result_id"] = result_id
        return output
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(400, f"Analysis failed: {exc}")

@app.get("/api/export/{result_id}")
def export_result(result_id: str):
    output = results.get(result_id)
    if output is None:
        raise HTTPException(404, "Result not found.")
    csv_text = pd.DataFrame(output["preview"]).to_csv(index = False)
    
    from fastapi.responses import StreamingResponse

    return StreamingResponse(iter([csv_text]),
                            media_type="text/csv",
                            headers={"Content-Disposition":'attachment; filename="analysis.csv"'},
                            )