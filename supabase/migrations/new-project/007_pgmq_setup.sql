-- ============================================================================
-- Migration: 007_pgmq_setup.sql
-- Description: Set up PGMQ message queues
-- ============================================================================

-- ============================================================================
-- CREATE DOCUMENT PROCESSING QUEUE
-- ============================================================================
-- Create the main queue for document processing
SELECT pgmq.create('document_processing');

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
-- Grant necessary permissions for the queue operations
GRANT USAGE ON SCHEMA pgmq TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA pgmq TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA pgmq TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA pgmq TO postgres, anon, authenticated, service_role;

-- ============================================================================
-- QUEUE CONFIGURATION
-- ============================================================================
-- The document_processing queue is used for background processing of uploaded documents
-- Messages contain:
-- {
--   "document_id": "uuid",
--   "account_id": "uuid",
--   "savant_id": "uuid",
--   "storage_path": "string",
--   "mime_type": "string"
-- }

-- Queue characteristics:
-- - Not partitioned (is_partitioned = false)
-- - Not unlogged (is_unlogged = false)
-- - Default visibility timeout: controlled by read operations
-- - Messages are processed by background workers

-- ============================================================================
-- TESTING THE QUEUE (Optional)
-- ============================================================================
-- To test the queue, you can use the wrapper functions:

-- Send a test message:
-- SELECT pgmq_send('document_processing', '{"test": "message"}'::jsonb);

-- Read messages (visibility timeout: 30 seconds, quantity: 1):
-- SELECT * FROM pgmq_read('document_processing', 30, 1);

-- Delete a message (replace 123 with actual msg_id):
-- SELECT pgmq_delete('document_processing', 123);

-- List all queues:
-- SELECT * FROM pgmq.list_queues();

-- ============================================================================
-- Verification: Check queue was created
-- ============================================================================
-- Run this query to verify:
-- SELECT * FROM pgmq.list_queues();
-- You should see 'document_processing' in the results
