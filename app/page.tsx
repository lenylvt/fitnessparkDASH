"use client"

import { useEffect, useState } from "react"
import { Camera, ChevronDown, Plus, QrCode, Users } from "lucide-react"
import { supabase, type Profile, type QRCode, generateQRCode } from "../lib/supabase"
import { SubscriptionType, QRVersion, QRCodeType } from '@/lib/types/supabase'

import { Button } from "../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table"
import { QrScanner } from "../components/QrScanner"
import { AddUserForm } from "../components/AddUserForm"
import Image from "next/image"

export default function Dashboard() {
  const [showAddUserDialog, setShowAddUserDialog] = useState(false)
  const [showQrCodeDialog, setShowQrCodeDialog] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [users, setUsers] = useState<Profile[]>([])
  const [qrCodes, setQrCodes] = useState<QRCode[]>([])
  const [qrCodeImage, setQrCodeImage] = useState<string | null>(null)
  const [showManualForm, setShowManualForm] = useState(false)
  const [selectedQrCodeType, setSelectedQrCodeType] = useState<'member' | 'guest'>('member')
  const [userGuestQrCodes, setUserGuestQrCodes] = useState<QRCode[]>([])

  useEffect(() => {
    fetchUsers()
    fetchQRCodes()
  }, [])

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching users:', error)
      return
    }

    setUsers(data || [])
  }

  const fetchQRCodes = async () => {
    const { data, error } = await supabase
      .from('qr_codes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching QR codes:', error)
      return
    }

    setQrCodes(data || [])
  }

  const handleAddUser = async (data: {
    name: string
    subscription: SubscriptionType
    qrCodes: {
      id: string
      number: string
      version: QRVersion
      type: QRCodeType
    }[]
  }) => {
    try {
      // Add user to profiles
      const { data: profile, error: profileError } = await supabase
        .from('members')
        .insert([{
          name: data.name,
          subscription: data.subscription,
          created_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (profileError) {
        console.error('Error creating profile:', profileError)
        throw profileError
      }

      if (!profile) {
        throw new Error('No profile returned after creation')
      }

      // Add QR codes
      const qrCodePromises = data.qrCodes.map(qrCode => 
        supabase
          .from('qr_codes')
          .insert([{
            id: qrCode.id,
            member_id: profile.id,
            number: qrCode.number,
            version: qrCode.version,
            type: qrCode.type,
            created_at: new Date().toISOString(),
            last_used: new Date().toISOString()
          }])
      )

      const qrResults = await Promise.all(qrCodePromises)
      const qrErrors = qrResults.filter(result => result.error)

      if (qrErrors.length > 0) {
        console.error('Errors adding QR codes:', qrErrors)
        // Cleanup: delete the profile if QR code creation failed
        await supabase.from('members').delete().eq('id', profile.id)
        throw new Error('Failed to add QR codes')
      }

      await fetchUsers()
      await fetchQRCodes()
      setShowManualForm(false)
      setShowAddUserDialog(false)
    } catch (error) {
      console.error('Error adding user:', error)
      alert("Erreur lors de l'ajout de l'utilisateur. Veuillez réessayer.")
    }
  }

  const handleScanResult = async (result: string) => {
    try {
      // Parse the QR code data
      const data = JSON.parse(result)
      
      if (!data.id || typeof data.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.id)) {
        throw new Error('Invalid QR code ID format')
      }
      
      // Call the reverse API to get the number
      const response = await fetch(`/api/reverse/${data.id}/${data.sg}/${data.t}/${data.v}`)
      if (!response.ok) {
        throw new Error('Failed to fetch QR code data')
      }

      const decoded = await response.json()

      if (decoded.success) {
        // Pre-fill the form with scanned data
        const scannedData = {
          name: '', // To be filled by user
          subscription: 'Simple' as SubscriptionType, // Default value, to be changed by user
          qrCodes: [{
            id: data.id,
            number: decoded.number,
            version: data.v as QRVersion,
            type: 'member' as QRCodeType
          }]
        }
        
        setShowScanner(false)
        setShowManualForm(true)
        // Use the scanned data to pre-fill the form
        // This will be handled by the AddUserForm component
      } else {
        throw new Error(decoded.error || 'Invalid QR code')
      }
    } catch (error) {
      console.error('Error processing QR code:', error)
      alert('QR code invalide ou mal formaté. Veuillez réessayer.')
    }
  }

  const handleViewQrCode = async (user: Profile) => {
    setSelectedUser(user)
    setShowQrCodeDialog(true)
    setSelectedQrCodeType('member')
    
    // Get the latest QR code for this user
    const userQrCode = qrCodes.find(qr => qr.member_id === user.id && qr.type === 'member')
    
    if (userQrCode) {
      try {
        const blob = await generateQRCode(userQrCode.id, userQrCode.number, userQrCode.version)
        const url = URL.createObjectURL(blob)
        setQrCodeImage(url)
      } catch (error) {
        console.error('Error generating QR code:', error)
        alert('Erreur lors de la génération du QR code. Veuillez réessayer.')
      }
    }
    
    // Get guest QR codes if user has Ultimate subscription
    if (user.subscription === 'Ultimate') {
      const guestCodes = qrCodes.filter(qr => qr.member_id === user.id && qr.type === 'guest')
      setUserGuestQrCodes(guestCodes)
    } else {
      setUserGuestQrCodes([])
    }
  }
  
  const handleViewGuestQrCode = async (qrCode: QRCode) => {
    if (!selectedUser) return
    
    setSelectedQrCodeType('guest')
    
    try {
      const blob = await generateQRCode(qrCode.id, qrCode.number, qrCode.version)
      const url = URL.createObjectURL(blob)
      setQrCodeImage(url)
    } catch (error) {
      console.error('Error generating guest QR code:', error)
      alert('Erreur lors de la génération du QR code invité. Veuillez réessayer.')
    }
  }

  const handleDeleteUser = async (userId: string) => {
    try {
      // First delete associated QR codes
      const { error: qrDeleteError } = await supabase
        .from('qr_codes')
        .delete()
        .eq('member_id', userId)

      if (qrDeleteError) {
        console.error('Error deleting QR codes:', qrDeleteError)
        throw qrDeleteError
      }

      // Then delete the member
      const { error: memberDeleteError } = await supabase
        .from('members')
        .delete()
        .eq('id', userId)

      if (memberDeleteError) {
        console.error('Error deleting member:', memberDeleteError)
        throw memberDeleteError
      }

      await fetchUsers()
      await fetchQRCodes()
    } catch (error) {
      console.error('Error during deletion:', error)
      alert('Erreur lors de la suppression. Veuillez réessayer.')
    }
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl">FitnessPark QR Codes</CardTitle>
            <CardDescription>Gérez les QR codes de vos utilisateurs</CardDescription>
          </div>
          <Dialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un utilisateur
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter un nouvel utilisateur</DialogTitle>
                <DialogDescription>Choisissez comment ajouter un nouvel utilisateur</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 pt-4">
                <Button 
                  variant="outline" 
                  className="h-24 flex-col gap-2"
                  onClick={() => {
                    setShowAddUserDialog(false)
                    setShowManualForm(true)
                  }}
                >
                  <Plus className="h-8 w-8" />
                  Saisie manuelle
                </Button>
                <Button 
                  variant="outline" 
                  className="h-24 flex-col gap-2"
                  onClick={() => {
                    setShowAddUserDialog(false)
                    setShowScanner(true)
                  }}
                >
                  <Camera className="h-8 w-8" />
                  Utiliser la caméra
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Abonnement</TableHead>
                <TableHead>Actions</TableHead>
                <TableHead className="text-right">QR Code</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="flex items-center gap-3">
                    <div className="font-medium">{user.name}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex h-2 w-2 rounded-full ${
                          user.subscription === "Ultimate"
                            ? "bg-green-500"
                            : user.subscription === "Starter"
                              ? "bg-blue-500"
                              : "bg-gray-500"
                        }`}
                      />
                      {user.subscription}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          Actions <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Modifier</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => handleViewQrCode(user)}>
                      <QrCode className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="mt-6 flex justify-center">
        <Button size="lg" variant="outline" className="gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <path d="M17 6.1H3"></path>
            <path d="M21 12.1H3"></path>
            <path d="M15.1 18H3"></path>
          </svg>
          Voir la documentation API
        </Button>
      </div>

      <Dialog open={showQrCodeDialog} onOpenChange={setShowQrCodeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              QR Code pour {selectedUser?.name}
              {selectedQrCodeType === 'guest' && " (Invité)"}
            </DialogTitle>
            <DialogDescription>
              {selectedQrCodeType === 'member' 
                ? "Scannez ce QR code pour accéder aux détails de l'utilisateur" 
                : "QR code invité pour les abonnements Ultimate"}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-6">
            {qrCodeImage && (
              <div className="relative h-64 w-64">
                <Image
                  src={qrCodeImage}
                  alt="QR Code"
                  fill
                  sizes="256px"
                  style={{ objectFit: 'contain' }}
                />
              </div>
            )}
          </div>
          
          {selectedUser?.subscription === 'Ultimate' && userGuestQrCodes.length > 0 && (
            <div className="mt-4 border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4" />
                <h3 className="font-medium">QR Codes Invités</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant={selectedQrCodeType === 'member' ? "default" : "outline"}
                  className="w-full"
                  onClick={() => handleViewQrCode(selectedUser)}
                >
                  QR Principal
                </Button>
                
                {userGuestQrCodes.map((qrCode, index) => (
                  <Button
                    key={qrCode.id}
                    variant={selectedQrCodeType === 'guest' && qrCodeImage && qrCode.id === userGuestQrCodes.find(qr => qr.id === qrCode.id)?.id ? "default" : "outline"}
                    className="w-full"
                    onClick={() => handleViewGuestQrCode(qrCode)}
                  >
                    Invité #{index + 1}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showScanner} onOpenChange={setShowScanner}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scanner un QR Code</DialogTitle>
            <DialogDescription>Utilisez la caméra pour scanner un QR code</DialogDescription>
          </DialogHeader>
          <QrScanner
            onResult={handleScanResult}
            onClose={() => setShowScanner(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showManualForm} onOpenChange={setShowManualForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un utilisateur</DialogTitle>
            <DialogDescription>Remplissez les informations de l&apos;utilisateur</DialogDescription>
          </DialogHeader>
          <AddUserForm
            onSubmit={handleAddUser}
            onCancel={() => setShowManualForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
} 