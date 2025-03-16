import { QRCodeGenerateParams, QRCodeRegenerateParams, QRCodeReverseParams, QRCodeReverseResponse, APIError } from './types/api'

const API_BASE_URL = process.env.NEXT_PUBLIC_QRCODE_API_URL || 'https://fitnesspark-api.vercel.app'

export class QRCodeAPI {
  private baseUrl: string

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || API_BASE_URL
  }

  async generateQRCode({ id, number, version }: QRCodeGenerateParams): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/api/qrcode/${id}/${number}/${version}`)
    if (!response.ok) {
      const error = await response.json() as APIError
      throw new Error(error.error || 'Failed to generate QR code')
    }
    return response.blob()
  }

  async regenerateQRCode({ id, signature, timestamp, version }: QRCodeRegenerateParams): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/api/regenerate/${id}/${signature}/${timestamp}/${version}`)
    if (!response.ok) {
      const error = await response.json() as APIError
      throw new Error(error.error || 'Failed to regenerate QR code')
    }
    return response.blob()
  }

  async reverseQRCode(params: QRCodeReverseParams): Promise<QRCodeReverseResponse> {
    const response = await fetch(`${this.baseUrl}/api/reverse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: params.id,
        sg: params.sg,
        t: params.t,
        v: params.v
      })
    })

    if (!response.ok) {
      const error = await response.json() as APIError
      throw new Error(error.error || 'Failed to reverse QR code')
    }

    return response.json()
  }

  async reverseQRCodeGet({ id, sg, t, v }: QRCodeReverseParams): Promise<QRCodeReverseResponse> {
    const response = await fetch(`${this.baseUrl}/api/reverse/${id}/${sg}/${t}/${v}`)
    if (!response.ok) {
      const error = await response.json() as APIError
      throw new Error(error.error || 'Failed to reverse QR code')
    }
    return response.json()
  }
} 