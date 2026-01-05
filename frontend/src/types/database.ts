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
          cloned_from_id: string | null
          original_creator_account_id: string | null
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
          cloned_from_id?: string | null
          original_creator_account_id?: string | null
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
          cloned_from_id?: string | null
          original_creator_account_id?: string | null
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
      store_categories: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          icon: string | null
          display_order: number | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          icon?: string | null
          display_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          icon?: string | null
          display_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
      }
      store_listings: {
        Row: {
          id: string
          savant_id: string
          category_id: string
          tagline: string | null
          long_description: string | null
          tags: string[] | null
          preview_messages: Json | null
          is_featured: boolean | null
          featured_until: string | null
          import_count: number | null
          review_count: number | null
          average_rating: number | null
          published_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          savant_id: string
          category_id: string
          tagline?: string | null
          long_description?: string | null
          tags?: string[] | null
          preview_messages?: Json | null
          is_featured?: boolean | null
          featured_until?: string | null
          import_count?: number | null
          review_count?: number | null
          average_rating?: number | null
          published_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          savant_id?: string
          category_id?: string
          tagline?: string | null
          long_description?: string | null
          tags?: string[] | null
          preview_messages?: Json | null
          is_featured?: boolean | null
          featured_until?: string | null
          import_count?: number | null
          review_count?: number | null
          average_rating?: number | null
          published_at?: string | null
          updated_at?: string | null
        }
      }
      store_reviews: {
        Row: {
          id: string
          listing_id: string
          user_id: string
          rating: number
          title: string | null
          content: string | null
          is_verified_import: boolean | null
          is_visible: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          listing_id: string
          user_id: string
          rating: number
          title?: string | null
          content?: string | null
          is_verified_import?: boolean | null
          is_visible?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          listing_id?: string
          user_id?: string
          rating?: number
          title?: string | null
          content?: string | null
          is_verified_import?: boolean | null
          is_visible?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      store_imports: {
        Row: {
          id: string
          source_savant_id: string
          source_listing_id: string | null
          cloned_savant_id: string
          imported_by_account_id: string
          imported_by_user_id: string
          import_timestamp: string | null
        }
        Insert: {
          id?: string
          source_savant_id: string
          source_listing_id?: string | null
          cloned_savant_id: string
          imported_by_account_id: string
          imported_by_user_id: string
          import_timestamp?: string | null
        }
        Update: {
          id?: string
          source_savant_id?: string
          source_listing_id?: string | null
          cloned_savant_id?: string
          imported_by_account_id?: string
          imported_by_user_id?: string
          import_timestamp?: string | null
        }
      }
      creator_profiles: {
        Row: {
          id: string
          account_id: string
          display_name: string | null
          bio: string | null
          avatar_url: string | null
          website_url: string | null
          twitter_handle: string | null
          total_savants_published: number | null
          total_imports: number | null
          average_rating: number | null
          notifications_enabled: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          account_id: string
          display_name?: string | null
          bio?: string | null
          avatar_url?: string | null
          website_url?: string | null
          twitter_handle?: string | null
          total_savants_published?: number | null
          total_imports?: number | null
          average_rating?: number | null
          notifications_enabled?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          account_id?: string
          display_name?: string | null
          bio?: string | null
          avatar_url?: string | null
          website_url?: string | null
          twitter_handle?: string | null
          total_savants_published?: number | null
          total_imports?: number | null
          average_rating?: number | null
          notifications_enabled?: boolean | null
          created_at?: string | null
          updated_at?: string | null
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
      search_store_listings: {
        Args: {
          p_search_query?: string
          p_category_slug?: string
          p_min_rating?: number
          p_limit_count?: number
          p_offset_count?: number
        }
        Returns: {
          id: string
          savant_id: string
          savant_name: string
          savant_description: string
          tagline: string
          long_description: string
          tags: string[]
          category_id: string
          category_name: string
          category_slug: string
          import_count: number
          review_count: number
          average_rating: number
          creator_account_id: string
          creator_display_name: string
          published_at: string
        }[]
      }
      clone_savant_from_store: {
        Args: {
          p_source_savant_id: string
          p_target_account_id: string
          p_target_user_id: string
          p_new_name?: string
        }
        Returns: string
      }
    }
    Enums: {}
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Store-specific types for convenience
export type StoreCategory = Tables<'store_categories'>
export type StoreListing = Tables<'store_listings'>
export type StoreReview = Tables<'store_reviews'>
export type StoreImport = Tables<'store_imports'>
export type CreatorProfile = Tables<'creator_profiles'>

// Search result type (from search_store_listings function)
export type StoreListingSearchResult = Database['public']['Functions']['search_store_listings']['Returns'][number]
