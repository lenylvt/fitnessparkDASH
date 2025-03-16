export type QRVersion = 'QR1' | 'QR2'

export interface QRCodeGenerateParams {
  id: string
  number: string
  version: QRVersion
}

export interface QRCodeRegenerateParams {
  id: string
  signature: string
  timestamp: number
  version: QRVersion
}

export interface QRCodeReverseParams {
  id: number
  sg: string
  t: number
  v: QRVersion
}

export interface QRCodeReverseResponse {
  success: boolean
  number: string
  originalData: QRCodeReverseParams
}

export interface APIError {
  error: string
} 