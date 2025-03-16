import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { QRCodeType, QRVersion, SubscriptionType } from '../lib/types/supabase'

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
  }
}

export function AddUserForm({ onSubmit, onCancel, initialData }: AddUserFormProps) {
  const [name, setName] = useState(initialData?.name || '')
  const [subscription, setSubscription] = useState<SubscriptionType>(initialData?.subscription || 'Simple')
  const [guestQRCodes, setGuestQRCodes] = useState<QRCodeData[]>([])
  const [showAddGuest, setShowAddGuest] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)
  const [guestNumber, setGuestNumber] = useState('')
  const [guestId, setGuestId] = useState('')
  const [memberNumber, setMemberNumber] = useState(initialData?.qrCode?.number || '')
  const [memberId, setMemberId] = useState(initialData?.qrCode?.id || '')

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

  return (
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
        <Label>Type d'abonnement</Label>
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
          {!memberId && !memberNumber && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddMember(true)}
            >
              Ajouter QR code adhérent
            </Button>
          )}
        </div>

        {(showAddMember || memberId || memberNumber) && (
          <div className="space-y-4 p-4 border rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">
              Entrez les informations du QR code principal de l'adhérent
            </p>
            <div className="space-y-4">
              <div>
                <Label htmlFor="memberId">ID du QR Code</Label>
                <Input
                  id="memberId"
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  placeholder="ID du QR code"
                  required
                  className="mt-2"
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
                />
              </div>
            </div>
          </div>
        )}
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
                  >
                    Supprimer
                  </Button>
                </div>
              ))}
            </div>
          )}

          {showAddGuest && (
            <div className="space-y-4 p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">
                Ajoutez un QR code invité
              </p>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="guestId">ID du QR Code Invité</Label>
                  <Input
                    id="guestId"
                    value={guestId}
                    onChange={(e) => setGuestId(e.target.value)}
                    placeholder="ID du QR code"
                    required
                    className="mt-2"
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
                  />
                </div>
                <Button type="button" onClick={addGuestQRCode} className="mt-2">
                  Ajouter
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2 mt-6">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit">
          Ajouter
        </Button>
      </div>
    </form>
  )
} 