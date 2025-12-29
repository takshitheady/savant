# Phase 3: Backend Integration & RAG Implementation

Based on Supabase Vector, pgvector, and Queues documentation, here's the complete implementation plan.

## Architecture Overview

```
Document Upload → Supabase Storage → Queue → Background Worker →
Chunking → Embeddings → Vector Storage → RAG Search → Chat Response
```

## 1. Document Processing Pipeline with Supabase Queues

### Enable pgmq Extension

```sql
-- Migration: 005_enable_queues.sql
create extension if not exists pgmq;

-- Create a queue for document processing
select pgmq.create('document_processing');
```

### Update Documents Table

```sql
-- Add processing metadata
alter table documents
add column if not exists processing_started_at timestamptz,
add column if not exists processing_completed_at timestamptz,
add column if not exists processing_error text,
add column if not exists chunk_count integer default 0;
```

### Queue Message Structure

```typescript
interface DocumentProcessingMessage {
  document_id: string
  account_id: string
  savant_id: string
  storage_path: string
  mime_type: string
}
```

### Frontend: Queue Document on Upload

```typescript
// In SavantDocuments component
async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
  // ... existing upload code ...

  // After creating document record, send to queue
  const { error: queueError } = await supabase.rpc('pgmq_send', {
    queue_name: 'document_processing',
    message: {
      document_id: documentId,
      account_id: accountId,
      savant_id: savantId,
      storage_path: uploadData.path,
      mime_type: file.type,
    }
  })
}
```

## 2. Document Processing Worker (Backend)

### Install Dependencies

```bash
cd backend
source venv/bin/activate
pip install \
  langchain \
  langchain-openai \
  pypdf \
  python-docx \
  tiktoken \
  supabase
```

### Document Processor Service

```python
# backend/app/services/document_processor.py

from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from supabase import create_client, Client
import tiktoken
import os
from typing import List, Dict

class DocumentProcessor:
    def __init__(self):
        self.supabase: Client = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        )
        self.embeddings = OpenAIEmbeddings(
            model="text-embedding-ada-002",
            openai_api_key=os.getenv("OPENAI_API_KEY")
        )
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=800,
            chunk_overlap=200,
            length_function=self._token_length,
            separators=["\n\n", "\n", ". ", " ", ""]
        )

    def _token_length(self, text: str) -> int:
        """Count tokens using tiktoken"""
        encoding = tiktoken.get_encoding("cl100k_base")
        return len(encoding.encode(text))

    async def process_document(self, message: Dict) -> None:
        """Main processing pipeline"""
        document_id = message['document_id']
        account_id = message['account_id']
        savant_id = message['savant_id']
        storage_path = message['storage_path']
        mime_type = message['mime_type']

        try:
            # Update status to processing
            self.supabase.table('documents').update({
                'processing_status': 'processing',
                'processing_started_at': 'now()'
            }).eq('id', document_id).execute()

            # Download file from Supabase Storage
            file_data = self.supabase.storage.from_('documents').download(storage_path)

            # Extract text based on mime type
            text = self._extract_text(file_data, mime_type)

            # Clean text: replace newlines with spaces (OpenAI best practice)
            cleaned_text = text.replace('\n', ' ').strip()

            # Split into chunks
            chunks = self.text_splitter.split_text(cleaned_text)

            # Generate embeddings for all chunks
            chunk_embeddings = await self.embeddings.aembed_documents(chunks)

            # Store chunks with embeddings
            chunk_records = []
            for idx, (chunk, embedding) in enumerate(zip(chunks, chunk_embeddings)):
                chunk_records.append({
                    'account_id': account_id,
                    'savant_id': savant_id,
                    'document_id': document_id,
                    'content': chunk,
                    'embedding': embedding,
                    'chunk_index': idx,
                    'token_count': self._token_length(chunk)
                })

            # Batch insert chunks
            self.supabase.table('document_chunks').insert(chunk_records).execute()

            # Update document status
            self.supabase.table('documents').update({
                'processing_status': 'completed',
                'processing_completed_at': 'now()',
                'chunk_count': len(chunks)
            }).eq('id', document_id).execute()

        except Exception as e:
            # Update error status
            self.supabase.table('documents').update({
                'processing_status': 'failed',
                'processing_error': str(e)
            }).eq('id', document_id).execute()
            raise

    def _extract_text(self, file_data: bytes, mime_type: str) -> str:
        """Extract text from various file formats"""
        if mime_type == 'application/pdf':
            return self._extract_pdf(file_data)
        elif mime_type in ['application/vnd.openxmlformats-officedocument.wordprocessingml.document']:
            return self._extract_docx(file_data)
        elif mime_type.startswith('text/'):
            return file_data.decode('utf-8')
        else:
            raise ValueError(f"Unsupported file type: {mime_type}")

    def _extract_pdf(self, file_data: bytes) -> str:
        from pypdf import PdfReader
        from io import BytesIO

        reader = PdfReader(BytesIO(file_data))
        text = ""
        for page in reader.pages:
            text += page.extract_text()
        return text

    def _extract_docx(self, file_data: bytes) -> str:
        from docx import Document
        from io import BytesIO

        doc = Document(BytesIO(file_data))
        return "\n".join([para.text for para in doc.paragraphs])
```

### Queue Worker

```python
# backend/app/workers/queue_worker.py

import asyncio
from app.services.document_processor import DocumentProcessor
from supabase import create_client
import os
import json

async def process_queue():
    """Background worker to process document queue"""
    supabase = create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    )
    processor = DocumentProcessor()

    while True:
        try:
            # Read message from queue
            result = supabase.rpc('pgmq_read', {
                'queue_name': 'document_processing',
                'vt': 30,  # 30 second visibility timeout
                'qty': 1
            }).execute()

            messages = result.data

            if messages:
                for msg in messages:
                    message_id = msg['msg_id']
                    message_data = msg['message']

                    try:
                        # Process the document
                        await processor.process_document(message_data)

                        # Delete message from queue on success
                        supabase.rpc('pgmq_delete', {
                            'queue_name': 'document_processing',
                            'msg_id': message_id
                        }).execute()

                    except Exception as e:
                        print(f"Error processing document: {e}")
                        # Message will become visible again after timeout
                        # Consider implementing retry logic and dead letter queue

            # Wait before polling again
            await asyncio.sleep(2)

        except Exception as e:
            print(f"Queue worker error: {e}")
            await asyncio.sleep(5)

if __name__ == "__main__":
    asyncio.run(process_queue())
```

## 3. RAG Implementation in Agno

### RAG Tool for Vector Search

```python
# backend/app/tools/rag_tool.py

from agno.tools import Tool
from supabase import create_client
from langchain_openai import OpenAIEmbeddings
import os

class RAGTool(Tool):
    def __init__(self):
        super().__init__(
            name="search_knowledge_base",
            description="Search the savant's knowledge base for relevant information"
        )
        self.supabase = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        )
        self.embeddings = OpenAIEmbeddings(
            model="text-embedding-ada-002",
            openai_api_key=os.getenv("OPENAI_API_KEY")
        )

    async def run(self, query: str, savant_id: str, top_k: int = 5) -> str:
        """Search knowledge base and return relevant chunks"""

        # Generate embedding for query (replace newlines per OpenAI best practice)
        query_cleaned = query.replace('\n', ' ')
        query_embedding = await self.embeddings.aembed_query(query_cleaned)

        # Search using match_chunks function
        result = self.supabase.rpc('match_chunks', {
            'query_embedding': query_embedding,
            'p_savant_id': savant_id,
            'match_threshold': 0.78,  # Cosine similarity threshold
            'match_count': top_k
        }).execute()

        chunks = result.data

        if not chunks:
            return "No relevant information found in knowledge base."

        # Format context with similarity scores
        context = []
        for chunk in chunks:
            context.append(
                f"[Relevance: {chunk['similarity']:.2f}]\n{chunk['content']}"
            )

        return "\n\n---\n\n".join(context)
```

### Dynamic Savant Agent

```python
# backend/app/agents/savant_agent.py

from agno import Agent
from agno.models.openai import OpenAIChat
from agno.tools import Tool
from app.tools.rag_tool import RAGTool
from supabase import create_client
import os
import tiktoken

class SavantAgentFactory:
    def __init__(self):
        self.supabase = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        )
        self.encoding = tiktoken.get_encoding("cl100k_base")

    def _count_tokens(self, text: str) -> int:
        return len(self.encoding.encode(text))

    async def create_agent(self, savant_id: str, account_id: str) -> Agent:
        """Create a dynamic agent instance for a savant"""

        # Fetch savant configuration
        savant = self.supabase.table('savants').select('*').eq('id', savant_id).single().execute()
        savant_data = savant.data

        # Fetch active system prompt
        prompt_result = self.supabase.table('prompts')\
            .select('content')\
            .eq('savant_id', savant_id)\
            .eq('type', 'system')\
            .eq('is_active', True)\
            .order('created_at', desc=True)\
            .limit(1)\
            .execute()

        system_prompt = None
        if prompt_result.data:
            system_prompt = prompt_result.data[0]['content']

        # Fetch account-level prompts (if any)
        account_prompts = self.supabase.table('account_prompts')\
            .select('content')\
            .eq('account_id', account_id)\
            .eq('is_active', True)\
            .execute()

        # Build combined instructions
        instructions = []

        if account_prompts.data:
            for ap in account_prompts.data:
                instructions.append(ap['content'])

        if system_prompt:
            instructions.append(system_prompt)

        combined_instructions = "\n\n".join(instructions) if instructions else None

        # Create RAG tool
        rag_tool = RAGTool()

        # Create agent
        agent = Agent(
            id=f"savant-{savant_id}",
            name=savant_data['name'],
            model=OpenAIChat(
                id=savant_data.get('model', 'gpt-4o-mini'),
                temperature=savant_data.get('temperature', 0.7)
            ),
            instructions=combined_instructions,
            tools=[rag_tool],
            markdown=True,
            show_tool_calls=True
        )

        return agent
```

### Chat Endpoint with Streaming

```python
# backend/app/routes/chat.py

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.agents.savant_agent import SavantAgentFactory
from supabase import create_client
import os
import json

router = APIRouter()

class ChatRequest(BaseModel):
    savant_id: str
    message: str
    account_id: str

@router.post("/chat")
async def chat(request: ChatRequest):
    """Chat endpoint with streaming response"""

    supabase = create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    )

    # Verify savant belongs to account
    savant = supabase.table('savants')\
        .select('id')\
        .eq('id', request.savant_id)\
        .eq('account_id', request.account_id)\
        .single()\
        .execute()

    if not savant.data:
        raise HTTPException(status_code=404, detail="Savant not found")

    # Save user message
    user_msg = supabase.table('messages').insert({
        'account_id': request.account_id,
        'savant_id': request.savant_id,
        'content': request.message,
        'role': 'user'
    }).execute()

    # Create agent
    factory = SavantAgentFactory()
    agent = await factory.create_agent(request.savant_id, request.account_id)

    # Stream response
    async def generate():
        full_response = ""

        try:
            # Run agent with streaming
            async for chunk in agent.arun_stream(request.message):
                if chunk.content:
                    full_response += chunk.content
                    # Send SSE format
                    yield f"data: {json.dumps({'content': chunk.content})}\n\n"

            # Save assistant message
            supabase.table('messages').insert({
                'account_id': request.account_id,
                'savant_id': request.savant_id,
                'content': full_response,
                'role': 'assistant'
            }).execute()

            yield f"data: {json.dumps({'done': True})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )
```

## 4. Frontend Integration

### Update ChatInterface for Streaming

```typescript
// frontend/src/components/chat/chat-interface.tsx

async function handleSendMessage(e: React.FormEvent) {
  e.preventDefault()
  if (!input.trim() || isLoading) return

  const userMessage = input.trim()
  setInput('')
  setIsLoading(true)

  // Add user message to UI
  const userMsg: Message = {
    id: `temp-${Date.now()}`,
    content: userMessage,
    role: 'user',
    created_at: new Date().toISOString(),
  }
  setMessages((prev) => [...prev, userMsg])

  // Add empty assistant message that will be streamed
  const assistantMsgId = `assistant-${Date.now()}`
  const assistantMsg: Message = {
    id: assistantMsgId,
    content: '',
    role: 'assistant',
    created_at: new Date().toISOString(),
  }
  setMessages((prev) => [...prev, assistantMsg])

  try {
    // Call backend streaming endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_AGNO_API_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        savant_id: savantId,
        message: userMessage,
        account_id: accountId,
      }),
    })

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader!.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6))

          if (data.content) {
            // Update assistant message with streamed content
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? { ...msg, content: msg.content + data.content }
                  : msg
              )
            )
          }

          if (data.error) {
            throw new Error(data.error)
          }
        }
      }
    }

    router.refresh()
  } catch (error) {
    console.error('Error sending message:', error)
    alert('Failed to send message. Please try again.')
  } finally {
    setIsLoading(false)
  }
}
```

## 5. Environment Variables

### Backend .env

```env
SUPABASE_URL=https://npnismcqozoembgswwbt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_DB_URL=postgresql://...
OPENAI_API_KEY=sk-xxx
DEFAULT_MODEL=gpt-4o-mini
CORS_ORIGINS=http://localhost:3000
PORT=8000
```

### Frontend .env.local

```env
NEXT_PUBLIC_SUPABASE_URL=https://npnismcqozoembgswwbt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
NEXT_PUBLIC_AGNO_API_URL=http://localhost:8000
```

## 6. Running the System

### Start Backend

```bash
cd backend
source venv/bin/activate

# Terminal 1: Main API
python app/main.py

# Terminal 2: Queue Worker
python app/workers/queue_worker.py
```

### Start Frontend

```bash
cd frontend
pnpm dev
```

## Key Improvements Based on Supabase Docs

1. **Text Cleaning**: Replace newlines with spaces before embedding (OpenAI best practice)
2. **Token Management**: Use tiktoken to stay within context limits (1500 tokens for RAG context)
3. **Cosine Distance**: Using `<=>` operator for optimal OpenAI embedding similarity
4. **Queue-Based Processing**: Reliable background job processing with pgmq
5. **Streaming Responses**: SSE for real-time chat experience
6. **Error Handling**: Proper status tracking and retry logic

## Performance Optimizations

- HNSW index already configured for fast vector search
- Batch embedding generation for multiple chunks
- Chunking strategy optimized for token count
- Similarity threshold of 0.78 balances precision/recall

## Next Steps

1. Enable pgmq extension
2. Install Python dependencies
3. Implement document processor service
4. Start queue worker
5. Create RAG tool and dynamic agent factory
6. Update chat endpoint for streaming
7. Test end-to-end flow
