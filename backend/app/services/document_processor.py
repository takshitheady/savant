"""
Document Processing Service

Handles document text extraction, chunking, and embedding generation.
Based on Supabase best practices for OpenAI embeddings.
"""

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from supabase import create_client, Client
import tiktoken
import os
from typing import List, Dict
from io import BytesIO


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
        # Chunk size optimized for context windows and token limits
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=800,
            chunk_overlap=200,
            length_function=self._token_length,
            separators=["\n\n", "\n", ". ", " ", ""]
        )

    def _token_length(self, text: str) -> int:
        """Count tokens using tiktoken (OpenAI's tokenizer)"""
        encoding = tiktoken.get_encoding("cl100k_base")
        return len(encoding.encode(text))

    async def process_document(self, message: Dict) -> None:
        """
        Main processing pipeline for documents

        Steps:
        1. Download file from Supabase Storage
        2. Extract text based on file type
        3. Clean text (replace newlines per OpenAI best practice)
        4. Split into chunks
        5. Generate embeddings
        6. Store in database
        """
        document_id = message['document_id']
        account_id = message['account_id']
        savant_id = message['savant_id']
        storage_path = message['storage_path']
        mime_type = message['mime_type']

        try:
            print(f"[DocumentProcessor] Starting processing for document {document_id}")
            print(f"[DocumentProcessor] Storage path: {storage_path}, MIME type: {mime_type}")

            # Update status to processing
            self.supabase.table('documents').update({
                'status': 'processing',
                'processing_started_at': 'now()'
            }).eq('id', document_id).execute()

            # Download file from Supabase Storage
            print(f"[DocumentProcessor] Downloading file from storage...")
            file_data = self.supabase.storage.from_('documents').download(storage_path)
            print(f"[DocumentProcessor] Downloaded {len(file_data)} bytes")

            # Extract text based on mime type
            print(f"[DocumentProcessor] Extracting text...")
            text = self._extract_text(file_data, mime_type)
            print(f"[DocumentProcessor] Extracted {len(text)} characters")

            if not text or len(text.strip()) < 10:
                raise ValueError("No meaningful text extracted from document")

            # Clean text: replace newlines with spaces (OpenAI best practice)
            cleaned_text = text.replace('\n', ' ').strip()

            # Split into chunks
            print(f"[DocumentProcessor] Splitting into chunks...")
            chunks = self.text_splitter.split_text(cleaned_text)
            print(f"[DocumentProcessor] Created {len(chunks)} chunks")

            if not chunks:
                raise ValueError("No chunks generated from document")

            # Generate embeddings for all chunks (batch processing)
            print(f"[DocumentProcessor] Generating embeddings for {len(chunks)} chunks...")
            chunk_embeddings = await self.embeddings.aembed_documents(chunks)
            print(f"[DocumentProcessor] Generated {len(chunk_embeddings)} embeddings")

            # Prepare chunk records
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
            print(f"[DocumentProcessor] Inserting {len(chunk_records)} chunks into database...")
            self.supabase.table('document_chunks').insert(chunk_records).execute()

            # Update document status to completed
            self.supabase.table('documents').update({
                'status': 'completed',
                'processing_completed_at': 'now()',
                'chunk_count': len(chunks),
                'processing_error': None
            }).eq('id', document_id).execute()

            print(f"[DocumentProcessor] SUCCESS: Document {document_id} processed - {len(chunks)} chunks created")

        except Exception as e:
            print(f"[DocumentProcessor] ERROR processing document {document_id}: {str(e)}")
            import traceback
            traceback.print_exc()

            # Update error status
            self.supabase.table('documents').update({
                'status': 'failed',
                'processing_error': str(e)
            }).eq('id', document_id).execute()

            raise

    def _extract_text(self, file_data: bytes, mime_type: str) -> str:
        """Extract text from various file formats"""
        if mime_type == 'application/pdf':
            return self._extract_pdf(file_data)
        elif mime_type in [
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword'
        ]:
            return self._extract_docx(file_data)
        elif mime_type.startswith('text/'):
            return file_data.decode('utf-8')
        else:
            raise ValueError(f"Unsupported file type: {mime_type}")

    def _extract_pdf(self, file_data: bytes) -> str:
        """Extract text from PDF files"""
        from pypdf import PdfReader

        reader = PdfReader(BytesIO(file_data))
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"

        return text.strip()

    def _extract_docx(self, file_data: bytes) -> str:
        """Extract text from DOCX files"""
        from docx import Document

        doc = Document(BytesIO(file_data))
        paragraphs = [para.text for para in doc.paragraphs if para.text.strip()]

        return "\n".join(paragraphs)
