import { createClient } from '@supabase/supabase-js'
import { Database, QRVersion, QRCodeType, SubscriptionType } from './types/supabase'
import { QRCodeAPI } from './qrcode-api'

// Environment variables type check
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Create Supabase client with types
export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Create QR Code API client
export const qrcodeApi = new QRCodeAPI()

// Database Types
export interface Profile {
  id: string
  name: string
  subscription: SubscriptionType
  created_at: string
}

export interface QRCode {
  id: string
  member_id: string
  number: string
  version: QRVersion
  type: QRCodeType
  created_at: string
  last_used: string
}

// Enums for better type safety
export type SubscriptionTier = 'Simple' | 'Starter' | 'Ultimate'

// Helper functions
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getCurrentProfile() {
  const user = await getCurrentUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
}

export async function getUserQRCodes(userId: string) {
  const { data: qrCodes } = await supabase
    .from('qr_codes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  return qrCodes
}

// QR Code operations
export async function generateQRCode(id: string, number: string, version: QRVersion): Promise<Blob> {
  return qrcodeApi.generateQRCode({ id, number, version })
}

export async function regenerateQRCode(id: string, signature: string, timestamp: number, version: QRVersion): Promise<Blob> {
  return qrcodeApi.regenerateQRCode({ id, signature, timestamp, version })
}

export async function reverseQRCode(params: { id: number, signature: string, timestamp: number, version: QRVersion }) {
  return qrcodeApi.reverseQRCode({
    id: params.id,
    sg: params.signature,
    t: params.timestamp,
    v: params.version
  })
} 