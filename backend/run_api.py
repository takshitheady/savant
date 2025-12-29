#!/usr/bin/env python3
"""
API Server Runner

Properly sets up Python path and starts the FastAPI server.
"""

import sys
import os

# Add backend directory to Python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

if __name__ == "__main__":
    import uvicorn
    from dotenv import load_dotenv
    import logging

    # Load environment variables
    load_dotenv()

    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    print("=" * 60)
    print("Savant Backend API Server")
    print("=" * 60)
    print(f"Supabase URL: {os.getenv('SUPABASE_URL')}")
    print(f"OpenAI API Key: {'✓ Set' if os.getenv('OPENAI_API_KEY') else '✗ Not Set'}")
    print("=" * 60)
    print()

    port = int(os.getenv("PORT", 8000))

    # Run with uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )
