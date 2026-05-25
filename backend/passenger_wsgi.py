"""
Passenger WSGI entry point for Hostinger shared hosting.
Hostinger uses Phusion Passenger to serve Python web apps.
This file adapts FastAPI (ASGI) to work with Passenger (WSGI).
"""
import os
import sys

# Add the app directory to the Python path
app_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, app_dir)

from main import app

# Passenger expects a callable named 'application'
# FastAPI is ASGI, but we need WSGI for Passenger
# We use a2wsgi to bridge ASGI to WSGI
try:
    from a2wsgi import ASGIMiddleware
    application = ASGIMiddleware(app)
except ImportError:
    # Fallback: try using uvicorn's WSGI adapter
    print("WARNING: a2wsgi not found. Install it: pip install a2wsgi")
    application = app
