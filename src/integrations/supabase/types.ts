export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      creneaux: {
        Row: {
          actif: boolean | null
          created_at: string
          date_creneau: string
          heure_debut: string
          heure_fin: string
          id: string
          max_participants: number | null
          notes: string | null
          responsable_id: string | null
          type_activite_id: string
          updated_at: string
        }
        Insert: {
          actif?: boolean | null
          created_at?: string
          date_creneau: string
          heure_debut: string
          heure_fin: string
          id?: string
          max_participants?: number | null
          notes?: string | null
          responsable_id?: string | null
          type_activite_id: string
          updated_at?: string
        }
        Update: {
          actif?: boolean | null
          created_at?: string
          date_creneau?: string
          heure_debut?: string
          heure_fin?: string
          id?: string
          max_participants?: number | null
          notes?: string | null
          responsable_id?: string | null
          type_activite_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creneaux_responsable_id_fkey"
            columns: ["responsable_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creneaux_type_activite_id_fkey"
            columns: ["type_activite_id"]
            isOneToOne: false
            referencedRelation: "type_activite"
            referencedColumns: ["id"]
          },
        ]
      }
      creneaux_recurrents: {
        Row: {
          actif: boolean | null
          created_at: string
          date_debut: string
          date_fin: string
          heure_debut: string
          heure_fin: string
          id: string
          jours_semaine: number[]
          semaines_mois: number[]
          type_activite_id: string
          updated_at: string
        }
        Insert: {
          actif?: boolean | null
          created_at?: string
          date_debut: string
          date_fin: string
          heure_debut: string
          heure_fin: string
          id?: string
          jours_semaine: number[]
          semaines_mois: number[]
          type_activite_id: string
          updated_at?: string
        }
        Update: {
          actif?: boolean | null
          created_at?: string
          date_debut?: string
          date_fin?: string
          heure_debut?: string
          heure_fin?: string
          id?: string
          jours_semaine?: number[]
          semaines_mois?: number[]
          type_activite_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creneaux_recurrents_type_activite_id_fkey"
            columns: ["type_activite_id"]
            isOneToOne: false
            referencedRelation: "type_activite"
            referencedColumns: ["id"]
          },
        ]
      }
      inscriptions: {
        Row: {
          confirme: boolean | null
          created_at: string
          creneau_id: string
          date_inscription: string
          id: string
          notes: string | null
          proclamateur_id: string
          statut: string | null
        }
        Insert: {
          confirme?: boolean | null
          created_at?: string
          creneau_id: string
          date_inscription?: string
          id?: string
          notes?: string | null
          proclamateur_id: string
          statut?: string | null
        }
        Update: {
          confirme?: boolean | null
          created_at?: string
          creneau_id?: string
          date_inscription?: string
          id?: string
          notes?: string | null
          proclamateur_id?: string
          statut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inscriptions_creneau_id_fkey"
            columns: ["creneau_id"]
            isOneToOne: false
            referencedRelation: "creneaux"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscriptions_proclamateur_id_fkey"
            columns: ["proclamateur_id"]
            isOneToOne: false
            referencedRelation: "proclamateurs"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          metadata: Json | null
          read: boolean
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      parametrages: {
        Row: {
          cle: string
          description: string | null
          id: string
          updated_at: string
          valeur: string
        }
        Insert: {
          cle: string
          description?: string | null
          id?: string
          updated_at?: string
          valeur: string
        }
        Update: {
          cle?: string
          description?: string | null
          id?: string
          updated_at?: string
          valeur?: string
        }
        Relationships: []
      }
      proclamateurs: {
        Row: {
          ancien: boolean | null
          assistant_ministeriel: boolean | null
          created_at: string
          frère: boolean | null
          id: string
          notes: string | null
          pionnier: boolean | null
          profile_id: string
          updated_at: string
        }
        Insert: {
          ancien?: boolean | null
          assistant_ministeriel?: boolean | null
          created_at?: string
          frère?: boolean | null
          id?: string
          notes?: string | null
          pionnier?: boolean | null
          profile_id: string
          updated_at?: string
        }
        Update: {
          ancien?: boolean | null
          assistant_ministeriel?: boolean | null
          created_at?: string
          frère?: boolean | null
          id?: string
          notes?: string | null
          pionnier?: boolean | null
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proclamateurs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          nom: string
          prenom: string
          role: Database["public"]["Enums"]["role_type"]
          status: Database["public"]["Enums"]["status_type"]
          telephone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nom: string
          prenom: string
          role?: Database["public"]["Enums"]["role_type"]
          status?: Database["public"]["Enums"]["status_type"]
          telephone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nom?: string
          prenom?: string
          role?: Database["public"]["Enums"]["role_type"]
          status?: Database["public"]["Enums"]["status_type"]
          telephone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rapports: {
        Row: {
          annee: number
          approuve: boolean | null
          approuve_par: string | null
          created_at: string
          creneau_id: string | null
          date_approbation: string | null
          etudes_bibliques: number | null
          heures_predication: number | null
          id: string
          mois: number
          notes: string | null
          placements: number | null
          proclamateur_id: string
          soumis_le: string | null
          updated_at: string
          videos: number | null
          visible_publiquement: boolean | null
        }
        Insert: {
          annee: number
          approuve?: boolean | null
          approuve_par?: string | null
          created_at?: string
          creneau_id?: string | null
          date_approbation?: string | null
          etudes_bibliques?: number | null
          heures_predication?: number | null
          id?: string
          mois: number
          notes?: string | null
          placements?: number | null
          proclamateur_id: string
          soumis_le?: string | null
          updated_at?: string
          videos?: number | null
          visible_publiquement?: boolean | null
        }
        Update: {
          annee?: number
          approuve?: boolean | null
          approuve_par?: string | null
          created_at?: string
          creneau_id?: string | null
          date_approbation?: string | null
          etudes_bibliques?: number | null
          heures_predication?: number | null
          id?: string
          mois?: number
          notes?: string | null
          placements?: number | null
          proclamateur_id?: string
          soumis_le?: string | null
          updated_at?: string
          videos?: number | null
          visible_publiquement?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_rapports_creneau"
            columns: ["creneau_id"]
            isOneToOne: false
            referencedRelation: "creneaux"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapports_approuve_par_fkey"
            columns: ["approuve_par"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapports_creneau_id_fkey"
            columns: ["creneau_id"]
            isOneToOne: false
            referencedRelation: "creneaux"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapports_proclamateur_id_fkey"
            columns: ["proclamateur_id"]
            isOneToOne: false
            referencedRelation: "proclamateurs"
            referencedColumns: ["id"]
          },
        ]
      }
      type_activite: {
        Row: {
          actif: boolean | null
          auto_create_slots: boolean | null
          created_at: string
          default_heure_debut: string | null
          default_heure_fin: string | null
          description: string | null
          duree_minutes: number | null
          id: string
          nom: string
          recurrence_days: number[] | null
          recurrence_enabled: boolean | null
          recurrence_weeks: number[] | null
          valideur_id: string | null
        }
        Insert: {
          actif?: boolean | null
          auto_create_slots?: boolean | null
          created_at?: string
          default_heure_debut?: string | null
          default_heure_fin?: string | null
          description?: string | null
          duree_minutes?: number | null
          id?: string
          nom: string
          recurrence_days?: number[] | null
          recurrence_enabled?: boolean | null
          recurrence_weeks?: number[] | null
          valideur_id?: string | null
        }
        Update: {
          actif?: boolean | null
          auto_create_slots?: boolean | null
          created_at?: string
          default_heure_debut?: string | null
          default_heure_fin?: string | null
          description?: string | null
          duree_minutes?: number | null
          id?: string
          nom?: string
          recurrence_days?: number[] | null
          recurrence_enabled?: boolean | null
          recurrence_weeks?: number[] | null
          valideur_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "type_activite_valideur_id_fkey"
            columns: ["valideur_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      activite_type:
        | "predication"
        | "etude_biblique"
        | "visite_retour"
        | "autre"
      role_type: "admin" | "responsable" | "proclamateur"
      status_type: "actif" | "inactif" | "temporaire"
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
      activite_type: [
        "predication",
        "etude_biblique",
        "visite_retour",
        "autre",
      ],
      role_type: ["admin", "responsable", "proclamateur"],
      status_type: ["actif", "inactif", "temporaire"],
    },
  },
} as const
