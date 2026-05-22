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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agent_config: {
        Row: {
          agent_name: string | null
          created_at: string | null
          emoji_usage: boolean | null
          id: number
          language_style: string | null
          markdown_formatting: boolean | null
          reasoning_level: string | null
          response_style: string | null
          structured_answers: boolean | null
          system_prompt: string | null
          use_memory: boolean | null
          use_web_search: boolean | null
        }
        Insert: {
          agent_name?: string | null
          created_at?: string | null
          emoji_usage?: boolean | null
          id?: number
          language_style?: string | null
          markdown_formatting?: boolean | null
          reasoning_level?: string | null
          response_style?: string | null
          structured_answers?: boolean | null
          system_prompt?: string | null
          use_memory?: boolean | null
          use_web_search?: boolean | null
        }
        Update: {
          agent_name?: string | null
          created_at?: string | null
          emoji_usage?: boolean | null
          id?: number
          language_style?: string | null
          markdown_formatting?: boolean | null
          reasoning_level?: string | null
          response_style?: string | null
          structured_answers?: boolean | null
          system_prompt?: string | null
          use_memory?: boolean | null
          use_web_search?: boolean | null
        }
        Relationships: []
      }
      agent_conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      agent_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "agent_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_feedback: {
        Row: {
          assistant_message: string
          created_at: string
          id: string
          meta: Json
          rating: number
          reason: string | null
          response_length: number
          session_id: string | null
          user_id: string | null
          user_prompt: string
        }
        Insert: {
          assistant_message?: string
          created_at?: string
          id?: string
          meta?: Json
          rating: number
          reason?: string | null
          response_length?: number
          session_id?: string | null
          user_id?: string | null
          user_prompt?: string
        }
        Update: {
          assistant_message?: string
          created_at?: string
          id?: string
          meta?: Json
          rating?: number
          reason?: string | null
          response_length?: number
          session_id?: string | null
          user_id?: string | null
          user_prompt?: string
        }
        Relationships: []
      }
      ai_feedback: {
        Row: {
          created_at: string
          id: string
          message_id: string | null
          rating: string | null
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id?: string | null
          rating?: string | null
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string | null
          rating?: string | null
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_learning_events: {
        Row: {
          after_belief: string
          before_belief: string
          created_at: string
          id: string
          market_regime: string
          pattern_detected: string
          prior_accuracy: number | null
          sample_size: number
          scenario_tag: string
          trigger_prediction_ids: string[]
          weight_adjustment: Json
        }
        Insert: {
          after_belief: string
          before_belief: string
          created_at?: string
          id?: string
          market_regime: string
          pattern_detected: string
          prior_accuracy?: number | null
          sample_size?: number
          scenario_tag: string
          trigger_prediction_ids?: string[]
          weight_adjustment?: Json
        }
        Update: {
          after_belief?: string
          before_belief?: string
          created_at?: string
          id?: string
          market_regime?: string
          pattern_detected?: string
          prior_accuracy?: number | null
          sample_size?: number
          scenario_tag?: string
          trigger_prediction_ids?: string[]
          weight_adjustment?: Json
        }
        Relationships: []
      }
      ai_market_news: {
        Row: {
          created_at: string
          headline: string | null
          id: string
          impact_score: number | null
          published_at: string | null
          source: string | null
          summary: string | null
          symbol: string | null
        }
        Insert: {
          created_at?: string
          headline?: string | null
          id?: string
          impact_score?: number | null
          published_at?: string | null
          source?: string | null
          summary?: string | null
          symbol?: string | null
        }
        Update: {
          created_at?: string
          headline?: string | null
          id?: string
          impact_score?: number | null
          published_at?: string | null
          source?: string | null
          summary?: string | null
          symbol?: string | null
        }
        Relationships: []
      }
      ai_memory: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          session_id: string | null
          summary: string | null
          symbols: string[]
          topics: string[]
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          session_id?: string | null
          summary?: string | null
          symbols?: string[]
          topics?: string[]
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string | null
          summary?: string | null
          symbols?: string[]
          topics?: string[]
          user_id?: string
        }
        Relationships: []
      }
      ai_outcomes: {
        Row: {
          correct: boolean
          error_magnitude: number
          evaluated_at: string
          id: string
          notes: string | null
          prediction_id: string
          price_at_eval: number
          realized_return: number
        }
        Insert: {
          correct: boolean
          error_magnitude?: number
          evaluated_at?: string
          id?: string
          notes?: string | null
          prediction_id: string
          price_at_eval: number
          realized_return: number
        }
        Update: {
          correct?: boolean
          error_magnitude?: number
          evaluated_at?: string
          id?: string
          notes?: string | null
          prediction_id?: string
          price_at_eval?: number
          realized_return?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_outcomes_prediction_id_fkey"
            columns: ["prediction_id"]
            isOneToOne: false
            referencedRelation: "ai_predictions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_predictions: {
        Row: {
          confidence: number
          created_at: string
          horizon_days: number
          id: string
          market_regime: string
          model_version: string
          price_at_prediction: number
          reasoning: Json
          scenario_tag: string
          symbol: string
          user_id: string | null
          verdict: string
        }
        Insert: {
          confidence: number
          created_at?: string
          horizon_days?: number
          id?: string
          market_regime: string
          model_version?: string
          price_at_prediction: number
          reasoning?: Json
          scenario_tag: string
          symbol: string
          user_id?: string | null
          verdict: string
        }
        Update: {
          confidence?: number
          created_at?: string
          horizon_days?: number
          id?: string
          market_regime?: string
          model_version?: string
          price_at_prediction?: number
          reasoning?: Json
          scenario_tag?: string
          symbol?: string
          user_id?: string | null
          verdict?: string
        }
        Relationships: []
      }
      ai_quant_metrics: {
        Row: {
          created_at: string
          ev_ebitda: number | null
          id: string
          intrinsic_value: number | null
          margin_of_safety: number | null
          pe_ratio: number | null
          risk_score: number | null
          symbol: string
        }
        Insert: {
          created_at?: string
          ev_ebitda?: number | null
          id?: string
          intrinsic_value?: number | null
          margin_of_safety?: number | null
          pe_ratio?: number | null
          risk_score?: number | null
          symbol: string
        }
        Update: {
          created_at?: string
          ev_ebitda?: number | null
          id?: string
          intrinsic_value?: number | null
          margin_of_safety?: number | null
          pe_ratio?: number | null
          risk_score?: number | null
          symbol?: string
        }
        Relationships: []
      }
      ai_user_interactions: {
        Row: {
          action: string
          created_at: string
          id: string
          prediction_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          prediction_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          prediction_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_user_interactions_prediction_id_fkey"
            columns: ["prediction_id"]
            isOneToOne: false
            referencedRelation: "ai_predictions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_user_preferences: {
        Row: {
          feedback_count: number
          negative_signals: Json
          positive_signals: Json
          preferences: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          feedback_count?: number
          negative_signals?: Json
          positive_signals?: Json
          preferences?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          feedback_count?: number
          negative_signals?: Json
          positive_signals?: Json
          preferences?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_user_profile: {
        Row: {
          complexity_level: string
          investment_style: string
          preferred_response_style: string
          risk_level: string
          updated_at: string
          user_id: string
        }
        Insert: {
          complexity_level?: string
          investment_style?: string
          preferred_response_style?: string
          risk_level?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          complexity_level?: string
          investment_style?: string
          preferred_response_style?: string
          risk_level?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      analysis_credit_usage: {
        Row: {
          id: string
          symbol: string
          used_at: string
          user_id: string
        }
        Insert: {
          id?: string
          symbol: string
          used_at?: string
          user_id: string
        }
        Update: {
          id?: string
          symbol?: string
          used_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: number
          role: string
          session_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: number
          role: string
          session_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: number
          role?: string
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string | null
          id: string
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      conversation_summaries: {
        Row: {
          created_at: string | null
          id: number
          key_topics: string[] | null
          summary: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          key_topics?: string[] | null
          summary?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          key_topics?: string[] | null
          summary?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      memory_quality: {
        Row: {
          created_at: string | null
          id: number
          importance_score: number | null
          memory_type: string | null
          summary: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          importance_score?: number | null
          memory_type?: string | null
          summary?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          importance_score?: number | null
          memory_type?: string | null
          summary?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      response_feedback: {
        Row: {
          ai_response: string | null
          created_at: string | null
          feedback: string | null
          id: number
          rating: number | null
          user_id: string | null
          user_message: string | null
        }
        Insert: {
          ai_response?: string | null
          created_at?: string | null
          feedback?: string | null
          id?: number
          rating?: number | null
          user_id?: string | null
          user_message?: string | null
        }
        Update: {
          ai_response?: string | null
          created_at?: string | null
          feedback?: string | null
          id?: number
          rating?: number | null
          user_id?: string | null
          user_message?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          environment: string
          id: string
          price_id: string | null
          product_id: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          environment?: string
          id?: string
          price_id?: string | null
          product_id?: string | null
          status: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          environment?: string
          id?: string
          price_id?: string | null
          product_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_trading_profile: {
        Row: {
          ai_style: string | null
          ai_tone: string | null
          confidence_threshold: number
          created_at: string
          explanation_depth: string | null
          markets: Json
          notif_breakout: boolean
          notif_daily: boolean
          notif_realtime: boolean
          notif_silent: boolean
          notif_weekly: boolean
          onboarding_completed: boolean
          region: string | null
          risk_level: string | null
          show_reasoning: boolean
          signal_frequency: string | null
          strategy_mode: string | null
          trading_goal: string | null
          updated_at: string
          usage_frequency: string | null
          user_id: string
        }
        Insert: {
          ai_style?: string | null
          ai_tone?: string | null
          confidence_threshold?: number
          created_at?: string
          explanation_depth?: string | null
          markets?: Json
          notif_breakout?: boolean
          notif_daily?: boolean
          notif_realtime?: boolean
          notif_silent?: boolean
          notif_weekly?: boolean
          onboarding_completed?: boolean
          region?: string | null
          risk_level?: string | null
          show_reasoning?: boolean
          signal_frequency?: string | null
          strategy_mode?: string | null
          trading_goal?: string | null
          updated_at?: string
          usage_frequency?: string | null
          user_id: string
        }
        Update: {
          ai_style?: string | null
          ai_tone?: string | null
          confidence_threshold?: number
          created_at?: string
          explanation_depth?: string | null
          markets?: Json
          notif_breakout?: boolean
          notif_daily?: boolean
          notif_realtime?: boolean
          notif_silent?: boolean
          notif_weekly?: boolean
          onboarding_completed?: boolean
          region?: string | null
          risk_level?: string | null
          show_reasoning?: boolean
          signal_frequency?: string | null
          strategy_mode?: string | null
          trading_goal?: string | null
          updated_at?: string
          usage_frequency?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_active_subscription: {
        Args: { _env?: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
