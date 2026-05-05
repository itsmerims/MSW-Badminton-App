import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Player } from '@/lib/types';
import { Label } from '@/components/ui/label';

interface MatchScoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamA: Player[];
  teamB: Player[];
  onScoreSubmit: (teamAScore: number | undefined, teamBScore: number | undefined, winner: 'teamA' | 'teamB') => void;
  onSkip?: () => void;
  defaultWinningScore?: number;
}

export function MatchScoreDialog({ open, onOpenChange, teamA, teamB, onScoreSubmit, onSkip, defaultWinningScore = 21 }: MatchScoreDialogProps) {
  const [teamAScore, setTeamAScore] = useState<string>('');
  const [teamBScore, setTeamBScore] = useState<string>('');
  const [validationError, setValidationError] = useState<string>('');

  const validateScores = (a: number, b: number): string | null => {
    const winningScore = defaultWinningScore || 21;

    // Check for negative scores (shouldn't happen due to Math.max, but double-check)
    if (a < 0 || b < 0) {
      return 'Scores cannot be negative';
    }

    // Check if both scores are zero
    if (a === 0 && b === 0) {
      return 'At least one team must have a score';
    }

    // Determine potential winner
    const winnerScore = Math.max(a, b);
    const loserScore = Math.min(a, b);

    // Winner must reach at least the winning score
    if (winnerScore < winningScore) {
      return `Winner must reach at least ${winningScore} points`;
    }

    // If both scores reach winning score (deuce), winner must win by 2
    if (loserScore >= winningScore && (winnerScore - loserScore) < 2) {
      return `At deuce (both at ${winningScore}+), winner must lead by 2 points`;
    }

    // Loser cannot have more points than winner
    if (loserScore > winnerScore) {
      return 'Invalid score: loser has more points than winner';
    }

    // Reasonable maximum score check (badminton typically ends by 30)
    if (winnerScore > 30) {
      return 'Score exceeds reasonable maximum (30 points)';
    }

    return null;
  };

  const handleSubmit = () => {
    const aVal = teamAScore.trim() === '' ? undefined : Math.max(0, Number(teamAScore));
    const bVal = teamBScore.trim() === '' ? undefined : Math.max(0, Number(teamBScore));

    if (aVal === undefined || bVal === undefined) {
      setValidationError('Both scores are required');
      return;
    }

    const error = validateScores(aVal, bVal);
    if (error) {
      setValidationError(error);
      return;
    }

    // Auto-determine winner if scores are provided
    const winner = aVal >= bVal ? 'teamA' : 'teamB';

    onScoreSubmit(aVal, bVal, winner);
    reset();
  };

  const handleSkip = () => {
    reset();
    onOpenChange(false);
    if (onSkip) onSkip();
  };

  const reset = () => {
    setTeamAScore('');
    setTeamBScore('');
    setValidationError('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black uppercase">Record Match Score</DialogTitle>
        </DialogHeader>
        <div className="space-y-8 py-6">
          <div className="grid grid-cols-2 gap-10 items-center">
            <div className="space-y-4">
              <div className="text-center">
                <Label className="text-[12px] font-black uppercase text-primary tracking-widest">Team A</Label>
                <div className="text-sm font-bold truncate mt-1">
                  {teamA.map(p => p.name).join(' & ')}
                </div>
              </div>
              <Input
                placeholder="0"
                value={teamAScore}
                onChange={e => {
                  setTeamAScore(e.target.value);
                  setValidationError('');
                }}
                type="number"
                min="0"
                className="text-center text-4xl font-black h-20 border-2 no-spinner"
                onBlur={() => {
                  if (teamAScore && Number(teamAScore) < 0) setTeamAScore('0');
                }}
              />
            </div>

            <div className="space-y-4">
              <div className="text-center">
                <Label className="text-[12px] font-black uppercase text-muted-foreground tracking-widest">Team B</Label>
                <div className="text-sm font-bold truncate mt-1">
                  {teamB.map(p => p.name).join(' & ')}
                </div>
              </div>
              <Input
                placeholder="0"
                value={teamBScore}
                onChange={e => {
                  setTeamBScore(e.target.value);
                  setValidationError('');
                }}
                type="number"
                min="0"
                className="text-center text-4xl font-black h-20 border-2 no-spinner"
                onBlur={() => {
                  if (teamBScore && Number(teamBScore) < 0) setTeamBScore('0');
                }}
              />
            </div>
          </div>

          {validationError && (
            <div className="bg-destructive/10 border-2 border-destructive/20 text-destructive text-xs font-bold uppercase px-4 py-3 rounded-lg">
              {validationError}
            </div>
          )}

          <div className="flex flex-col gap-3 pt-6">
            <Button
              className="w-full font-black h-16 text-lg uppercase"
              onClick={handleSubmit}
              disabled={teamAScore === '' || teamBScore === ''}
            >
              Submit Results
            </Button>
            <Button
              variant="ghost"
              className="w-full text-xs font-black uppercase tracking-widest text-muted-foreground"
              onClick={handleSkip}
            >
              Skip & Pick Winner Manually
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}