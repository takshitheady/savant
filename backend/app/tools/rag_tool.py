"""
RAG (Retrieval-Augmented Generation) Tool

Searches the savant's knowledge base using vector similarity and returns relevant context.
Uses OpenAI embeddings with cosine distance per Supabase best practices.
"""

from agno.tools import Function
from supabase import create_client
from langchain_openai import OpenAIEmbeddings
import os


def create_rag_function(savant_id: str) -> Function:
    """
    Create a RAG function bound to a specific savant

    Args:
        savant_id: The Savant's UUID to search documents for

    Returns:
        Agno Function configured for RAG search
    """
    supabase = create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    )
    embeddings = OpenAIEmbeddings(
        model="text-embedding-ada-002",
        openai_api_key=os.getenv("OPENAI_API_KEY")
    )

    async def search_knowledge_base(query: str, top_k: int = 5) -> str:
        """
        Search the knowledge base for relevant information

        Args:
            query: The user's question or search query
            top_k: Number of top results to return (default: 5)

        Returns:
            Formatted string with relevant context chunks
        """
        print(f"[RAG] Searching knowledge base for savant {savant_id}")
        print(f"[RAG] Query: {query[:100]}..." if len(query) > 100 else f"[RAG] Query: {query}")

        # Generate embedding for query
        # Replace newlines with spaces per OpenAI best practice
        query_cleaned = query.replace('\n', ' ').strip()

        try:
            print(f"[RAG] Generating query embedding...")
            query_embedding = await embeddings.aembed_query(query_cleaned)
            print(f"[RAG] Embedding generated (dimension: {len(query_embedding)})")
        except Exception as e:
            print(f"[RAG] ERROR generating embedding: {str(e)}")
            return f"Error generating embedding: {str(e)}"

        try:
            # Search using match_chunks function with cosine similarity
            print(f"[RAG] Calling match_chunks RPC (threshold: 0.78, top_k: {top_k})...")
            result = supabase.rpc('match_chunks', {
                'query_embedding': query_embedding,
                'p_savant_id': savant_id,
                'match_threshold': 0.78,  # Cosine similarity threshold
                'match_count': top_k
            }).execute()

            chunks = result.data
            print(f"[RAG] Found {len(chunks) if chunks else 0} matching chunks")

            if not chunks or len(chunks) == 0:
                print(f"[RAG] No relevant information found")
                return "No relevant information found in the knowledge base."

            # Format context with similarity scores
            context_parts = []
            for i, chunk in enumerate(chunks, 1):
                similarity = chunk.get('similarity', 0)
                content = chunk.get('content', '')
                print(f"[RAG] Chunk {i}: similarity={similarity:.2%}, length={len(content)} chars")

                context_parts.append(
                    f"[Source {i} - Relevance: {similarity:.2%}]\n{content}"
                )

            formatted_context = "\n\n---\n\n".join(context_parts)

            print(f"[RAG] Returning {len(chunks)} chunks to agent")
            return f"Found {len(chunks)} relevant document(s):\n\n{formatted_context}"

        except Exception as e:
            print(f"[RAG] ERROR searching knowledge base: {str(e)}")
            import traceback
            traceback.print_exc()
            return f"Error searching knowledge base: {str(e)}"

    return Function(
        name="search_knowledge_base",
        description=(
            "Search uploaded documents and return EXACT information from them. "
            "Use this whenever the user references their documents or asks about specific details."
        ),
        instructions=(
            "IMPORTANT — When using the search_knowledge_base tool:\n"
            "1. You MUST use EXACT information from the retrieved documents\n"
            "2. Do NOT invent, paraphrase, or extrapolate details not explicitly stated\n"
            "3. If documents contain specific facts (names, dates, specifications, numbers), include them VERBATIM\n"
            "4. If information is not in the documents, explicitly state: "
            "'I don't have that information in the uploaded documents'\n"
            "5. Quote or closely paraphrase the source material rather than summarizing in your own words\n"
            "6. Preserve technical terms, product names, and proper nouns exactly as they appear\n"
            "7. Prioritize document content over general knowledge when answering questions"
        ),
        add_instructions=True,
        entrypoint=search_knowledge_base
    )
