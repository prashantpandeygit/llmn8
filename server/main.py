from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from pathlib import Path
import os
import requests
import uvicorn
import threading
import time
import sys

def fix_llama_lib_path():
    try:
        import llama_cpp
        llama_dir = Path(getattr(sys, "_MEIPASS", os.path.dirname(llama_cpp.__file__))) / "lib"
        if llama_dir.exists():
            os.add_dll_directory(str(llama_dir))
            print(f"[INFO] Added llama_cpp DLL directory: {llama_dir}")
        else:
            print(f"[WARN] llama_cpp/lib folder not found at: {llama_dir}")
    except Exception as e:
        print(f"[ERROR] Failed to add llama_cpp DLL path: {e}")

fix_llama_lib_path()

from llama_cpp import Llama

MODEL_FILENAME = "Llama-3.2-3B-Instruct-Q4_0.gguf"
MODEL_URL = (
    "https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_0.gguf"
)

def get_model_path():
    if os.name == 'nt':
        base_dir = Path(os.getenv('APPDATA')) / 'microchat'
    elif os.name == 'posix':
        try:
            if os.uname().sysname == 'Darwin':
                base_dir = Path.home() / 'Library' / 'Application Support' / 'microchat'
            else:
                base_dir = Path.home() / '.local' / 'share' / 'microchat'
        except AttributeError:
            base_dir = Path.home() / '.microchat'
    else:
        base_dir = Path.home() / '.microchat'

    models_dir = base_dir / 'models'
    models_dir.mkdir(parents=True, exist_ok=True)
    return models_dir / MODEL_FILENAME


MODEL_PATH = get_model_path()
model = None
model_loaded = False

print(f"Model path: {MODEL_PATH}")
if MODEL_PATH.exists():
    print(f"Model found! Size: {MODEL_PATH.stat().st_size / (1024**3):.2f} GB")
else:
    print("Model not found - user needs to download")

app = FastAPI(title="microchat")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class GenerateRequest(BaseModel):
    prompt: str
    max_tokens: int = 256
    temperature: float = 0.7

@app.get("/")
async def root():
    return {"status": "online", "model_loaded": model_loaded}


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "model_loaded": model_loaded,
        "model_exists": MODEL_PATH.exists(),
        "model_path": str(MODEL_PATH)
    }


@app.api_route("/load-model", methods=["GET", "POST"])
async def load_model():
    global model, model_loaded

    if model_loaded:
        return {"success": True, "message": "Model already loaded"}

    if not MODEL_PATH.exists():
        raise HTTPException(404, "Model not found. Please download it first")

    try:
        print(f"Loading model from {MODEL_PATH}...")
        model = Llama(
            model_path=str(MODEL_PATH),
            n_ctx=4096,
            n_threads=4,
            n_gpu_layers=0
        )
        model_loaded = True
        print("Model loaded successfully!")
        return {"success": True, "message": "Model loaded"}
    except Exception as e:
        raise HTTPException(500, str(e))


@app.api_route("/generate", methods=["GET", "POST"])
async def generate(req: GenerateRequest):
    if not model_loaded:
        raise HTTPException(400, "Model not loaded. Call /load-model first")

    try:
        formatted_prompt = (
            "<|system|>\nrespond as per questions.\n"
            f"<|user|>\n{req.prompt}\n"
            "<|assistant|>"
        )

        result = model(
            formatted_prompt,
            max_tokens=req.max_tokens,
            temperature=req.temperature,
            stop=["<|user|>", "<|system|>", "</s>"],
            echo=False
        )

        response_text = result['choices'][0]['text'].strip()

        if not response_text or len(response_text) < 2:
            response_text = "No clear response from model, try rephrasing your prompt."

        return {"success": True, "response": response_text}

    except Exception as e:
        raise HTTPException(500, str(e))


@app.get("/model-status")
async def model_status():
    return {
        "exists": MODEL_PATH.exists(),
        "loaded": model_loaded,
        "path": str(MODEL_PATH),
        "size_mb": round(MODEL_PATH.stat().st_size / 1024 / 1024, 2)
        if MODEL_PATH.exists() else 0
    }


@app.get("/download-model")
async def download_model():
    if MODEL_PATH.exists():
        def already_exists():
            yield "data: 100\n\n"
        return StreamingResponse(already_exists(), media_type="text/event-stream")

    def download_with_progress():
        try:
            print(f"Starting download from {MODEL_URL}")
            with requests.get(MODEL_URL, stream=True, timeout=300) as response:
                response.raise_for_status()
                total = int(response.headers.get('content-length', 0))
                downloaded = 0

                with open(MODEL_PATH, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        if chunk:
                            f.write(chunk)
                            downloaded += len(chunk)
                            if total > 0:
                                progress = int((downloaded / total) * 100)
                                yield f"data: {progress}\n\n"
                                print(f"Download progress: {progress}%")

                yield "data: 100\n\n"
                print(f"Download complete: {MODEL_PATH}")

        except Exception as e:
            print(f"Download error: {e}")
            if MODEL_PATH.exists():
                MODEL_PATH.unlink()
            yield f"data: error|{str(e)}\n\n"

    return StreamingResponse(download_with_progress(), media_type="text/event-stream")


if __name__ == "__main__":
    def run_server():
        uvicorn.run(app, host="0.0.0.0", port=55440)

    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()

    print("Backend started at http://0.0.0.0:55440")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("Backend stopped.")