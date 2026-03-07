// Ce fichier est un stub (gabarit temporaire) généré car Supabase local n'était pas démarré.
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
            profiles: {
                Row: {
                    id: string
                    role: string
                    email: string
                    nom: string | null
                    prenom: string | null
                    created_at: string
                }
                Insert: {
                    id: string
                    role?: string
                    email: string
                    nom?: string | null
                    prenom?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    role?: string
                    email?: string
                    nom?: string | null
                    prenom?: string | null
                    created_at?: string
                }
                Relationships: []
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}
