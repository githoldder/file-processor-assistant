#!/usr/bin/env python3
import os

os.environ["DYLD_LIBRARY_PATH"] = (
    "/opt/homebrew/Cellar/cairo/1.18.4/lib:" + os.environ.get("DYLD_LIBRARY_PATH", "")
)
os.environ["CAIRO_HEADERS"] = "/opt/homebrew/Cellar/cairo/1.18.4/include"

import uvicorn

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
