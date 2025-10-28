import sys
from cx_Freeze import setup, Executable

build_exe_options = {
    "packages": ["os", "sys", "requests", "threading", "time", "uvicorn", "fastapi", "pydantic", "pathlib", "llama_cpp"],
    "include_files": [],
    "excludes": ["tkinter"],
}

base = None
if sys.platform == "win32":
    base = None

setup(
    name="microchat",
    version="1.0",
    description="FastAPI microchat backend as EXE",
    options={"build_exe": build_exe_options},
    executables=[Executable("main.py", base=base, target_name="microchat.exe")],
)
