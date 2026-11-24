import os
import subprocess
import webbrowser
import time
import uvicorn
from threading import Thread

def main():
    print("Starting AlertBridge Unified Server & Frontend...")
    
    def run_uvicorn():
        uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=False)

    server_thread = Thread(target=run_uvicorn, daemon=True)
    server_thread.start()
    
    print("Waiting for FastAPI server to initialize...")
    time.sleep(2)

    frontend_path = os.path.abspath("frontend/index.html")
    file_url = f"file:///{frontend_path.replace(os.sep, '/')}"
    
    print(f"Opening Frontend Dashboard: {file_url}")
    webbrowser.open(file_url)
    
    print("\n[AlertBridge is running!] Press Ctrl+C to stop.\n")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down AlertBridge...")

if __name__ == "__main__":
    main()
