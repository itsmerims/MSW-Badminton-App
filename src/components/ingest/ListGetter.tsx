'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Calendar, Upload, Users } from 'lucide-react'
import { useSupabaseClub } from '@/context/SupabaseClubContext'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

export function ListGetter() {
  const { ingestPlayersFromList } = useSupabaseClub()
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [namesText, setNamesText] = useState('')
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0])
  const [isProcessing, setIsProcessing] = useState(false)

  const handleIngest = async () => {
    if (!namesText.trim()) {
      toast({ title: 'No names provided', variant: 'destructive' })
      return
    }

    if (!sessionDate) {
      toast({ title: 'Please select a session date', variant: 'destructive' })
      return
    }

    setIsProcessing(true)
    try {
      const names = namesText.split('\n').map(n => n.trim()).filter(n => n.length > 0)
      const result = await ingestPlayersFromList(names, sessionDate)
      toast({
        title: 'Players ingested successfully',
        description: `${result.newPlayersCount} new, ${result.existingPlayersCount} already existed`
      })
      setNamesText('')
      setIsOpen(false)
    } catch (error) {
      console.error('Error ingesting players:', error)
      console.error('Error message:', error instanceof Error ? error.message : String(error))
      toast({ title: 'Failed to ingest players', description: error instanceof Error ? error.message : String(error), variant: 'destructive' })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 font-black uppercase text-xs tracking-widest">
          <Upload className="h-4 w-4" /> Import List
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Import Players from Viva Engage
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest">
              <Calendar className="h-4 w-4" /> Session Date
            </Label>
            <Input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className="font-bold"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-black uppercase tracking-widest">
              Player Names (one per line)
            </Label>
            <Textarea
              placeholder="John Smith&#10;Jane Doe&#10;Michael Johnson"
              value={namesText}
              onChange={(e) => setNamesText(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
              disabled={isProcessing}
            />
            <p className="text-xs text-muted-foreground">
              Paste the list of full names from Viva Engage. Each name should be on a new line.
            </p>
          </div>

          <Button
            onClick={handleIngest}
            disabled={isProcessing || !namesText.trim()}
            className="w-full font-black uppercase"
          >
            {isProcessing ? 'Processing...' : 'Import Players'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
