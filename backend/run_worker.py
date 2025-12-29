"""
Queue Worker Runner

Run this to start the document processing queue worker.
"""

import sys
import os

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    from dotenv import load_dotenv

    # Load environment variables
    load_dotenv()

    print("=" * 50)
    print("Savant Document Processing Queue Worker")
    print("=" * 50)
    print(f"Supabase URL: {os.getenv('SUPABASE_URL')}")
    print(f"OpenAI API Key: {'✓ Set' if os.getenv('OPENAI_API_KEY') else '✗ Not Set'}")
    print("=" * 50)
    print()

    # Now import and run the worker
    from app.workers.queue_worker import process_queue
    import asyncio

    asyncio.run(process_queue())
