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
          user_id: string
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
          user_id: string
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
          user_id?: string
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
      analysis_scores: {
        Row: {
          asset: string | null
          created_at: string | null
          id: number
          momentum_score: number | null
          reasoning: string | null
          recommendation: string | null
          risk_score: number | null
          sentiment_score: number | null
          technical_score: number | null
          total_score: number | null
          volatility_score: number | null
        }
        Insert: {
          asset?: string | null
          created_at?: string | null
          id?: number
          momentum_score?: number | null
          reasoning?: string | null
          recommendation?: string | null
          risk_score?: number | null
          sentiment_score?: number | null
          technical_score?: number | null
          total_score?: number | null
          volatility_score?: number | null
        }
        Update: {
          asset?: string | null
          created_at?: string | null
          id?: number
          momentum_score?: number | null
          reasoning?: string | null
          recommendation?: string | null
          risk_score?: number | null
          sentiment_score?: number | null
          technical_score?: number | null
          total_score?: number | null
          volatility_score?: number | null
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string
          event_name: string
          id: string
          path: string | null
          properties: Json
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: string
          path?: string | null
          properties?: Json
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: string
          path?: string | null
          properties?: Json
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      apex_analyses: {
        Row: {
          analyzed_at: string
          asset_type: string
          confidence_score: number
          id: string
          indicators: Json
          name: string
          price_at_analysis: number
          sector: string | null
          ticker: string
          verdict: string
        }
        Insert: {
          analyzed_at?: string
          asset_type?: string
          confidence_score: number
          id?: string
          indicators?: Json
          name: string
          price_at_analysis: number
          sector?: string | null
          ticker: string
          verdict: string
        }
        Update: {
          analyzed_at?: string
          asset_type?: string
          confidence_score?: number
          id?: string
          indicators?: Json
          name?: string
          price_at_analysis?: number
          sector?: string | null
          ticker?: string
          verdict?: string
        }
        Relationships: []
      }
      apex_outcomes: {
        Row: {
          analysis_id: string
          id: string
          is_correct: boolean | null
          price_after_30d: number | null
          price_after_60d: number | null
          price_after_90d: number | null
          return_30d: number | null
          return_60d: number | null
          return_90d: number | null
          updated_at: string
        }
        Insert: {
          analysis_id: string
          id?: string
          is_correct?: boolean | null
          price_after_30d?: number | null
          price_after_60d?: number | null
          price_after_90d?: number | null
          return_30d?: number | null
          return_60d?: number | null
          return_90d?: number | null
          updated_at?: string
        }
        Update: {
          analysis_id?: string
          id?: string
          is_correct?: boolean | null
          price_after_30d?: number | null
          price_after_60d?: number | null
          price_after_90d?: number | null
          return_30d?: number | null
          return_60d?: number | null
          return_90d?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "apex_outcomes_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: true
            referencedRelation: "apex_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      causal_analysis_results: {
        Row: {
          analyzed_at: string
          causal_score: number
          causal_verdict: string
          current_events_detected: Json
          id: string
          patterns_applied: Json
          repeatability_score: number
          summary_text: string
          ticker: string
        }
        Insert: {
          analyzed_at?: string
          causal_score?: number
          causal_verdict: string
          current_events_detected?: Json
          id?: string
          patterns_applied?: Json
          repeatability_score?: number
          summary_text?: string
          ticker: string
        }
        Update: {
          analyzed_at?: string
          causal_score?: number
          causal_verdict?: string
          current_events_detected?: Json
          id?: string
          patterns_applied?: Json
          repeatability_score?: number
          summary_text?: string
          ticker?: string
        }
        Relationships: []
      }
      causal_events: {
        Row: {
          created_at: string
          event_date: string
          event_description: string
          event_type: string
          id: string
          source_url: string | null
          ticker: string
        }
        Insert: {
          created_at?: string
          event_date: string
          event_description: string
          event_type: string
          id?: string
          source_url?: string | null
          ticker: string
        }
        Update: {
          created_at?: string
          event_date?: string
          event_description?: string
          event_type?: string
          id?: string
          source_url?: string | null
          ticker?: string
        }
        Relationships: []
      }
      causal_outcomes: {
        Row: {
          event_id: string
          id: string
          price_after_14d: number | null
          price_after_30d: number | null
          price_after_3d: number | null
          price_after_7d: number | null
          price_after_90d: number | null
          price_at_event: number
          return_14d: number | null
          return_30d: number | null
          return_3d: number | null
          return_7d: number | null
          return_90d: number | null
          ticker: string
          updated_at: string
        }
        Insert: {
          event_id: string
          id?: string
          price_after_14d?: number | null
          price_after_30d?: number | null
          price_after_3d?: number | null
          price_after_7d?: number | null
          price_after_90d?: number | null
          price_at_event: number
          return_14d?: number | null
          return_30d?: number | null
          return_3d?: number | null
          return_7d?: number | null
          return_90d?: number | null
          ticker: string
          updated_at?: string
        }
        Update: {
          event_id?: string
          id?: string
          price_after_14d?: number | null
          price_after_30d?: number | null
          price_after_3d?: number | null
          price_after_7d?: number | null
          price_after_90d?: number | null
          price_at_event?: number
          return_14d?: number | null
          return_30d?: number | null
          return_3d?: number | null
          return_7d?: number | null
          return_90d?: number | null
          ticker?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "causal_outcomes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "causal_events"
            referencedColumns: ["id"]
          },
        ]
      }
      causal_patterns: {
        Row: {
          avg_return_14d: number
          avg_return_30d: number
          avg_return_3d: number
          avg_return_7d: number
          avg_return_90d: number
          event_type: string
          id: string
          last_calculated_at: string
          positive_outcomes_14d: number
          positive_outcomes_30d: number
          positive_outcomes_3d: number
          positive_outcomes_7d: number
          positive_outcomes_90d: number
          repeatability_score: number
          ticker: string
          total_occurrences: number
        }
        Insert: {
          avg_return_14d?: number
          avg_return_30d?: number
          avg_return_3d?: number
          avg_return_7d?: number
          avg_return_90d?: number
          event_type: string
          id?: string
          last_calculated_at?: string
          positive_outcomes_14d?: number
          positive_outcomes_30d?: number
          positive_outcomes_3d?: number
          positive_outcomes_7d?: number
          positive_outcomes_90d?: number
          repeatability_score?: number
          ticker: string
          total_occurrences?: number
        }
        Update: {
          avg_return_14d?: number
          avg_return_30d?: number
          avg_return_3d?: number
          avg_return_7d?: number
          avg_return_90d?: number
          event_type?: string
          id?: string
          last_calculated_at?: string
          positive_outcomes_14d?: number
          positive_outcomes_30d?: number
          positive_outcomes_3d?: number
          positive_outcomes_7d?: number
          positive_outcomes_90d?: number
          repeatability_score?: number
          ticker?: string
          total_occurrences?: number
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          context_type: string | null
          created_at: string | null
          id: number
          role: string
          session_id: string | null
        }
        Insert: {
          content: string
          context_type?: string | null
          created_at?: string | null
          id?: number
          role: string
          session_id?: string | null
        }
        Update: {
          content?: string
          context_type?: string | null
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
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      login_events: {
        Row: {
          created_at: string
          event: string
          id: string
          provider: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event?: string
          id?: string
          provider?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          provider?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      market_cache: {
        Row: {
          cache_key: string
          expires_at: string
          payload: Json
          updated_at: string
        }
        Insert: {
          cache_key: string
          expires_at: string
          payload: Json
          updated_at?: string
        }
        Update: {
          cache_key?: string
          expires_at?: string
          payload?: Json
          updated_at?: string
        }
        Relationships: []
      }
      market_context_cache: {
        Row: {
          cache_key: string
          expires_at: string
          fetched_at: string
          payload: Json
        }
        Insert: {
          cache_key: string
          expires_at: string
          fetched_at?: string
          payload: Json
        }
        Update: {
          cache_key?: string
          expires_at?: string
          fetched_at?: string
          payload?: Json
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
      picks_cache: {
        Row: {
          failed: number
          picks: Json
          region: string
          scanned_at: string
          scope_key: string
          sector: string
          succeeded: number
          total_scanned: number
          universe: string
        }
        Insert: {
          failed?: number
          picks?: Json
          region: string
          scanned_at?: string
          scope_key: string
          sector: string
          succeeded?: number
          total_scanned?: number
          universe: string
        }
        Update: {
          failed?: number
          picks?: Json
          region?: string
          scanned_at?: string
          scope_key?: string
          sector?: string
          succeeded?: number
          total_scanned?: number
          universe?: string
        }
        Relationships: []
      }
      price_alerts: {
        Row: {
          active: boolean
          created_at: string
          id: string
          kind: string
          last_checked_price: number | null
          note: string | null
          symbol: string
          threshold: number
          triggered_at: string | null
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          kind: string
          last_checked_price?: number | null
          note?: string | null
          symbol: string
          threshold: number
          triggered_at?: string | null
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          kind?: string
          last_checked_price?: number | null
          note?: string | null
          symbol?: string
          threshold?: number
          triggered_at?: string | null
          user_id?: string
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
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_used_at: string | null
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_used_at?: string | null
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_used_at?: string | null
          p256dh?: string
          user_agent?: string | null
          user_id?: string
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
      scan_history: {
        Row: {
          failed: number
          id: string
          picks_count: number
          preserved: boolean
          region: string
          scanned_at: string
          scope_key: string
          sector: string
          succeeded: number
          total_scanned: number
          universe: string
        }
        Insert: {
          failed?: number
          id?: string
          picks_count?: number
          preserved?: boolean
          region: string
          scanned_at?: string
          scope_key: string
          sector: string
          succeeded?: number
          total_scanned?: number
          universe: string
        }
        Update: {
          failed?: number
          id?: string
          picks_count?: number
          preserved?: boolean
          region?: string
          scanned_at?: string
          scope_key?: string
          sector?: string
          succeeded?: number
          total_scanned?: number
          universe?: string
        }
        Relationships: []
      }
      self_healing_logs: {
        Row: {
          auto_healed: boolean
          category: string
          check_name: string
          created_at: string
          details: Json
          error_message: string | null
          id: string
          severity: string
          status: string
          user_id: string | null
        }
        Insert: {
          auto_healed?: boolean
          category: string
          check_name: string
          created_at?: string
          details?: Json
          error_message?: string | null
          id?: string
          severity: string
          status: string
          user_id?: string | null
        }
        Update: {
          auto_healed?: boolean
          category?: string
          check_name?: string
          created_at?: string
          details?: Json
          error_message?: string | null
          id?: string
          severity?: string
          status?: string
          user_id?: string | null
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
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      trade_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          session_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          session_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "trade_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_chat_sessions: {
        Row: {
          created_at: string
          id: string
          symbol: string | null
          title: string
          trade_summary: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          symbol?: string | null
          title?: string
          trade_summary?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          symbol?: string | null
          title?: string
          trade_summary?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      translations_cache: {
        Row: {
          created_at: string
          hit_count: number
          source_hash: string
          source_lang: string
          source_text: string
          target_lang: string
          translated_text: string
        }
        Insert: {
          created_at?: string
          hit_count?: number
          source_hash: string
          source_lang?: string
          source_text: string
          target_lang: string
          translated_text: string
        }
        Update: {
          created_at?: string
          hit_count?: number
          source_hash?: string
          source_lang?: string
          source_text?: string
          target_lang?: string
          translated_text?: string
        }
        Relationships: []
      }
      user_portfolio_positions: {
        Row: {
          broker_currency: string | null
          broker_current_price: number | null
          broker_current_value: number | null
          broker_invested: number | null
          broker_pnl_abs: number | null
          broker_pnl_pct: number | null
          client_id: string
          created_at: string
          entry: number
          id: string
          opened_at: string
          qty: number
          side: string
          symbol: string
          updated_at: string
          user_id: string
        }
        Insert: {
          broker_currency?: string | null
          broker_current_price?: number | null
          broker_current_value?: number | null
          broker_invested?: number | null
          broker_pnl_abs?: number | null
          broker_pnl_pct?: number | null
          client_id: string
          created_at?: string
          entry: number
          id?: string
          opened_at?: string
          qty: number
          side: string
          symbol: string
          updated_at?: string
          user_id: string
        }
        Update: {
          broker_currency?: string | null
          broker_current_price?: number | null
          broker_current_value?: number | null
          broker_invested?: number | null
          broker_pnl_abs?: number | null
          broker_pnl_pct?: number | null
          client_id?: string
          created_at?: string
          entry?: number
          id?: string
          opened_at?: string
          qty?: number
          side?: string
          symbol?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          settings: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          settings?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          settings?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_trading_profile: {
        Row: {
          age_range: string | null
          ai_style: string | null
          ai_tone: string | null
          ai_transparency_ack: boolean
          confidence_threshold: number
          created_at: string
          experience_level: string | null
          explanation_depth: string | null
          markets: Json
          notif_breakout: boolean
          notif_daily: boolean
          notif_realtime: boolean
          notif_silent: boolean
          notif_weekly: boolean
          onboarding_completed: boolean
          preferred_currency: string | null
          region: string | null
          risk_level: string | null
          show_reasoning: boolean
          signal_frequency: string | null
          starter_watchlists: Json
          strategy_mode: string | null
          tour_completed: boolean
          trader_type: string | null
          trading_goal: string | null
          trusted_sources: Json
          updated_at: string
          usage_frequency: string | null
          user_id: string
        }
        Insert: {
          age_range?: string | null
          ai_style?: string | null
          ai_tone?: string | null
          ai_transparency_ack?: boolean
          confidence_threshold?: number
          created_at?: string
          experience_level?: string | null
          explanation_depth?: string | null
          markets?: Json
          notif_breakout?: boolean
          notif_daily?: boolean
          notif_realtime?: boolean
          notif_silent?: boolean
          notif_weekly?: boolean
          onboarding_completed?: boolean
          preferred_currency?: string | null
          region?: string | null
          risk_level?: string | null
          show_reasoning?: boolean
          signal_frequency?: string | null
          starter_watchlists?: Json
          strategy_mode?: string | null
          tour_completed?: boolean
          trader_type?: string | null
          trading_goal?: string | null
          trusted_sources?: Json
          updated_at?: string
          usage_frequency?: string | null
          user_id: string
        }
        Update: {
          age_range?: string | null
          ai_style?: string | null
          ai_tone?: string | null
          ai_transparency_ack?: boolean
          confidence_threshold?: number
          created_at?: string
          experience_level?: string | null
          explanation_depth?: string | null
          markets?: Json
          notif_breakout?: boolean
          notif_daily?: boolean
          notif_realtime?: boolean
          notif_silent?: boolean
          notif_weekly?: boolean
          onboarding_completed?: boolean
          preferred_currency?: string | null
          region?: string | null
          risk_level?: string | null
          show_reasoning?: boolean
          signal_frequency?: string | null
          starter_watchlists?: Json
          strategy_mode?: string | null
          tour_completed?: boolean
          trader_type?: string | null
          trading_goal?: string | null
          trusted_sources?: Json
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
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_active_subscription: {
        Args: { _env?: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
