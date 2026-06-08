'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Calendar, Upload, Users, HelpCircle, Info, CheckCircle, AlertCircle, FileText } from 'lucide-react'
import { useClub } from '@/context/ClubContext'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

export function ListGetter() {
  const { ingestPlayersFromList } = useClub()
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" /> Import Players from Viva Engage
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Quick Guide Card */}
          <Card className="border-2 border-primary/20 bg-primary/5">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-primary">
                <Info className="h-4 w-4" />
                Quick Guide
              </div>
              <ol className="text-sm space-y-2 text-muted-foreground">
                <li className="flex gap-2">
                  <span className="font-bold text-primary">1.</span>
                  Go to Viva Engage and copy the player list from the session post
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-primary">2.</span>
                  Paste the names below (one name per line)
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-primary">3.</span>
                  Click "Import Players" — duplicates are automatically detected
                </li>
              </ol>
            </CardContent>
          </Card>

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
            <p className="text-xs text-muted-foreground">
              Used for tracking player availability and session history
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-black uppercase tracking-widest">
              Player Names (one per line)
            </Label>
            <Textarea
              placeholder="John Smith&#10;Jane Doe&#10;Michael Johnson&#10;David-3 Lee&#10;Sarah Wilson"
              value={namesText}
              onChange={(e) => setNamesText(e.target.value)}
              className="min-h-[180px] font-mono text-sm"
              disabled={isProcessing}
            />
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <AlertCircle className="h-3.5 w-3.5" />
              Tip: Add skill level with dash (e.g., "John-3" for Level 3)
            </div>
          </div>

          <Button
            onClick={handleIngest}
            disabled={isProcessing || !namesText.trim()}
            className="w-full font-black uppercase h-12"
          >
            {isProcessing ? 'Processing...' : `Import ${namesText.split('\n').filter(n => n.trim()).length} Players`}
          </Button>

          {/* Detailed Help Accordion */}
          <Accordion type="single" collapsible className="border rounded-lg">
            <AccordionItem value="guide" className="border-none">
              <AccordionTrigger className="px-4 py-3 text-xs font-black uppercase tracking-widest hover:no-underline">
                <span className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4" />
                  How to Use This Feature
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-4">
                <div className="space-y-3 text-sm">
                  <div className="space-y-2">
                    <h4 className="font-bold flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      Where to Get the List
                    </h4>
                    <p className="text-muted-foreground pl-6">
                      Copy the attendee list from your Viva Engage session post. The list usually shows who clicked "I'm going" or commented on the session.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Name Formats That Work
                    </h4>
                    <ul className="text-muted-foreground pl-6 space-y-1">
                      <li>• <code className="bg-secondary px-1 rounded">First Last</code> — "John Smith"</li>
                      <li>• <code className="bg-secondary px-1 rounded">Name-Skill</code> — "John-3" (sets skill level 3)</li>
                      <li>• <code className="bg-secondary px-1 rounded">First Last-Skill</code> — "John Smith-4"</li>
                      <li>• Initials auto-added for duplicates: "John B.", "John M."</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      Duplicate Detection
                    </h4>
                    <p className="text-muted-foreground pl-6">
                      If a player already exists in your roster, they'll be updated (not recreated). Their session attendance will be tracked, and if they were previously stored with an initial (e.g., "John B."), the system will auto-rename them back to just "John" if they're the only one with that name in the new batch.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold flex items-center gap-2">
                      <Info className="h-4 w-4 text-blue-500" />
                      What Happens After Import
                    </h4>
                    <p className="text-muted-foreground pl-6">
                      Imported players are marked as "available" for the selected session date. They'll appear in your roster and can be added to matches immediately. Skill levels default to 3 (Mid Intermediate) unless specified.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </DialogContent>
    </Dialog>
  )
}
