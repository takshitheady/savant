# 🚀 Quick Start Guide

## Prerequisites

Make sure you have these environment variables set:

### Backend `.env` file
Create `/backend/.env` with:
```env
SUPABASE_URL=https://npnismcqozoembgswwbt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_DB_URL=postgresql://...
OPENAI_API_KEY=sk-xxx
DEFAULT_MODEL=gpt-4o-mini
CORS_ORIGINS=http://localhost:3000
PORT=8000
```

### Frontend `.env.local` file
Create `/frontend/.env.local` with:
```env
NEXT_PUBLIC_SUPABASE_URL=https://npnismcqozoembgswwbt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
NEXT_PUBLIC_AGNO_API_URL=http://localhost:8000
```

## Start the System (3 Terminals)

### Terminal 1: Frontend
```bash
cd frontend
pnpm dev
```
Visit: http://localhost:3000

### Terminal 2: Backend API
```bash
cd backend
source venv/bin/activate
python run_api.py
```
API docs: http://localhost:8000/docs

### Terminal 3: Document Processor
```bash
cd backend
source venv/bin/activate
python run_worker.py
```
Watch for processing logs!

## Test the System

1. **Sign Up** at http://localhost:3000/signup
2. **Create a Savant** at /savants/new
3. **Upload a Document** (PDF, DOCX, or TXT) in the Documents tab
4. **Watch Terminal 3** - you'll see the document being processed
5. **Chat** - Ask questions about your document!

## Troubleshooting

### Backend won't start
- Make sure `.env` file exists in `/backend/`
- Check that OpenAI API key is set
- Verify Supabase credentials

### Document processing fails
- Check Terminal 3 for error messages
- Verify OPENAI_API_KEY is valid
- Make sure Supabase Service Role Key has proper permissions

### Chat not working
- Ensure backend is running (Terminal 2)
- Check browser console for errors
- Verify NEXT_PUBLIC_AGNO_API_URL in frontend/.env.local

## What to Expect

- **Document Upload**: Instant upload, processing happens in background
- **Processing Time**: ~2-5 seconds per page
- **Chat Response**: Streams in real-time token by token
- **RAG Search**: Finds relevant document chunks automatically

Enjoy building with Savant! 🎉
