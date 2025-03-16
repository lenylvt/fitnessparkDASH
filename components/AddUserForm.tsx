import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { QRCodeType, QRVersion, SubscriptionType } from '../lib/types/supabase'
import { Camera, Upload } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { QrScanner } from './QrScanner'

interface QRCodeData {
  id: string
  number: string
  version: QRVersion
  type: QRCodeType
}

interface AddUserFormProps {
  onSubmit: (data: {
    name: string
    subscription: SubscriptionType
    qrCodes: QRCodeData[]
  }) => void
  onCancel: () => void
  initialData?: {
    name?: string
    subscription?: SubscriptionType
    qrCode?: {
      id: string
      number: string
      version: QRVersion
    }
  } | null
}

export function AddUserForm({ onSubmit, onCancel, initialData }: AddUserFormProps) {
  const [name, setName] = useState(initialData?.name || '')
  const [subscription, setSubscription] = useState<SubscriptionType>(initialData?.subscription || 'Simple')
  const [guestQRCodes, setGuestQRCodes] = useState<QRCodeData[]>([])
  const [showAddGuest, setShowAddGuest] = useState(false)
  const [guestNumber, setGuestNumber] = useState('')
  const [guestId, setGuestId] = useState('')
  const [memberNumber, setMemberNumber] = useState(initialData?.qrCode?.number || '')
  const [memberId, setMemberId] = useState(initialData?.qrCode?.id || '')
  const [showMemberScanner, setShowMemberScanner] = useState(false)
  const [showGuestScanner, setShowGuestScanner] = useState(false)
  const [scanTarget, setScanTarget] = useState<'member' | 'guest'>('member')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const qrCodes: QRCodeData[] = []

    // Add member QR code if provided
    if (memberId && memberNumber) {
      qrCodes.push({
        id: memberId,
        number: memberNumber,
        version: 'QR2',
        type: 'member'
      })
    }

    // Add guest QR codes
    qrCodes.push(...guestQRCodes)

    if (qrCodes.length === 0) {
      alert('Veuillez ajouter au moins un QR code')
      return
    }

    onSubmit({
      name,
      subscription,
      qrCodes
    })
  }

  const addGuestQRCode = () => {
    if (guestId && guestNumber && guestQRCodes.length < 5) {
      setGuestQRCodes([
        ...guestQRCodes,
        {
          id: guestId,
          number: guestNumber,
          version: 'QR1',
          type: 'guest'
        }
      ])
      setGuestNumber('')
      setGuestId('')
      setShowAddGuest(false)
    }
  }

  const removeGuestQRCode = (index: number) => {
    setGuestQRCodes(guestQRCodes.filter((_, i) => i !== index))
  }

  const handleScanResult = async (result: string) => {
    try {
      setIsLoading(true)
      
      // Parse the QR code data
      let data;
      try {
        data = JSON.parse(result);
      } catch (e) {
        // Try to handle non-JSON QR codes
        console.log("Failed to parse as JSON, trying alternative format:", result);
        
        // Try to extract data from a non-JSON format
        const matches = result.match(/id[\"']?\s*:\s*[\"']?(\d+)[\"']?.*sg[\"']?\s*:\s*[\"']?([^\"',}]+)[\"']?.*t[\"']?\s*:\s*[\"']?(\d+)[\"']?.*v[\"']?\s*:\s*[\"']?([^\"',}]+)[\"']?/);
        
        if (matches && matches.length >= 5) {
          data = {
            id: matches[1],
            sg: matches[2],
            t: parseInt(matches[3]),
            v: matches[4]
          };
          console.log("Extracted data:", data);
        } else {
          throw new Error("Format de QR code non reconnu");
        }
      }
      
      if (!data || !data.id) {
        throw new Error('Format de QR code invalide: ID manquant');
      }
      
      // Convert numeric ID to string if needed
      const qrId = String(data.id);
      const signature = data.sg;
      const timestamp = data.t;
      const version = data.v;
      
      console.log(`Calling API with: id=${qrId}, sg=${signature}, t=${timestamp}, v=${version}`);
      
      // Call the reverse API to get the number
      const apiUrl = `https://fitnesspark-api.vercel.app/api/reverse/${qrId}/${signature}/${timestamp}/${version}`;
      console.log("API URL:", apiUrl);
      
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status} ${response.statusText}`);
      }

      const decoded = await response.json();
      console.log("API response:", decoded);

      if (decoded.success) {
        if (scanTarget === 'member') {
          setMemberId(qrId);
          setMemberNumber(decoded.number);
          setShowMemberScanner(false);
        } else {
          setGuestId(qrId);
          setGuestNumber(decoded.number);
          setShowGuestScanner(false);
        }
      } else {
        throw new Error(decoded.error || 'QR code invalide');
      }
    } catch (error) {
      console.error('Error processing QR code:', error);
      alert(`QR code invalide ou mal formaté: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsLoading(false);
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, target: 'member' | 'guest') => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        // This is a simplified example - in a real app, you'd need to process the image
        // to extract QR code data using a library like jsQR
        alert('Fonctionnalité en développement: extraction de QR code depuis une image')
        
        // For now, we'll just show a placeholder message
        // In a real implementation, you would extract the QR code data and call handleScanResult
      } catch (error) {
        console.error('Error processing image:', error)
        alert('Erreur lors du traitement de l\'image. Veuillez réessayer.')
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="max-h-[70vh] overflow-y-auto pr-4">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-3">
          <Label htmlFor="name">Nom de la personne</Label>
          <Input
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
          />
        </div>

        <div className="space-y-3">
          <Label>Type d&apos;abonnement</Label>
          <Select value={subscription} onValueChange={(value: SubscriptionType) => setSubscription(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir un abonnement" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Simple">Simple</SelectItem>
              <SelectItem value="Starter">Starter</SelectItem>
              <SelectItem value="Ultimate">Ultimate</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>QR Code Adhérent</Label>
          </div>

          <div className="space-y-4 p-4 border rounded-lg">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center">
                  <Label htmlFor="memberId">ID du QR Code</Label>
                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setScanTarget('member')
                        setShowMemberScanner(true)
                      }}
                      disabled={isLoading}
                    >
                      <Camera className="h-4 w-4 mr-1" />
                      Scanner
                    </Button>
                    <div className="relative">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        className="relative"
                        onClick={() => document.getElementById('memberFileUpload')?.click()}
                        disabled={isLoading}
                      >
                        <Upload className="h-4 w-4 mr-1" />
                        Importer
                      </Button>
                      <input
                        id="memberFileUpload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'member')}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </div>
                <Input
                  id="memberId"
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  placeholder="ID du QR code"
                  required
                  className="mt-2"
                  disabled={isLoading}
                />
              </div>
              <div className="mt-4">
                <Label htmlFor="memberNumber">Numéro du QR Code</Label>
                <Input
                  id="memberNumber"
                  value={memberNumber}
                  onChange={(e) => setMemberNumber(e.target.value)}
                  placeholder="Numéro du QR code"
                  required
                  className="mt-2"
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>
        </div>

        {subscription === 'Ultimate' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>QR Codes Invités ({guestQRCodes.length}/5)</Label>
              {guestQRCodes.length < 5 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddGuest(true)}
                  disabled={isLoading}
                >
                  Ajouter un QR code invité
                </Button>
              )}
            </div>

            {guestQRCodes.length > 0 && (
              <div className="space-y-3">
                {guestQRCodes.map((qr, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <div className="font-medium">Invité #{index + 1}</div>
                      <div className="text-sm mt-1">ID: {qr.id}</div>
                      <div className="text-sm">Numéro: {qr.number}</div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeGuestQRCode(index)}
                      disabled={isLoading}
                    >
                      Supprimer
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {showAddGuest && (
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center">
                      <Label htmlFor="guestId">ID du QR Code Invité</Label>
                      <div className="flex gap-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setScanTarget('guest')
                            setShowGuestScanner(true)
                          }}
                          disabled={isLoading}
                        >
                          <Camera className="h-4 w-4 mr-1" />
                          Scanner
                        </Button>
                        <div className="relative">
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            className="relative"
                            onClick={() => document.getElementById('guestFileUpload')?.click()}
                            disabled={isLoading}
                          >
                            <Upload className="h-4 w-4 mr-1" />
                            Importer
                          </Button>
                          <input
                            id="guestFileUpload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, 'guest')}
                            disabled={isLoading}
                          />
                        </div>
                      </div>
                    </div>
                    <Input
                      id="guestId"
                      value={guestId}
                      onChange={(e) => setGuestId(e.target.value)}
                      placeholder="ID du QR code"
                      required
                      className="mt-2"
                      disabled={isLoading}
                    />
                  </div>
                  <div className="mt-4">
                    <Label htmlFor="guestNumber">Numéro du QR Code Invité</Label>
                    <Input
                      id="guestNumber"
                      value={guestNumber}
                      onChange={(e) => setGuestNumber(e.target.value)}
                      placeholder="Numéro du QR code"
                      required
                      className="mt-2"
                      disabled={isLoading}
                    />
                  </div>
                  <Button 
                    type="button" 
                    onClick={addGuestQRCode} 
                    className="mt-2"
                    disabled={isLoading}
                  >
                    Ajouter
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Annuler
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Chargement...' : 'Ajouter'}
          </Button>
        </div>
      </form>

      <Dialog open={showMemberScanner} onOpenChange={setShowMemberScanner}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scanner un QR Code Adhérent</DialogTitle>
          </DialogHeader>
          <QrScanner
            onResult={handleScanResult}
            onClose={() => setShowMemberScanner(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showGuestScanner} onOpenChange={setShowGuestScanner}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scanner un QR Code Invité</DialogTitle>
          </DialogHeader>
          <QrScanner
            onResult={handleScanResult}
            onClose={() => setShowGuestScanner(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
} 