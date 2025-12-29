"""
Queue Worker for Document Processing

Continuously polls the pgmq queue for new document processing jobs.
"""

import asyncio
from app.services.document_processor import DocumentProcessor
from supabase import create_client
import os
import sys


async def process_queue():
    """Background worker to process document queue"""
    print("[QueueWorker] Starting document processing queue worker...")
    print(f"[QueueWorker] Supabase URL: {os.getenv('SUPABASE_URL')}")
    print(f"[QueueWorker] Polling queue 'document_processing'...")

    supabase = create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    )
    processor = DocumentProcessor()

    consecutive_errors = 0
    max_consecutive_errors = 5
    poll_count = 0

    while True:
        try:
            poll_count += 1

            # Read message from queue
            # vt = visibility timeout in seconds (how long before message becomes visible again if not deleted)
            result = supabase.rpc('pgmq_read', {
                'queue_name': 'document_processing',
                'vt': 300,  # 5 minute visibility timeout
                'qty': 1     # Process one message at a time
            }).execute()

            messages = result.data

            if messages and len(messages) > 0:
                for msg in messages:
                    message_id = msg['msg_id']
                    message_data = msg['message']

                    print(f"[QueueWorker] === Received message {message_id} ===")
                    print(f"[QueueWorker] Document ID: {message_data.get('document_id')}")
                    print(f"[QueueWorker] Storage path: {message_data.get('storage_path')}")

                    try:
                        # Process the document
                        await processor.process_document(message_data)

                        # Delete message from queue on success
                        supabase.rpc('pgmq_delete', {
                            'queue_name': 'document_processing',
                            'msg_id': message_id
                        }).execute()

                        print(f"[QueueWorker] === Successfully processed message {message_id} ===")

                        # Reset error counter on success
                        consecutive_errors = 0

                    except Exception as e:
                        print(f"[QueueWorker] ERROR processing document {message_data.get('document_id')}: {str(e)}")
                        import traceback
                        traceback.print_exc()
                        consecutive_errors += 1

                        # Message will become visible again after visibility timeout
                        # This allows for automatic retry

                        if consecutive_errors >= max_consecutive_errors:
                            print(f"[QueueWorker] Too many consecutive errors ({consecutive_errors}). Pausing for 60 seconds...")
                            await asyncio.sleep(60)
                            consecutive_errors = 0

            else:
                # No messages in queue, wait before polling again
                if poll_count % 30 == 0:  # Log every 60 seconds (30 * 2 seconds)
                    print(f"[QueueWorker] Waiting for messages... (poll #{poll_count})")
                await asyncio.sleep(2)

        except KeyboardInterrupt:
            print("\nShutting down queue worker...")
            sys.exit(0)

        except Exception as e:
            print(f"Queue worker error: {str(e)}")
            consecutive_errors += 1

            if consecutive_errors >= max_consecutive_errors:
                print(f"Too many consecutive errors ({consecutive_errors}). Pausing for 60 seconds...")
                await asyncio.sleep(60)
                consecutive_errors = 0
            else:
                await asyncio.sleep(5)


# Use run_worker.py to start this worker
