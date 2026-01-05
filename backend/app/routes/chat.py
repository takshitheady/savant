"""
Chat API Routes

Provides streaming chat endpoint for Savant conversations.
Uses Server-Sent Events (SSE) for real-time streaming.
Supports conversation memory and user personalization via Agno.
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from app.agents.savant_agent_factory import SavantAgentFactory
from supabase import create_client
import os
import json
import asyncio
import logging
import traceback
import time

logger = logging.getLogger(__name__)


router = APIRouter()


class ChatRequest(BaseModel):
    savant_id: str
    message: str
    account_id: str
    conversation_id: Optional[str] = None  # For conversation continuity
    user_id: Optional[str] = None          # For user memories across sessions


@router.post("/chat")
async def chat(request: ChatRequest):
    """
    Chat endpoint with streaming SSE response

    Workflow:
    1. Verify savant belongs to account
    2. Save user message to database
    3. Create dynamic agent for the savant
    4. Stream AI response via SSE
    5. Save assistant message to database
    """
    supabase = create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    )

    # Verify savant belongs to account (authorization check)
    savant_check = supabase.table('savants')\
        .select('id, name')\
        .eq('id', request.savant_id)\
        .eq('account_id', request.account_id)\
        .single()\
        .execute()

    if not savant_check.data:
        raise HTTPException(status_code=404, detail="Savant not found or access denied")

    savant_name = savant_check.data['name']

    # Get or create conversation for memory continuity
    conversation_id = None
    try:
        if request.conversation_id:
            # Verify and reuse existing conversation
            conv_check = supabase.table('conversations')\
                .select('id')\
                .eq('id', request.conversation_id)\
                .eq('savant_id', request.savant_id)\
                .eq('account_id', request.account_id)\
                .single()\
                .execute()

            if conv_check.data:
                conversation_id = request.conversation_id
                logger.info(f"Reusing existing conversation: {conversation_id}")
            else:
                logger.warning(f"Conversation {request.conversation_id} not found, creating new")

        # Create new conversation if none provided or not found
        if not conversation_id:
            conversation_result = supabase.table('conversations').insert({
                'savant_id': request.savant_id,
                'account_id': request.account_id,
                'user_id': request.user_id,
                'title': f"Chat with {savant_name}",
                'metadata': {}
            }).execute()
            conversation_id = conversation_result.data[0]['id']
            logger.info(f"Created new conversation: {conversation_id}")

    except Exception as e:
        logger.error(f"Failed to get/create conversation: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to get/create conversation: {str(e)}")

    # Save user message to database
    try:
        user_msg_result = supabase.table('messages').insert({
            'conversation_id': conversation_id,
            'savant_id': request.savant_id,
            'account_id': request.account_id,
            'role': 'user',
            'content': request.message
        }).execute()
    except Exception as e:
        logger.error(f"Failed to save message: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to save message: {str(e)}")

    # Create agent factory and get agent with memory context
    try:
        factory = SavantAgentFactory()
        agent = await factory.create_agent(
            savant_id=request.savant_id,
            account_id=request.account_id,
            session_id=conversation_id,  # Links conversation for memory
            user_id=request.user_id       # For user personalization
        )
    except Exception as e:
        logger.error(f"Failed to create agent: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to create agent: {str(e)}")

    # Stream response using Server-Sent Events
    async def generate():
        full_response = ""
        error_occurred = False
        start_time = time.time()
        first_chunk_received = False

        try:
            logger.info(f"[TIMING] generate() started for savant {request.savant_id}")

            # Send initial event with conversation_id for frontend tracking
            yield f"data: {json.dumps({'type': 'start', 'savant': savant_name, 'conversation_id': conversation_id})}\n\n"

            # Run agent with streaming
            async for chunk in agent.arun(request.message, stream=True):
                if not first_chunk_received:
                    logger.info(f"[TIMING] First chunk received at {time.time() - start_time:.2f}s")
                    first_chunk_received = True

                if chunk.content:
                    full_response += chunk.content

                    # Send content chunk
                    yield f"data: {json.dumps({'type': 'content', 'content': chunk.content})}\n\n"

                    # Small delay to prevent overwhelming the client
                    await asyncio.sleep(0.01)

            # Save complete assistant message to database
            if full_response:
                try:
                    supabase.table('messages').insert({
                        'conversation_id': conversation_id,
                        'savant_id': request.savant_id,
                        'account_id': request.account_id,
                        'role': 'assistant',
                        'content': full_response
                    }).execute()
                except Exception as e:
                    logger.error(f"Error saving assistant message: {str(e)}")
                    logger.error(traceback.format_exc())

            # Send completion event
            logger.info(f"[TIMING] Streaming complete at {time.time() - start_time:.2f}s, response length: {len(full_response)}")
            yield f"data: {json.dumps({'type': 'done', 'full_response': full_response})}\n\n"

        except Exception as e:
            error_occurred = True
            error_msg = str(e)
            logger.error(f"Error during chat streaming: {error_msg}")
            logger.error(traceback.format_exc())

            # Send error event
            yield f"data: {json.dumps({'type': 'error', 'error': error_msg})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        }
    )


@router.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy", "service": "chat"}
