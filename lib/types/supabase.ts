export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type QRCodeType = 'member' | 'guest'
export type QRVersion = 'QR1' | 'QR2'
export type SubscriptionType = 'Simple' | 'Starter' | 'Ultimate'

export interface Database {
  public: {
    Tables: {
      members: {
        Row: {
          id: string
          name: string
          subscription: SubscriptionType
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          subscription: SubscriptionType
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          subscription?: SubscriptionType
          created_at?: string
        }
      }
      qr_codes: {
        Row: {
          id: string
          member_id: string
          number: string
          version: QRVersion
          type: QRCodeType
          created_at: string
          last_used: string
        }
        Insert: {
          id?: string
          member_id: string
          number: string
          version: QRVersion
          type: QRCodeType
          created_at?: string
          last_used?: string
        }
        Update: {
          id?: string
          member_id?: string
          number?: string
          version?: QRVersion
          type?: QRCodeType
          created_at?: string
          last_used?: string
        }
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
  }
} 