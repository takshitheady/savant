export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          id: string
          name: string
          slug: string
          owner_id: string
          default_system_prompt: string | null
          settings: Json | null
          plan: string | null
          stripe_customer_id: string | null
          autumn_customer_id: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          owner_id: string
          default_system_prompt?: string | null
          settings?: Json | null
          plan?: string | null
          stripe_customer_id?: string | null
          autumn_customer_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          owner_id?: string
          default_system_prompt?: string | null
          settings?: Json | null
          plan?: string | null
          stripe_customer_id?: string | null
          autumn_customer_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      savants: {
        Row: {
          id: string
          account_id: string
          name: string
          slug: string
          description: string | null
          avatar_url: string | null
          system_prompt: string | null
          model_config: Json | null
          rag_config: Json | null
          is_active: boolean | null
          is_public: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          account_id: string
          name: string
          slug: string
          description?: string | null
          avatar_url?: string | null
          system_prompt?: string | null
          model_config?: Json | null
          rag_config?: Json | null
          is_active?: boolean | null
          is_public?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          account_id?: string
          name?: string
          slug?: string
          description?: string | null
          avatar_url?: string | null
          system_prompt?: string | null
          model_config?: Json | null
          rag_config?: Json | null
          is_active?: boolean | null
          is_public?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      documents: {
        Row: {
          id: string
          savant_id: string
          account_id: string
          name: string
          file_path: string
          file_type: string
          file_size: number
          status: string | null
          error_message: string | null
          metadata: Json | null
          chunk_count: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          savant_id: string
          account_id: string
          name: string
          file_path: string
          file_type: string
          file_size: number
          status?: string | null
          error_message?: string | null
          metadata?: Json | null
          chunk_count?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          savant_id?: string
          account_id?: string
          name?: string
          file_path?: string
          file_type?: string
          file_size?: number
          status?: string | null
          error_message?: string | null
          metadata?: Json | null
          chunk_count?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      conversations: {
        Row: {
          id: string
          savant_id: string
          account_id: string
          user_id: string | null
          session_id: string | null
          title: string | null
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          savant_id: string
          account_id: string
          user_id?: string | null
          session_id?: string | null
          title?: string | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          savant_id?: string
          account_id?: string
          user_id?: string | null
          session_id?: string | null
          title?: string | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          savant_id: string
          account_id: string
          role: string
          content: string
          tokens_used: number | null
          context_chunks: Json | null
          metadata: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          conversation_id: string
          savant_id: string
          account_id: string
          role: string
          content: string
          tokens_used?: number | null
          context_chunks?: Json | null
          metadata?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          conversation_id?: string
          savant_id?: string
          account_id?: string
          role?: string
          content?: string
          tokens_used?: number | null
          context_chunks?: Json | null
          metadata?: Json | null
          created_at?: string | null
        }
      }
    }
    Views: {}
    Functions: {
      get_user_account_ids: { Args: never; Returns: string[] }
      is_account_member: {
        Args: { check_account_id: string }
        Returns: boolean
      }
      match_chunks: {
        Args: {
          query_embedding: string
          p_savant_id: string
          match_threshold?: number
          match_count?: number
        }
        Returns: {
          id: string
          content: string
          document_id: string
          similarity: number
          metadata: Json
        }[]
      }
    }
    Enums: {}
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
