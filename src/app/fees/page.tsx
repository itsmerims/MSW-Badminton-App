
"use client";

import { useMemo, useState, useEffect, useRef } from 'react';
import { useClub } from '@/context/ClubContext';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Banknote, QrCode, UserCheck, Calculator, Download, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { cn } from '@/lib/utils';

/** Number input helpers: clear "0" on focus, restore 0 on empty blur */
const numInputProps = (value: number, setValue: (v: number) => void) => ({
  value: value === 0 ? '' : value,
  onFocus: (e: React.FocusEvent<HTMLInputElement>) => { if (value === 0) e.target.value = ''; },
  onBlur: (e: React.FocusEvent<HTMLInputElement>) => { if (e.target.value === '') setValue(0); },
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => setValue(parseFloat(e.target.value) || 0),
});

function QRImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <div className="relative flex items-center justify-center">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}
      {hasError ? (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs font-black uppercase">
          Failed to load
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          className={className}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
          style={{ opacity: isLoading ? 0 : 1 }}
        />
      )}
    </div>
  );
}

export default function FeesPage() {
  const { players, fees, paymentMethods, updateFee, togglePayment, refreshPaymentMethods, currentSession, saveSessionFee, saveCalculatorData } = useClub();
  const isPlayer = false;
  const [today, setToday] = useState<string>('');
  const [isRefreshingQR, setIsRefreshingQR] = useState(false);
  const [isSavingToSession, setIsSavingToSession] = useState(false);

  const [shuttleUnits, setShuttleUnits] = useState(0);
  const [shuttleCostPerUnit, setShuttleCostPerUnit] = useState(0);
  const [courtCount, setCourtCount] = useState(1);
  const [courtCostPerHour, setCourtCostPerHour] = useState(0);
  const [hoursPlayed, setHoursPlayed] = useState(2);
  const [entranceFee, setEntranceFee] = useState(0);
  const [includeEntranceFee, setIncludeEntranceFee] = useState(true);
  const [calcLoaded, setCalcLoaded] = useState(false);

  const FEES_CALC_KEY = 'tbc_fees_calculator';

  // Load persisted calculator data from localStorage on mount
  useEffect(() => {
    if (calcLoaded) return;
    const saved = localStorage.getItem(FEES_CALC_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      setShuttleUnits(data.shuttleUnits ?? 0);
      setShuttleCostPerUnit(data.shuttleCostPerUnit ?? 0);
      setCourtCount(data.courtCount ?? 1);
      setCourtCostPerHour(data.courtCostPerHour ?? 0);
      setHoursPlayed(data.hoursPlayed ?? 2);
      setEntranceFee(data.entranceFee ?? 0);
      setIncludeEntranceFee(data.includeEntranceFee ?? true);
    }
    setCalcLoaded(true);
  }, [calcLoaded]);

  // Auto-save calculator data to localStorage whenever inputs change
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!calcLoaded) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      localStorage.setItem(FEES_CALC_KEY, JSON.stringify({
        shuttleUnits,
        shuttleCostPerUnit,
        courtCount,
        courtCostPerHour,
        hoursPlayed,
        entranceFee,
        includeEntranceFee,
      }));
    }, 500);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [shuttleUnits, shuttleCostPerUnit, courtCount, courtCostPerHour, hoursPlayed, entranceFee, includeEntranceFee, calcLoaded]);

  // Load persisted per-player fee from current session
  const sessionPerPlayerFee = currentSession?.perPlayerFee;

  useEffect(() => {
    setToday(new Date().toISOString().split('T')[0]);
  }, []);

  const currentFee = useMemo(() => fees.find(f => f.id === today), [fees, today]);

  const shuttleFee = useMemo(() => {
    return shuttleUnits * shuttleCostPerUnit * hoursPlayed;
  }, [shuttleUnits, shuttleCostPerUnit, hoursPlayed]);

  const courtFee = useMemo(() => {
    return courtCount * courtCostPerHour * hoursPlayed;
  }, [courtCount, courtCostPerHour, hoursPlayed]);

  const totalFee = useMemo(() => {
    return shuttleFee + courtFee + (includeEntranceFee ? entranceFee : 0);
  }, [shuttleFee, courtFee, entranceFee, includeEntranceFee]);

  const perPlayerFee = useMemo(() => {
    return (totalFee / (players.length || 1)).toFixed(2);
  }, [totalFee, players.length]);

  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      const aPaid = !!currentFee?.payments?.[a.id];
      const bPaid = !!currentFee?.payments?.[b.id];
      return aPaid === bPaid ? 0 : aPaid ? 1 : -1;
    });
  }, [players, currentFee]);

  const handleQRMethodsClick = async () => {
    setIsRefreshingQR(true);
    await refreshPaymentMethods();
    setIsRefreshingQR(false);
  };

  return (
    <div className="container mx-auto px-4 py-4 md:py-8 space-y-6 md:space-y-8 pb-24 max-w-5xl h-full overflow-auto">
      <header className="space-y-1 shrink-0">
        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter flex items-center gap-2">
          <Banknote className="h-6 w-6 md:h-8 md:w-8 text-green-600" /> Club Fees
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground font-medium uppercase tracking-widest opacity-60">Daily finance & payment tracking</p>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
        {/* Session Board Summary - shown when fee is applied */}
        {!isPlayer && sessionPerPlayerFee != null && (
          <Card className="lg:col-span-12 border-2 border-green-500/30 shadow-lg bg-green-500/5 overflow-hidden">
            <CardContent className="py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Banknote className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Session Board Fee</p>
                  <p className="text-2xl font-black text-green-600">₱{sessionPerPlayerFee.toFixed(2)} <span className="text-sm opacity-60">/ player</span></p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Players</p>
                <p className="text-lg font-black">{players.length}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {!isPlayer && (
          <Card className="lg:col-span-5 border-2 shadow-lg bg-card overflow-hidden">
            <CardHeader className="bg-primary/5 border-b">
              <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                <Calculator className="h-5 w-5" /> Daily Split Calculator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Hours Played</Label>
                  <div className="relative">
                    <Input type="number" min="0" step="0.5" className="font-black text-lg h-12" placeholder="0" {...numInputProps(hoursPlayed, setHoursPlayed)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Shuttle Units</Label>
                    <div className="relative">
                      <Input type="number" min="0" className="font-black text-lg h-12" placeholder="0" {...numInputProps(shuttleUnits, setShuttleUnits)} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cost per Unit (₱)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-muted-foreground/50">₱</span>
                      <Input type="number" min="0" className="pl-8 font-black text-lg h-12" placeholder="0" {...numInputProps(shuttleCostPerUnit, setShuttleCostPerUnit)} />
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-primary/5 rounded-xl border-2 border-primary/20">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-muted-foreground">Shuttle Fee</span>
                    <span className="text-lg font-black text-primary">₱{shuttleFee.toFixed(2)}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Court Count</Label>
                    <div className="relative">
                      <Input type="number" min="1" className="font-black text-lg h-12" placeholder="1" {...numInputProps(courtCount, setCourtCount)} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cost per Court/Hour (₱)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-muted-foreground/50">₱</span>
                      <Input type="number" min="0" className="pl-8 font-black text-lg h-12" placeholder="0" {...numInputProps(courtCostPerHour, setCourtCostPerHour)} />
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-primary/5 rounded-xl border-2 border-primary/20">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-muted-foreground">Court Rental Fee</span>
                    <span className="text-lg font-black text-primary">₱{courtFee.toFixed(2)}</span>
                  </div>
                </div>
                <div className="space-y-1.5 p-4 rounded-xl bg-secondary/50 border-2 border-dashed">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest">Entry Fee</Label>
                    <Switch checked={includeEntranceFee} onCheckedChange={setIncludeEntranceFee} />
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-muted-foreground/50">₱</span>
                    <Input type="number" disabled={!includeEntranceFee} className="pl-8 font-black text-lg h-12 disabled:opacity-30" placeholder="0" {...numInputProps(entranceFee, setEntranceFee)} />
                  </div>
                </div>
              </div>
              <div className="p-6 bg-primary text-primary-foreground rounded-2xl shadow-xl shadow-primary/20 flex justify-between items-center transform hover:scale-[1.02] transition-transform">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Total Expense</p>
                  <h2 className="text-2xl font-black mb-1">₱{totalFee.toFixed(2)}</h2>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Per Player: ₱{perPlayerFee}</p>
                </div>
                <Banknote className="h-10 w-10 opacity-30" />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              {currentSession && (
                <Button
                  className="w-full h-12 font-black uppercase tracking-widest"
                  disabled={isSavingToSession}
                  onClick={async () => {
                    setIsSavingToSession(true);
                    try {
                      await saveSessionFee(parseFloat(perPlayerFee));
                    } catch (e) {
                      console.error('Failed to save session fee:', e);
                    } finally {
                      setIsSavingToSession(false);
                    }
                  }}
                >
                  {isSavingToSession ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Apply to Session Board
                </Button>
              )}
            </CardFooter>
          </Card>
        )}

        {isPlayer && (
          <Card className="lg:col-span-12 border-2 shadow-lg bg-card overflow-hidden">
            <CardHeader className="bg-primary/5 border-b">
              <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                <Banknote className="h-5 w-5" /> Today's Fee
              </CardTitle>
              <CardDescription className="text-xs font-bold uppercase">Amount to pay for today's session</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="p-8 bg-primary text-primary-foreground rounded-2xl shadow-xl shadow-primary/20 flex justify-between items-center">
                <div>
                  <p className="text-sm font-black uppercase tracking-widest opacity-80">Per Player Cost</p>
                  <h2 className="text-6xl font-black">₱{currentFee?.shuttleFee ? Math.round((currentFee.shuttleFee + currentFee.courtFee + (currentFee.entranceFee || 0)) / players.length) : 0}</h2>
                </div>
                <Banknote className="h-16 w-16 opacity-30" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="p-4 bg-secondary/50 rounded-xl border-2">
                  <p className="text-[10px] font-black uppercase opacity-60">Shuttle Fee</p>
                  <p className="text-2xl font-black">₱{currentFee?.shuttleFee || 0}</p>
                </div>
                <div className="p-4 bg-secondary/50 rounded-xl border-2">
                  <p className="text-[10px] font-black uppercase opacity-60">Court Rental</p>
                  <p className="text-2xl font-black">₱{currentFee?.courtFee || 0}</p>
                </div>
                <div className="p-4 bg-secondary/50 rounded-xl border-2">
                  <p className="text-[10px] font-black uppercase opacity-60">Entry Fee</p>
                  <p className="text-2xl font-black">₱{currentFee?.entranceFee || 0}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  <QrCode className="h-4 w-4" /> Scan to Pay
                </h3>
                {paymentMethods.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paymentMethods.map(method => (
                      <Card key={method.id} className="overflow-hidden border-2">
                        <div className="bg-primary text-primary-foreground p-1 text-center text-[10px] font-black uppercase">{method.name}</div>
                        <div className="h-48 bg-white flex items-center justify-center p-4">
                          <QRImage src={method.imageUrl} alt={method.name} className="max-h-full max-w-full object-contain" />
                        </div>
                        <div className="p-3 bg-secondary text-center text-sm font-black uppercase">Pay ₱{currentFee?.shuttleFee ? Math.round((currentFee.shuttleFee + currentFee.courtFee + (currentFee.entranceFee || 0)) / players.length) : 0}</div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground font-black uppercase text-sm border-2 border-dashed rounded-xl">
                    No payment methods available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {!isPlayer && (
          <section className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                <UserCheck className="h-6 w-6 text-green-600" /> Payment Roster
              </h2>
              <div className="flex gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 font-black uppercase text-[10px] border-2" onClick={handleQRMethodsClick}>
                      <QrCode className="h-4 w-4" /> QR Methods
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        Scan to Pay
                        {isRefreshingQR && <Loader2 className="h-4 w-4 animate-spin" />}
                      </DialogTitle>
                    </DialogHeader>
                    {isRefreshingQR ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
                        {paymentMethods.map(method => (
                          <Card key={method.id} className="overflow-hidden border-2">
                            <div className="bg-primary text-primary-foreground p-1 text-center text-[10px] font-black uppercase">{method.name}</div>
                            <div className="h-64 bg-white flex items-center justify-center p-4">
                              <QRImage src={method.imageUrl} alt={method.name} className="max-h-full max-w-full object-contain" />
                            </div>
                            <div className="p-3 bg-secondary text-center text-sm font-black uppercase">Pay ₱{perPlayerFee}</div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <ScrollArea className="h-[600px] rounded-2xl border-2 bg-card p-4">
              <div className="space-y-2">
                {sortedPlayers.map(player => {
                  const isPaid = !!currentFee?.payments?.[player.id];
                  return (
                    <div key={player.id} className={cn(
                      "flex items-center justify-between p-4 border-2 rounded-xl transition-all",
                      isPaid ? "bg-green-500/5 border-green-500/20 opacity-60" : "bg-card border-border hover:border-primary/30"
                    )}>
                      <div className="flex items-center gap-3">
                        <div className={cn("h-3 w-3 rounded-full", isPaid ? "bg-green-500" : "bg-red-500")} />
                        <span className={cn("font-black text-sm", isPaid && "line-through text-muted-foreground")}>{player.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={cn("text-[10px] font-black uppercase tracking-tighter", isPaid ? "text-green-600" : "text-red-500")}>
                          {isPaid ? 'Settled' : 'Pending'}
                        </span>
                        <Checkbox checked={isPaid} onCheckedChange={() => togglePayment(today, player.id)} className="h-5 w-5 border-2" />
                      </div>
                    </div>
                  );
                })}
                {players.length === 0 && (
                  <div className="py-20 text-center text-muted-foreground font-black uppercase text-xs opacity-20">No Players Found</div>
                )}
              </div>
            </ScrollArea>
          </section>
        )}
      </div>
    </div>
  );
}
