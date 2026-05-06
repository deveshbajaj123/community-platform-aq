export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      members: {
        Row: {
          member_id: number
          uuid: string
          auth_uid: string | null
          google_id: string | null
          email: string
          full_name: string
          avatar_url: string | null
          class_grade: string | null
          phone: string | null
          join_reason: string | null
          role: string
          status: string
          rejection_note: string | null
          approved_by: number | null
          approved_at: string | null
          last_login: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          member_id?: number
          uuid?: string
          auth_uid?: string | null
          google_id?: string | null
          email: string
          full_name: string
          avatar_url?: string | null
          class_grade?: string | null
          phone?: string | null
          join_reason?: string | null
          role?: string
          status?: string
          rejection_note?: string | null
          approved_by?: number | null
          approved_at?: string | null
          last_login?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          member_id?: number
          uuid?: string
          auth_uid?: string | null
          google_id?: string | null
          email?: string
          full_name?: string
          avatar_url?: string | null
          class_grade?: string | null
          phone?: string | null
          join_reason?: string | null
          role?: string
          status?: string
          rejection_note?: string | null
          approved_by?: number | null
          approved_at?: string | null
          last_login?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          post_id: number
          uuid: string
          author_id: number
          team_id: number | null
          category: string
          body: string
          link_url: string | null
          link_title: string | null
          link_image: string | null
          status: string
          rejection_note: string | null
          reviewed_by: number | null
          reviewed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          post_id?: number
          uuid?: string
          author_id: number
          team_id?: number | null
          category: string
          body: string
          link_url?: string | null
          link_title?: string | null
          link_image?: string | null
          status?: string
          rejection_note?: string | null
          reviewed_by?: number | null
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          post_id?: number
          uuid?: string
          author_id?: number
          team_id?: number | null
          category?: string
          body?: string
          link_url?: string | null
          link_title?: string | null
          link_image?: string | null
          status?: string
          rejection_note?: string | null
          reviewed_by?: number | null
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      post_images: {
        Row: {
          image_id: number
          post_id: number
          blob_url: string
          blob_name: string
          file_size: number | null
          display_order: number
          created_at: string
        }
        Insert: {
          image_id?: number
          post_id: number
          blob_url: string
          blob_name: string
          file_size?: number | null
          display_order?: number
          created_at?: string
        }
        Update: {
          image_id?: number
          post_id?: number
          blob_url?: string
          blob_name?: string
          file_size?: number | null
          display_order?: number
          created_at?: string
        }
        Relationships: []
      }
      post_tags: {
        Row: {
          tag_id: number
          post_id: number
          tagged_member_id: number
          created_at: string
        }
        Insert: {
          tag_id?: number
          post_id: number
          tagged_member_id: number
          created_at?: string
        }
        Update: {
          tag_id?: number
          post_id?: number
          tagged_member_id?: number
          created_at?: string
        }
        Relationships: []
      }
      likes: {
        Row: {
          like_id: number
          post_id: number
          member_id: number
          created_at: string
        }
        Insert: {
          like_id?: number
          post_id: number
          member_id: number
          created_at?: string
        }
        Update: {
          like_id?: number
          post_id?: number
          member_id?: number
          created_at?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          comment_id: number
          uuid: string
          post_id: number
          author_id: number
          body: string
          created_at: string
          updated_at: string
        }
        Insert: {
          comment_id?: number
          uuid?: string
          post_id: number
          author_id: number
          body: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          comment_id?: number
          uuid?: string
          post_id?: number
          author_id?: number
          body?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      director_categories: {
        Row: {
          assignment_id: number
          member_id: number
          category: string
          assigned_at: string
          assigned_by: number | null
        }
        Insert: {
          assignment_id?: number
          member_id: number
          category: string
          assigned_at?: string
          assigned_by?: number | null
        }
        Update: {
          assignment_id?: number
          member_id?: number
          category?: string
          assigned_at?: string
          assigned_by?: number | null
        }
        Relationships: []
      }
      post_categories: {
        Row: {
          post_category_id: number
          post_id: number
          category: string
        }
        Insert: {
          post_category_id?: number
          post_id: number
          category: string
        }
        Update: {
          post_category_id?: number
          post_id?: number
          category?: string
        }
        Relationships: []
      }
      post_approvals: {
        Row: {
          approval_id: number
          post_id: number
          category: string
          approved_by: number
          approved_at: string
        }
        Insert: {
          approval_id?: number
          post_id: number
          category: string
          approved_by: number
          approved_at?: string
        }
        Update: {
          approval_id?: number
          post_id?: number
          category?: string
          approved_by?: number
          approved_at?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          team_id: number
          uuid: string
          name: string
          description: string | null
          category: string
          logo_url: string | null
          is_active: boolean
          created_by: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          team_id?: number
          uuid?: string
          name: string
          description?: string | null
          category: string
          logo_url?: string | null
          is_active?: boolean
          created_by?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          team_id?: number
          uuid?: string
          name?: string
          description?: string | null
          category?: string
          logo_url?: string | null
          is_active?: boolean
          created_by?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          team_member_id: number
          team_id: number
          member_id: number
          role: string
          joined_at: string
          left_at: string | null
          is_active: boolean
        }
        Insert: {
          team_member_id?: number
          team_id: number
          member_id: number
          role?: string
          joined_at?: string
          left_at?: string | null
          is_active?: boolean
        }
        Update: {
          team_member_id?: number
          team_id?: number
          member_id?: number
          role?: string
          joined_at?: string
          left_at?: string | null
          is_active?: boolean
        }
        Relationships: []
      }
      team_join_requests: {
        Row: {
          request_id: number
          uuid: string
          team_id: number
          member_id: number
          status: string
          message: string | null
          reviewed_by: number | null
          reviewed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          request_id?: number
          uuid?: string
          team_id: number
          member_id: number
          status?: string
          message?: string | null
          reviewed_by?: number | null
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          request_id?: number
          uuid?: string
          team_id?: number
          member_id?: number
          status?: string
          message?: string | null
          reviewed_by?: number | null
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      external_achievements: {
        Row: {
          achievement_id: number
          uuid: string
          member_id: number
          title: string
          description: string | null
          achievement_type: string
          achievement_date: string
          achievement_end_date: string | null
          proof_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          achievement_id?: number
          uuid?: string
          member_id: number
          title: string
          description?: string | null
          achievement_type: string
          achievement_date: string
          achievement_end_date?: string | null
          proof_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          achievement_id?: number
          uuid?: string
          member_id?: number
          title?: string
          description?: string | null
          achievement_type?: string
          achievement_date?: string
          achievement_end_date?: string | null
          proof_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          project_id: number
          uuid: string
          title: string
          description: string | null
          category: string
          team_id: number | null
          status: string
          start_date: string | null
          end_date: string | null
          cover_image_url: string | null
          created_by: number
          created_at: string
          updated_at: string
        }
        Insert: {
          project_id?: number
          uuid?: string
          title: string
          description?: string | null
          category: string
          team_id?: number | null
          status?: string
          start_date?: string | null
          end_date?: string | null
          cover_image_url?: string | null
          created_by: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          project_id?: number
          uuid?: string
          title?: string
          description?: string | null
          category?: string
          team_id?: number | null
          status?: string
          start_date?: string | null
          end_date?: string | null
          cover_image_url?: string | null
          created_by?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      schools: {
        Row: {
          school_id: number
          uuid: string
          name: string
          short_name: string | null
          logo_url: string | null
          location: string | null
          website: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          school_id?: number
          uuid?: string
          name: string
          short_name?: string | null
          logo_url?: string | null
          location?: string | null
          website?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          school_id?: number
          uuid?: string
          name?: string
          short_name?: string | null
          logo_url?: string | null
          location?: string | null
          website?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      community_audit_logs: {
        Row: {
          log_id: number
          member_id: number | null
          action: string
          entity_type: string | null
          entity_id: number | null
          details: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          log_id?: number
          member_id?: number | null
          action: string
          entity_type?: string | null
          entity_id?: number | null
          details?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          log_id?: number
          member_id?: number | null
          action?: string
          entity_type?: string | null
          entity_id?: number | null
          details?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      post_feed_view: {
        Row: {
          post_id: number
          uuid: string
          category: string
          body: string
          link_url: string | null
          link_title: string | null
          link_image: string | null
          status: string
          team_id: number | null
          created_at: string
          updated_at: string
          author_id: number
          author_uuid: string
          author_name: string
          author_avatar: string | null
          author_role: string
          like_count: number
          comment_count: number
          images: Json | null
          tagged_members: Json | null
        }
        Relationships: []
      }
      pending_member_approvals: {
        Row: {
          member_id: number
          uuid: string
          email: string
          full_name: string
          class_grade: string | null
          phone: string | null
          join_reason: string | null
          created_at: string
        }
        Relationships: []
      }
      pending_post_reviews: {
        Row: {
          post_id: number
          uuid: string
          category: string
          body: string
          link_url: string | null
          created_at: string
          author_id: number
          author_name: string
          author_avatar: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_current_member_id: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      is_director: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_assigned_to_category: {
        Args: {
          cat: string
        }
        Returns: boolean
      }
      approve_post_category: {
        Args: {
          p_post_uuid: string
          p_category: string
        }
        Returns: Json
      }
    }
  }
}
