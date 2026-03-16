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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: string
          performed_at: string
          performed_by: string | null
          record_id: string | null
          table_name: string
        }
        Insert: {
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: string
          performed_at?: string
          performed_by?: string | null
          record_id?: string | null
          table_name: string
        }
        Update: {
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: string
          performed_at?: string
          performed_by?: string | null
          record_id?: string | null
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      candidat_choix_disciplines: {
        Row: {
          candidat_id: string
          examen_discipline_id: string
          groupe_choix_id: string
        }
        Insert: {
          candidat_id: string
          examen_discipline_id: string
          groupe_choix_id: string
        }
        Update: {
          candidat_id?: string
          examen_discipline_id?: string
          groupe_choix_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidat_choix_disciplines_candidat_id_fkey"
            columns: ["candidat_id"]
            isOneToOne: false
            referencedRelation: "candidats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidat_choix_disciplines_examen_discipline_id_fkey"
            columns: ["examen_discipline_id"]
            isOneToOne: false
            referencedRelation: "examen_disciplines"
            referencedColumns: ["id"]
          },
        ]
      }
      candidat_lots: {
        Row: {
          candidat_id: string
          examen_discipline_id: string
          lot_id: string
          position_dans_lot: number
        }
        Insert: {
          candidat_id: string
          examen_discipline_id: string
          lot_id: string
          position_dans_lot: number
        }
        Update: {
          candidat_id?: string
          examen_discipline_id?: string
          lot_id?: string
          position_dans_lot?: number
        }
        Relationships: [
          {
            foreignKeyName: "candidat_lots_candidat_id_fkey"
            columns: ["candidat_id"]
            isOneToOne: false
            referencedRelation: "candidats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidat_lots_examen_discipline_id_fkey"
            columns: ["examen_discipline_id"]
            isOneToOne: false
            referencedRelation: "examen_disciplines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidat_lots_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
        ]
      }
      candidats: {
        Row: {
          candidat_fingerprint: string | null
          centre_id: string | null
          created_at: string
          date_naissance_enc: string | null
          etablissement_id: string
          examen_id: string
          id: string
          import_id: string | null
          lieu_naissance_enc: string | null
          matricule: string | null
          nom_enc: string
          numero_anonyme: string | null
          numero_table: number | null
          prenom_enc: string
          salle_id: string | null
          serie_id: string
          sexe: string | null
          source_candidat_id: string | null
          updated_at: string
        }
        Insert: {
          candidat_fingerprint?: string | null
          centre_id?: string | null
          created_at?: string
          date_naissance_enc?: string | null
          etablissement_id: string
          examen_id: string
          id?: string
          import_id?: string | null
          lieu_naissance_enc?: string | null
          matricule?: string | null
          nom_enc: string
          numero_anonyme?: string | null
          numero_table?: number | null
          prenom_enc: string
          salle_id?: string | null
          serie_id: string
          sexe?: string | null
          source_candidat_id?: string | null
          updated_at?: string
        }
        Update: {
          candidat_fingerprint?: string | null
          centre_id?: string | null
          created_at?: string
          date_naissance_enc?: string | null
          etablissement_id?: string
          examen_id?: string
          id?: string
          import_id?: string | null
          lieu_naissance_enc?: string | null
          matricule?: string | null
          nom_enc?: string
          numero_anonyme?: string | null
          numero_table?: number | null
          prenom_enc?: string
          salle_id?: string | null
          serie_id?: string
          sexe?: string | null
          source_candidat_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidats_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidats_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidats_examen_id_fkey"
            columns: ["examen_id"]
            isOneToOne: false
            referencedRelation: "examens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidats_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "imports_log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidats_serie_id_fkey"
            columns: ["serie_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidats_source_candidat_id_fkey"
            columns: ["source_candidat_id"]
            isOneToOne: false
            referencedRelation: "candidats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_candidats_examen_etab"
            columns: ["examen_id", "etablissement_id"]
            isOneToOne: false
            referencedRelation: "examen_etablissements"
            referencedColumns: ["examen_id", "etablissement_id"]
          },
          {
            foreignKeyName: "fk_candidats_salle"
            columns: ["salle_id"]
            isOneToOne: false
            referencedRelation: "salles"
            referencedColumns: ["id"]
          },
        ]
      }
      centres: {
        Row: {
          code: string
          code_commune: string | null
          code_departement: string | null
          created_at: string
          id: string
          is_active: boolean
          nom: string
          updated_at: string
          ville: string | null
        }
        Insert: {
          code: string
          code_commune?: string | null
          code_departement?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          nom: string
          updated_at?: string
          ville?: string | null
        }
        Update: {
          code?: string
          code_commune?: string | null
          code_departement?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          nom?: string
          updated_at?: string
          ville?: string | null
        }
        Relationships: []
      }
      codes_acces: {
        Row: {
          candidat_id: string | null
          code_hash: string
          created_at: string
          etablissement_id: string | null
          expires_at: string
          id: string
          is_active: boolean
          lockout_until: string | null
          lot_id: string
          nb_connexions: number
          tentatives: number
          used_at: string | null
        }
        Insert: {
          candidat_id?: string | null
          code_hash: string
          created_at?: string
          etablissement_id?: string | null
          expires_at: string
          id?: string
          is_active?: boolean
          lockout_until?: string | null
          lot_id: string
          nb_connexions?: number
          tentatives?: number
          used_at?: string | null
        }
        Update: {
          candidat_id?: string | null
          code_hash?: string
          created_at?: string
          etablissement_id?: string | null
          expires_at?: string
          id?: string
          is_active?: boolean
          lockout_until?: string | null
          lot_id?: string
          nb_connexions?: number
          tentatives?: number
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "codes_acces_candidat_id_fkey"
            columns: ["candidat_id"]
            isOneToOne: false
            referencedRelation: "candidats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "codes_acces_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "codes_acces_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_tentatives: {
        Row: {
          derniere_tentative: string
          examen_id: string
          id: string
          ip_hash: string
          lockout_until: string | null
          numero_anonyme: string
          tentatives: number
        }
        Insert: {
          derniere_tentative?: string
          examen_id: string
          id?: string
          ip_hash: string
          lockout_until?: string | null
          numero_anonyme: string
          tentatives?: number
        }
        Update: {
          derniere_tentative?: string
          examen_id?: string
          id?: string
          ip_hash?: string
          lockout_until?: string | null
          numero_anonyme?: string
          tentatives?: number
        }
        Relationships: [
          {
            foreignKeyName: "consultation_tentatives_examen_id_fkey"
            columns: ["examen_id"]
            isOneToOne: false
            referencedRelation: "examens"
            referencedColumns: ["id"]
          },
        ]
      }
      disciplines: {
        Row: {
          code: string
          created_at: string
          id: string
          libelle: string
          type_defaut: Database["public"]["Enums"]["discipline_type"]
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          libelle: string
          type_defaut?: Database["public"]["Enums"]["discipline_type"]
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          libelle?: string
          type_defaut?: Database["public"]["Enums"]["discipline_type"]
        }
        Relationships: []
      }
      etablissements: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          nom: string
          updated_at: string
          ville: string | null
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          nom: string
          updated_at?: string
          ville?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          nom?: string
          updated_at?: string
          ville?: string | null
        }
        Relationships: []
      }
      examen_centres: {
        Row: {
          centre_id: string
          examen_id: string
        }
        Insert: {
          centre_id: string
          examen_id: string
        }
        Update: {
          centre_id?: string
          examen_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "examen_centres_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "examen_centres_examen_id_fkey"
            columns: ["examen_id"]
            isOneToOne: false
            referencedRelation: "examens"
            referencedColumns: ["id"]
          },
        ]
      }
      examen_discipline_series: {
        Row: {
          examen_discipline_id: string
          serie_id: string
        }
        Insert: {
          examen_discipline_id: string
          serie_id: string
        }
        Update: {
          examen_discipline_id?: string
          serie_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "examen_discipline_series_examen_discipline_id_fkey"
            columns: ["examen_discipline_id"]
            isOneToOne: false
            referencedRelation: "examen_disciplines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "examen_discipline_series_serie_id_fkey"
            columns: ["serie_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
        ]
      }
      examen_disciplines: {
        Row: {
          bareme: number
          coefficient: number
          discipline_id: string
          examen_id: string
          facultatif_option:
          | Database["public"]["Enums"]["facultatif_option"]
          | null
          groupe_choix_id: string | null
          id: string
          oral_model: Database["public"]["Enums"]["oral_model"] | null
          ordre_affichage: number
          seuil_facultatif: number | null
          type: Database["public"]["Enums"]["discipline_type"]
        }
        Insert: {
          bareme?: number
          coefficient: number
          discipline_id: string
          examen_id: string
          facultatif_option?:
          | Database["public"]["Enums"]["facultatif_option"]
          | null
          groupe_choix_id?: string | null
          id?: string
          oral_model?: Database["public"]["Enums"]["oral_model"] | null
          ordre_affichage?: number
          seuil_facultatif?: number | null
          type: Database["public"]["Enums"]["discipline_type"]
        }
        Update: {
          bareme?: number
          coefficient?: number
          discipline_id?: string
          examen_id?: string
          facultatif_option?:
          | Database["public"]["Enums"]["facultatif_option"]
          | null
          groupe_choix_id?: string | null
          id?: string
          oral_model?: Database["public"]["Enums"]["oral_model"] | null
          ordre_affichage?: number
          seuil_facultatif?: number | null
          type?: Database["public"]["Enums"]["discipline_type"]
        }
        Relationships: [
          {
            foreignKeyName: "examen_disciplines_discipline_id_fkey"
            columns: ["discipline_id"]
            isOneToOne: false
            referencedRelation: "disciplines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "examen_disciplines_examen_id_fkey"
            columns: ["examen_id"]
            isOneToOne: false
            referencedRelation: "examens"
            referencedColumns: ["id"]
          },
        ]
      }
      examen_etablissements: {
        Row: {
          centre_id: string
          etablissement_id: string
          examen_id: string
        }
        Insert: {
          centre_id: string
          etablissement_id: string
          examen_id: string
        }
        Update: {
          centre_id?: string
          etablissement_id?: string
          examen_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "examen_etablissements_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "examen_etablissements_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "examen_etablissements_examen_id_fkey"
            columns: ["examen_id"]
            isOneToOne: false
            referencedRelation: "examens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_etab_centre_dans_examen"
            columns: ["examen_id", "centre_id"]
            isOneToOne: false
            referencedRelation: "examen_centres"
            referencedColumns: ["examen_id", "centre_id"]
          },
        ]
      }
      examen_lien_etablissements: {
        Row: {
          etablissement_id: string
          lien_id: string
        }
        Insert: {
          etablissement_id: string
          lien_id: string
        }
        Update: {
          etablissement_id?: string
          lien_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "examen_lien_etablissements_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "examen_lien_etablissements_lien_id_fkey"
            columns: ["lien_id"]
            isOneToOne: false
            referencedRelation: "examen_liens"
            referencedColumns: ["id"]
          },
        ]
      }
      examen_liens: {
        Row: {
          created_at: string
          examen_cible_id: string
          examen_source_id: string
          id: string
          mode_heritage: string
        }
        Insert: {
          created_at?: string
          examen_cible_id: string
          examen_source_id: string
          id?: string
          mode_heritage?: string
        }
        Update: {
          created_at?: string
          examen_cible_id?: string
          examen_source_id?: string
          id?: string
          mode_heritage?: string
        }
        Relationships: [
          {
            foreignKeyName: "examen_liens_examen_cible_id_fkey"
            columns: ["examen_cible_id"]
            isOneToOne: true
            referencedRelation: "examens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "examen_liens_examen_source_id_fkey"
            columns: ["examen_source_id"]
            isOneToOne: false
            referencedRelation: "examens"
            referencedColumns: ["id"]
          },
        ]
      }
      examen_series: {
        Row: {
          examen_id: string
          serie_id: string
        }
        Insert: {
          examen_id: string
          serie_id: string
        }
        Update: {
          examen_id?: string
          serie_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "examen_series_examen_id_fkey"
            columns: ["examen_id"]
            isOneToOne: false
            referencedRelation: "examens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "examen_series_serie_id_fkey"
            columns: ["serie_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
        ]
      }
      examens: {
        Row: {
          annee: number
          anonymat_actif: boolean
          anonymat_bon: number
          anonymat_debut: number
          anonymat_prefixe: string
          code: string
          created_at: string
          created_by: string | null
          date_composition_debut: string | null
          date_composition_fin: string | null
          date_deliberation: string | null
          date_publication: string | null
          distribution_model: Database["public"]["Enums"]["distribution_model"]
          eps_active: boolean
          facultatif_actif: boolean
          hmac_window_days: number
          id: string
          libelle: string
          mode_deliberation: Database["public"]["Enums"]["deliberation_mode"]
          oral_actif: boolean
          rattrapage_actif: boolean
          seuil_phase1: number
          seuil_phase2: number
          seuil_rattrapage: number | null
          logo_url: string | null
          signature_url: string | null
          status: Database["public"]["Enums"]["exam_status"]
          table_continuity_scope: Database["public"]["Enums"]["table_continuity_scope"]
          table_padding: number
          table_prefix_type: Database["public"]["Enums"]["table_prefix_mode"]
          table_prefix_valeur: string | null
          table_separator: string
          taille_salle_ref: number
          updated_at: string
        }
        Insert: {
          annee: number
          anonymat_actif?: boolean
          anonymat_bon?: number
          anonymat_debut?: number
          anonymat_prefixe?: string
          code: string
          created_at?: string
          created_by?: string | null
          date_composition_debut?: string | null
          date_composition_fin?: string | null
          date_deliberation?: string | null
          date_publication?: string | null
          distribution_model?: Database["public"]["Enums"]["distribution_model"]
          eps_active?: boolean
          facultatif_actif?: boolean
          hmac_window_days?: number
          id?: string
          libelle: string
          mode_deliberation?: Database["public"]["Enums"]["deliberation_mode"]
          oral_actif?: boolean
          rattrapage_actif?: boolean
          seuil_phase1?: number
          seuil_phase2?: number
          seuil_rattrapage?: number | null
          logo_url?: string | null
          signature_url?: string | null
          status?: Database["public"]["Enums"]["exam_status"]
          table_continuity_scope?: Database["public"]["Enums"]["table_continuity_scope"]
          table_padding?: number
          table_prefix_type?: Database["public"]["Enums"]["table_prefix_mode"]
          table_prefix_valeur?: string | null
          table_separator?: string
          taille_salle_ref?: number
          updated_at?: string
        }
        Update: {
          annee?: number
          anonymat_actif?: boolean
          anonymat_bon?: number
          anonymat_debut?: number
          anonymat_prefixe?: string
          code?: string
          created_at?: string
          created_by?: string | null
          date_composition_debut?: string | null
          date_composition_fin?: string | null
          date_deliberation?: string | null
          date_publication?: string | null
          distribution_model?: Database["public"]["Enums"]["distribution_model"]
          eps_active?: boolean
          facultatif_actif?: boolean
          hmac_window_days?: number
          id?: string
          libelle?: string
          mode_deliberation?: Database["public"]["Enums"]["deliberation_mode"]
          oral_actif?: boolean
          rattrapage_actif?: boolean
          seuil_phase1?: number
          seuil_phase2?: number
          seuil_rattrapage?: number | null
          logo_url?: string | null
          signature_url?: string | null
          status?: Database["public"]["Enums"]["exam_status"]
          table_continuity_scope?: Database["public"]["Enums"]["table_continuity_scope"]
          table_padding?: number
          table_prefix_type?: Database["public"]["Enums"]["table_prefix_mode"]
          table_prefix_valeur?: string | null
          table_separator?: string
          taille_salle_ref?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "examens_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      imports_log: {
        Row: {
          created_at: string
          erreurs_detail: Json | null
          etablissement_id: string
          examen_id: string
          fichier_nom: string | null
          id: string
          import_legal_confirmed: boolean
          import_legal_confirmed_at: string | null
          import_legal_confirmed_by: string | null
          imported_by: string
          is_heritage: boolean
          nb_candidats_fichier: number
          nb_erreurs: number
          nb_succes: number
        }
        Insert: {
          created_at?: string
          erreurs_detail?: Json | null
          etablissement_id: string
          examen_id: string
          fichier_nom?: string | null
          id?: string
          import_legal_confirmed?: boolean
          import_legal_confirmed_at?: string | null
          import_legal_confirmed_by?: string | null
          imported_by: string
          is_heritage?: boolean
          nb_candidats_fichier?: number
          nb_erreurs?: number
          nb_succes?: number
        }
        Update: {
          created_at?: string
          erreurs_detail?: Json | null
          etablissement_id?: string
          examen_id?: string
          fichier_nom?: string | null
          id?: string
          import_legal_confirmed?: boolean
          import_legal_confirmed_at?: string | null
          import_legal_confirmed_by?: string | null
          imported_by?: string
          is_heritage?: boolean
          nb_candidats_fichier?: number
          nb_erreurs?: number
          nb_succes?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_imports_log_examen_etab"
            columns: ["examen_id", "etablissement_id"]
            isOneToOne: false
            referencedRelation: "examen_etablissements"
            referencedColumns: ["examen_id", "etablissement_id"]
          },
          {
            foreignKeyName: "imports_log_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imports_log_examen_id_fkey"
            columns: ["examen_id"]
            isOneToOne: false
            referencedRelation: "examens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imports_log_import_legal_confirmed_by_fkey"
            columns: ["import_legal_confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imports_log_imported_by_fkey"
            columns: ["imported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ip_rate_limits: {
        Row: {
          count: number
          ip_hash: string
          window_start: string
        }
        Insert: {
          count?: number
          ip_hash: string
          window_start?: string
        }
        Update: {
          count?: number
          ip_hash?: string
          window_start?: string
        }
        Relationships: []
      }
      lots: {
        Row: {
          centre_id: string
          created_at: string
          examen_discipline_id: string
          examen_id: string
          generation_timestamp: string | null
          hmac_signature: string | null
          id: string
          lot_numero: number
          nb_copies: number
          serie_id: string | null
          status: Database["public"]["Enums"]["lot_status"]
          updated_at: string
        }
        Insert: {
          centre_id: string
          created_at?: string
          examen_discipline_id: string
          examen_id: string
          generation_timestamp?: string | null
          hmac_signature?: string | null
          id?: string
          lot_numero: number
          nb_copies: number
          serie_id?: string | null
          status?: Database["public"]["Enums"]["lot_status"]
          updated_at?: string
        }
        Update: {
          centre_id?: string
          created_at?: string
          examen_discipline_id?: string
          examen_id?: string
          generation_timestamp?: string | null
          hmac_signature?: string | null
          id?: string
          lot_numero?: number
          nb_copies?: number
          serie_id?: string | null
          status?: Database["public"]["Enums"]["lot_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lots_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lots_examen_discipline_id_fkey"
            columns: ["examen_discipline_id"]
            isOneToOne: false
            referencedRelation: "examen_disciplines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lots_examen_id_fkey"
            columns: ["examen_id"]
            isOneToOne: false
            referencedRelation: "examens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lots_serie_id_fkey"
            columns: ["serie_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email_login: string
          id: string
          is_active: boolean
          nom: string
          prenom: string
          role: Database["public"]["Enums"]["user_role"]
          telephone: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          created_at?: string
          email_login: string
          id: string
          is_active?: boolean
          nom: string
          prenom: string
          role: Database["public"]["Enums"]["user_role"]
          telephone?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          created_at?: string
          email_login?: string
          id?: string
          is_active?: boolean
          nom?: string
          prenom?: string
          role?: Database["public"]["Enums"]["user_role"]
          telephone?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      resultats: {
        Row: {
          admissible_phase1: boolean | null
          candidat_id: string
          delibere_at: string | null
          delibere_par: string | null
          examen_id: string
          id: string
          moyenne_centimes: number | null
          phase: number
          revision_motif: string | null
          status: Database["public"]["Enums"]["resultat_status"]
        }
        Insert: {
          admissible_phase1?: boolean | null
          candidat_id: string
          delibere_at?: string | null
          delibere_par?: string | null
          examen_id: string
          id?: string
          moyenne_centimes?: number | null
          phase?: number
          revision_motif?: string | null
          status: Database["public"]["Enums"]["resultat_status"]
        }
        Update: {
          admissible_phase1?: boolean | null
          candidat_id?: string
          delibere_at?: string | null
          delibere_par?: string | null
          examen_id?: string
          id?: string
          moyenne_centimes?: number | null
          phase?: number
          revision_motif?: string | null
          status?: Database["public"]["Enums"]["resultat_status"]
        }
        Relationships: [
          {
            foreignKeyName: "resultats_candidat_id_fkey"
            columns: ["candidat_id"]
            isOneToOne: false
            referencedRelation: "candidats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resultats_delibere_par_fkey"
            columns: ["delibere_par"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resultats_examen_id_fkey"
            columns: ["examen_id"]
            isOneToOne: false
            referencedRelation: "examens"
            referencedColumns: ["id"]
          },
        ]
      }
      saisies: {
        Row: {
          candidat_id: string
          code_acces_id: string | null
          code_special: string | null
          id: string
          lot_id: string
          note_centimes: number | null
          numero_anonyme: string
          saisi_at: string
          verifie_at: string | null
          verifie_par: string | null
        }
        Insert: {
          candidat_id: string
          code_acces_id?: string | null
          code_special?: string | null
          id?: string
          lot_id: string
          note_centimes?: number | null
          numero_anonyme: string
          saisi_at?: string
          verifie_at?: string | null
          verifie_par?: string | null
        }
        Update: {
          candidat_id?: string
          code_acces_id?: string | null
          code_special?: string | null
          id?: string
          lot_id?: string
          note_centimes?: number | null
          numero_anonyme?: string
          saisi_at?: string
          verifie_at?: string | null
          verifie_par?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saisies_candidat_id_fkey"
            columns: ["candidat_id"]
            isOneToOne: false
            referencedRelation: "candidats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saisies_code_acces_id_fkey"
            columns: ["code_acces_id"]
            isOneToOne: false
            referencedRelation: "codes_acces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saisies_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saisies_verifie_par_fkey"
            columns: ["verifie_par"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      salles: {
        Row: {
          capacite: number
          centre_id: string
          examen_id: string
          id: string
          nom: string
          ordre: number
          regle_affectation: Database["public"]["Enums"]["affectation_rule"]
        }
        Insert: {
          capacite: number
          centre_id: string
          examen_id: string
          id?: string
          nom: string
          ordre?: number
          regle_affectation?: Database["public"]["Enums"]["affectation_rule"]
        }
        Update: {
          capacite?: number
          centre_id?: string
          examen_id?: string
          id?: string
          nom?: string
          ordre?: number
          regle_affectation?: Database["public"]["Enums"]["affectation_rule"]
        }
        Relationships: [
          {
            foreignKeyName: "salles_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salles_examen_id_fkey"
            columns: ["examen_id"]
            isOneToOne: false
            referencedRelation: "examens"
            referencedColumns: ["id"]
          },
        ]
      }
      series: {
        Row: {
          code: string
          created_at: string
          id: string
          libelle: string
          ordre: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          libelle: string
          ordre?: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          libelle?: string
          ordre?: number
        }
        Relationships: []
      }
      user_centres: {
        Row: {
          centre_id: string
          user_id: string
        }
        Insert: {
          centre_id: string
          user_id: string
        }
        Update: {
          centre_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_centres_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_centres_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_etablissements: {
        Row: {
          etablissement_id: string
          user_id: string
        }
        Insert: {
          etablissement_id: string
          user_id: string
        }
        Update: {
          etablissement_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_etablissements_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_etablissements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_candidats_affichage: {
        Row: {
          candidat_fingerprint: string | null
          centre_id: string | null
          created_at: string | null
          date_naissance_enc: string | null
          etablissement_id: string | null
          examen_id: string | null
          id: string | null
          import_id: string | null
          lieu_naissance_enc: string | null
          matricule: string | null
          nom_enc: string | null
          numero_anonyme: string | null
          numero_table: number | null
          numero_table_formate: string | null
          prenom_enc: string | null
          salle_id: string | null
          serie_id: string | null
          sexe: string | null
          source_candidat_id: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidats_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidats_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidats_examen_id_fkey"
            columns: ["examen_id"]
            isOneToOne: false
            referencedRelation: "examens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidats_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "imports_log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidats_serie_id_fkey"
            columns: ["serie_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidats_source_candidat_id_fkey"
            columns: ["source_candidat_id"]
            isOneToOne: false
            referencedRelation: "candidats"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Functions: {
      affecter_candidats_salles: {
        Args: { p_centre_id: string; p_examen_id: string }
        Returns: number
      }
      calculer_moyenne_candidat: {
        Args: { p_candidat_id: string; p_phase: number }
        Returns: number
      }
      check_ip_rate_limit: {
        Args: { p_ip_hash: string; p_max?: number }
        Returns: boolean
      }
      compter_notes_manquantes: {
        Args: { p_examen_id: string }
        Returns: {
          candidat_id: string
          nb_notes_manquantes: number
        }[]
      }
      creer_lots_centre: {
        Args: {
          p_centre_id: string
          p_examen_discipline_id: string
          p_examen_id: string
          p_serie_id?: string
        }
        Returns: number
      }
      deliberer_candidat: {
        Args: { p_candidat_id: string; p_delibere_par: string }
        Returns: Database["public"]["Enums"]["resultat_status"]
      }
      deliberer_examen: {
        Args: { p_delibere_par: string; p_examen_id: string }
        Returns: Json
      }
      examen_est_modifiable: { Args: { p_examen_id: string }; Returns: boolean }
      generer_anonymats_centre: {
        Args: { p_centre_id: string; p_examen_id: string }
        Returns: number
      }
      is_admin: { Args: never; Returns: boolean }
      is_chef_centre: { Args: never; Returns: boolean }
      is_chef_etablissement: { Args: never; Returns: boolean }
      is_tutelle: { Args: never; Returns: boolean }
      my_centre_ids: { Args: never; Returns: string[] }
      my_etablissement_ids: { Args: never; Returns: string[] }
      purger_examen_definitif: {
        Args: {
          p_confirmer?: boolean
          p_examen_id: string
          p_supprimer_audit?: boolean
        }
        Returns: Json
      }
      recherche_resultat_public: {
        Args: { p_examen_id: string; p_numero_anonyme: string }
        Returns: {
          moyenne_centimes: number
          phase: number
          status: Database["public"]["Enums"]["resultat_status"]
        }[]
      }
    }
    Enums: {
      affectation_rule: "alphabetique" | "numero_anonyme" | "par_etablissement"
      deliberation_mode: "unique" | "deux_phases"
      discipline_type: "ecrit_obligatoire" | "oral" | "eps" | "facultatif"
      distribution_model: "A" | "B"
      exam_status:
      | "CONFIG"
      | "INSCRIPTIONS"
      | "COMPOSITION"
      | "CORRECTION"
      | "DELIBERATION"
      | "DELIBERE"
      | "CORRECTION_POST_DELIBERATION"
      | "PUBLIE"
      | "CLOS"
      facultatif_option: "1" | "2"
      lot_status: "EN_ATTENTE" | "EN_COURS" | "TERMINE" | "VERIFIE"
      oral_model: "A" | "B"
      resultat_status: "ADMIS" | "NON_ADMIS" | "RATTRAPAGE"
      table_continuity_scope: "CENTRE" | "DEPARTEMENT" | "EXAMEN"
      table_prefix_mode: "AUCUN" | "FIXE" | "CENTRE" | "COMMUNE" | "DEPARTEMENT"
      user_role: "admin" | "chef_centre" | "chef_etablissement" | "tutelle"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      affectation_rule: ["alphabetique", "numero_anonyme", "par_etablissement"],
      deliberation_mode: ["unique", "deux_phases"],
      discipline_type: ["ecrit_obligatoire", "oral", "eps", "facultatif"],
      distribution_model: ["A", "B"],
      exam_status: [
        "CONFIG",
        "INSCRIPTIONS",
        "COMPOSITION",
        "CORRECTION",
        "DELIBERATION",
        "DELIBERE",
        "CORRECTION_POST_DELIBERATION",
        "PUBLIE",
        "CLOS",
      ],
      facultatif_option: ["1", "2"],
      lot_status: ["EN_ATTENTE", "EN_COURS", "TERMINE", "VERIFIE"],
      oral_model: ["A", "B"],
      resultat_status: ["ADMIS", "NON_ADMIS", "RATTRAPAGE"],
      table_continuity_scope: ["CENTRE", "DEPARTEMENT", "EXAMEN"],
      table_prefix_mode: ["AUCUN", "FIXE", "CENTRE", "COMMUNE", "DEPARTEMENT"],
      user_role: ["admin", "chef_centre", "chef_etablissement", "tutelle"],
    },
  },
} as const
