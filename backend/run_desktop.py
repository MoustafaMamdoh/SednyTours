import threading
import webbrowser
import time
import uvicorn
import socket
from main import app

def find_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('', 0))
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        return s.getsockname()[1]

def open_browser(port):
    time.sleep(1.5)  # Wait for server to start
    webbrowser.open(f"http://127.0.0.1:{port}")

if __name__ == "__main__":
    # Use a fixed port or find a free one. Fixed 8000 is better since frontend BASE is hardcoded to 8000
    # Wait, the frontend BASE is hardcoded to 8000! So we MUST use 8000.
    port = 8000
    
    print("Starting Sydney Tours application...")
    
    # Start browser in a background thread
    threading.Thread(target=open_browser, args=(port,), daemon=True).start()
    
    # Run server
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="error")
