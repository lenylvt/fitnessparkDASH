import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Button } from './ui/button'
import { Camera, X } from 'lucide-react'

interface QrScannerProps {
  onResult: (result: string) => void
  onClose: () => void
}

export function QrScanner({ onResult, onClose }: QrScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop()
      }
    }
  }, [])

  const startScanning = async () => {
    try {
      const scanner = new Html5Qrcode('qr-reader')
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          scanner.stop()
          onResult(decodedText)
        },
        () => {}
      )

      setIsScanning(true)
    } catch (err) {
      console.error('Error starting camera:', err)
    }
  }

  const stopScanning = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop()
      setIsScanning(false)
    }
  }

  return (
    <div className="relative">
      <div className="absolute right-0 top-0 z-10 p-2">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div id="qr-reader" className="w-full max-w-sm mx-auto" />
      <div className="mt-4 flex justify-center">
        {!isScanning ? (
          <Button onClick={startScanning}>
            <Camera className="mr-2 h-4 w-4" />
            Démarrer la caméra
          </Button>
        ) : (
          <Button variant="secondary" onClick={stopScanning}>
            Arrêter la caméra
          </Button>
        )}
      </div>
    </div>
  )
} 