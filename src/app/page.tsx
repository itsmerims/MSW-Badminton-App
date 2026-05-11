"use client";

export default function HomePage() {
  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12">
        
        {/* THE BENCH */}
        <div className="md:col-span-3 border-r flex flex-col bg-secondary/5 min-h-0">
          <div className="p-3 bg-card border-b flex items-center justify-between sticky top-0 z-10 gap-2 h-14">
            <h2 className="text-tiny font-black uppercase tracking-widest flex items-center gap-2 shrink-0">
              <User className="h-4 w-4 text-primary" /> The Bench
            </h2>
            <div className="flex items-center gap-1.5 overflow-hidden">
              <Select value={sortOption} onValueChange={setSortOption}>
                <SelectTrigger className="h-7 text-[9px] font-black uppercase tracking-widest border-2 w-[100px] bg-background px-2">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default" className="text-[9px] font-bold uppercase">Default</SelectItem>
                  <SelectItem value="skill-asc" className="text-[9px] font-bold uppercase">Skill ↑</SelectItem>
                  <SelectItem value="skill-desc" className="text-[9px] font-bold uppercase">Skill ↓</SelectItem>
                  <SelectItem value="name-asc" className="text-[9px] font-bold uppercase">A-Z</SelectItem>
                  <SelectItem value="name-desc" className="text-[9px] font-bold uppercase">Z-A</SelectItem>
                </SelectContent>
              </Select>
              <Badge variant="outline" className="font-black h-7 px-2 text-tiny shrink-0">{sortedAvailablePlayers.length}</Badge>
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 grid grid-cols-2 gap-2 pb-24">
              {sortedAvailablePlayers.map((player) => (
                <Card 
                  key={player.id} 
                  draggable 
                  onDragStart={(e) => onDragStartPlayer(e, player.id)}
                  className="p-3 cursor-grab active:cursor-grabbing hover:border-primary transition-all border-2 shadow-sm group bg-card min-w-0"
                >
                  <div className="flex items-center justify-between mb-1.5 gap-2">
                    <span className="font-black text-compact truncate flex-1 leading-tight">{player.name}</span>
                    <WaitTimeBadge lastAvailableAt={player.lastAvailableAt} />
                  </div>
                  <div className="flex justify-between items-center opacity-80 gap-1">
                    <Badge variant="outline" className={cn("text-[9px] font-black uppercase h-4 px-1.5 truncate", getSkillColor(player.skillLevel))}>
                      {SKILL_LEVELS_SHORT[player.skillLevel]}
                    </Badge>
                    <span className="text-[10px] font-black shrink-0">{player.gamesPlayed} G</span>
                  </div>
                </Card>
              ))}
              {sortedAvailablePlayers.length === 0 && (
                <div className="col-span-2 py-20 text-center text-muted-foreground font-bold italic opacity-20 text-compact">Bench Empty</div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* MATCH QUEUE */}
        <div 
          className={cn(
            "md:col-span-3 border-r flex flex-col bg-background transition-all min-h-0",
            isQueueOver ? "ring-4 ring-inset ring-primary/20 bg-primary/5" : ""
          )}
          onDragOver={(e) => { e.preventDefault(); setIsQueueOver(true); }}
          onDragLeave={() => setIsQueueOver(false)}
          onDrop={onDropInQueue}
        >
          <div className="p-3 bg-card border-b flex items-center justify-between h-14">
            <h2 className="text-tiny font-black uppercase tracking-widest flex items-center gap-2">
              <ListOrdered className="h-4 w-4 text-primary" /> Queue
            </h2>
            <Badge variant="secondary" className="font-black h-6 px-2.5 text-compact bg-primary text-primary-foreground border-none">{waitingMatches.length}</Badge>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-3 pb-24">
              {draftPlayerIds.length > 0 && (
                <Card className="border-dashed border-2 border-primary/40 bg-primary/5 p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-black uppercase text-primary">Drafting ({draftPlayerIds.length}/4)</p>
                    <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => setDraftPlayerIds([])}><X className="h-3 w-3" /></Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {draftPlayerIds.map(id => {
                      const p = players.find(player => player.id === id);
                      return (
                        <div key={id} className="text-[11px] font-black bg-card p-2 rounded border flex flex-col gap-1 group relative overflow-hidden">
                          <span className="truncate pr-4">{p?.name}</span>
                          <X className="h-3 w-3 absolute top-1 right-1 opacity-0 group-hover:opacity-100 cursor-pointer text-destructive" onClick={() => setDraftPlayerIds(prev => prev.filter(pId => pId !== id))} />
                          {p && <Badge variant="outline" className={cn("text-[8px] h-3.5 px-1 w-fit", getSkillColor(p.skillLevel))}>{SKILL_LEVELS_SHORT[p.skillLevel]}</Badge>}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}
              {waitingMatches.map((match, index) => (
                <Card 
                  key={match.id} 
                  draggable 
                  onDragStart={(e) => onDragStartMatch(e, match.id)}
                  className="border-2 border-primary/30 bg-primary/5 cursor-grab active:cursor-grabbing hover:border-primary transition-all shadow-sm overflow-hidden group relative"
                >
                  <div className="absolute top-1 left-1 z-10">
                    <Badge variant="secondary" className="bg-primary text-primary-foreground text-[9px] h-4 px-1 font-black">
                       #{index + 1}
                    </Badge>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive hover:text-white z-10"
                    onClick={() => handleDeleteMatch(match.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  <div className="p-3 pt-6 flex items-center justify-between gap-2">
                    <div className="flex flex-col space-y-1.5 flex-1 min-w-0 border-l-4 border-primary/20 pl-2">
                      <span className="text-[8px] font-black uppercase text-primary opacity-50">T1</span>
                      {match.teamA.map(id => {
                        const p = players.find(player => player.id === id);
                        return (
                          <div key={id} className="flex items-center gap-1.5 min-w-0 group/p">
                            <span className="text-[11px] font-black truncate leading-tight flex-1">{p?.name}</span>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-3.5 w-3.5 opacity-0 group-hover/p:opacity-100 shrink-0" 
                              onClick={() => setSwapping({ matchId: match.id, oldPlayerId: id })}
                            >
                              <ArrowLeftRight className="h-2.5 w-2.5" />
                            </Button>
                            {p && <Badge variant="outline" className={cn("text-[8px] h-3.5 px-1 shrink-0", getSkillColor(p.skillLevel))}>{SKILL_LEVELS_SHORT[p.skillLevel]}</Badge>}
                          </div>
                        );
                      })}
                    </div>
                    <div className="text-[9px] font-black opacity-30 px-1 shrink-0">VS</div>
                    <div className="flex flex-col space-y-1.5 flex-1 min-w-0 items-end text-right border-r-4 border-primary/20 pr-2">
                      <span className="text-[8px] font-black uppercase text-primary opacity-50">T2</span>
                      {match.teamB.map(id => {
                        const p = players.find(player => player.id === id);
                        return (
                          <div key={id} className="flex items-center gap-1.5 min-w-0 justify-end group/p">
                             <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-3.5 w-3.5 opacity-0 group-hover/p:opacity-100 shrink-0" 
                              onClick={() => setSwapping({ matchId: match.id, oldPlayerId: id })}
                            >
                              <ArrowLeftRight className="h-2.5 w-2.5" />
                            </Button>
                            {p && <Badge variant="outline" className={cn("text-[8px] h-3.5 px-1 shrink-0", getSkillColor(p.skillLevel))}>{SKILL_LEVELS_SHORT[p.skillLevel]}</Badge>}
                            <span className="text-[11px] font-black truncate leading-tight flex-1">{p?.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Card>
              ))}
              {waitingMatches.length === 0 && !draftPlayerIds.length && (
                <div className="py-20 text-center text-muted-foreground font-bold italic opacity-20 text-compact">Queue Empty</div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* ACTIVE COURTS */}
        <div 
          className={cn(
            "md:col-span-6 flex flex-col transition-all min-h-0",
            isCourtPanelOver ? "bg-green-500/5" : "bg-secondary/5"
          )}
          onDragOver={(e) => { e.preventDefault(); setIsCourtPanelOver(true); }}
          onDragLeave={() => setIsCourtPanelOver(false)}
          onDrop={onDropInCourtPanel}
        >
          <div className="p-3 bg-card border-b flex items-center justify-between h-14">
            <h2 className="text-tiny font-black uppercase tracking-widest flex items-center gap-2">
              <DoorOpen className="h-4 w-4 text-green-600" /> Active Courts
            </h2>
            <Badge variant="outline" className="font-black h-6 px-2.5 text-compact">{courts.filter(c => c.status === 'occupied').length}/{courts.length}</Badge>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 pb-24">
              {courts.map(court => {
                const match = matches.find(m => m.id === court.currentMatchId && !m.isCompleted);
                const isOver = overCourtId === court.id;
                const draft = courtDrafts[court.id];
                const teamAScore = match?.teamAScore || 0;
                const teamBScore = match?.teamBScore || 0;
                
                return (
                  <Card 
                    key={court.id} 
                    onDragOver={(e) => { e.stopPropagation(); e.preventDefault(); if (court.status === 'available') setOverCourtId(court.id); }}
                    onDragLeave={() => setOverCourtId(null)}
                    onDrop={(e) => { e.stopPropagation(); onDropInCourt(e, court.id); }}
                    className={cn(
                      "border-2 transition-all duration-200 overflow-hidden flex flex-col min-h-[380px]",
                      isOver ? "border-primary bg-primary/5 scale-[1.01] shadow-lg" : "border-border shadow-sm",
                      court.status === 'occupied' ? "bg-card" : "bg-muted/10"
                    )}
                  >
                    <div className={cn("p-2 px-3 flex justify-between items-center border-b", court.status === 'occupied' ? "bg-primary/5" : "bg-muted/20")}>
                      <span className="text-compact font-black uppercase truncate max-w-[120px]">{court.name}</span>
                      <Badge variant={court.status === 'available' ? 'outline' : 'default'} className="text-[9px] font-black uppercase px-2 h-5 shrink-0">
                        {court.status}
                      </Badge>
                    </div>
                    <CardContent className="p-3 flex-1 flex flex-col space-y-3 min-h-0">
                      {court.status === 'occupied' && match ? (
                        <>
                          <div className="flex justify-between items-center mb-1">
                            <LiveTimer startTime={match.startTime} />
                            <div className="flex gap-1">
                               <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-6 text-[8px] font-black px-1.5" 
                                  disabled={!match.startTime}
                                  onClick={() => {
                                    if (!match.startTime) {
                                      toast({ title: "Match not started", description: "Start the match timer first.", variant: "destructive" });
                                      return;
                                    }
                                    setWinningTeam({ courtId: court.id, team: 'teamA' });
                                  }}
                               >
                                  T1 WIN
                               </Button>
                               <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-6 text-[8px] font-black px-1.5" 
                                  disabled={!match.startTime}
                                  onClick={() => {
                                    if (!match.startTime) {
                                      toast({ title: "Match not started", description: "Start the match timer first.", variant: "destructive" });
                                      return;
                                    }
                                    setWinningTeam({ courtId: court.id, team: 'teamB' });
                                  }}
                               >
                                  T2 WIN
                               </Button>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 gap-2 flex-1">
                            <div className={cn("p-3 rounded-lg border-l-4 space-y-1.5 transition-colors relative", teamAScore > teamBScore ? "border-primary bg-primary/5" : "border-muted-foreground/10 bg-muted/10")}>
                              <span className="text-[8px] font-black uppercase text-primary opacity-50">Team 1 (T1)</span>
                              {match.teamA.map(id => {
                                const p = players.find(player => player.id === id);
                                return (
                                  <div key={id} className="flex justify-between items-center group/p gap-1">
                                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                      <span className="text-compact font-black truncate flex-1 leading-tight">{p?.name}</span>
                                      {p && <Badge variant="outline" className={cn("text-[8px] h-3.5 px-1 shrink-0", getSkillColor(p.skillLevel))}>{SKILL_LEVELS_SHORT[p.skillLevel]}</Badge>}
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-4 w-4 opacity-0 group-hover/p:opacity-100 shrink-0" onClick={() => setSwapping({ matchId: match.id, oldPlayerId: id })}><ArrowLeftRight className="h-3 w-3" /></Button>
                                  </div>
                                );
                              })}
                            </div>
                            <div className={cn("p-3 rounded-lg border-l-4 space-y-1.5 transition-colors relative", teamBScore > teamAScore ? "border-primary bg-primary/5" : "border-muted-foreground/10 bg-muted/10")}>
                              <span className="text-[8px] font-black uppercase text-primary opacity-50">Team 2 (T2)</span>
                              {match.teamB.map(id => {
                                const p = players.find(player => player.id === id);
                                return (
                                  <div key={id} className="flex justify-between items-center group/p gap-1">
                                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                      <span className="text-compact font-black truncate flex-1 leading-tight">{p?.name}</span>
                                      {p && <Badge variant="outline" className={cn("text-[8px] h-3.5 px-1 shrink-0", getSkillColor(p.skillLevel))}>{SKILL_LEVELS_SHORT[p.skillLevel]}</Badge>}
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-4 w-4 opacity-0 group-hover/p:opacity-100 shrink-0" onClick={() => setSwapping({ matchId: match.id, oldPlayerId: id })}><ArrowLeftRight className="h-3 w-3" /></Button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      ) : draft ? (
                        <div className="space-y-2">
                          <p className="text-[10px] font-black uppercase text-primary">Drafting ({draft.length}/4)</p>
                          <div className="space-y-1.5">
                            {draft.map(id => {
                              const p = players.find(player => player.id === id);
                              return (
                                <div key={id} className="text-[11px] font-black bg-background p-2 rounded border flex items-center justify-between gap-1 overflow-hidden">
                                  <span className="truncate flex-1">{p?.name}</span>
                                  {p && <Badge variant="outline" className={cn("text-[8px] h-3.5 px-1 shrink-0", getSkillColor(p.skillLevel))}>{SKILL_LEVELS_SHORT[p.skillLevel]}</Badge>}
                                </div>
                              );
                            })}
                          </div>
                          <Button variant="ghost" size="sm" className="w-full h-8 text-[9px] font-black" onClick={() => setCourtDrafts(prev => { const n = {...prev}; delete n[court.id]; return n; })}>CANCEL</Button>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center opacity-10 py-8">
                          <Zap className={cn("h-10 w-10 mb-2", isOver && "text-primary opacity-100 scale-110")} />
                          <p className="text-tiny font-black uppercase text-center tracking-widest">Available</p>
                        </div>
                      )}
                    </CardContent>
                    
                    {court.status === 'occupied' && match && (
                      <div className="p-3 bg-secondary/20 border-t space-y-2">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 flex flex-col gap-1">
                            <span className="text-[9px] font-black uppercase opacity-40 text-center">T1</span>
                            <Input 
                              type="number" min="0"
                              className={cn("h-12 text-2xl font-black text-center border-2 no-spinner", teamAScore > teamBScore ? "border-primary bg-primary/5" : "bg-card")}
                              value={!match.teamAScore || match.teamAScore === 0 ? "" : match.teamAScore}
                              placeholder="0"
                              onBlur={(e) => { if (e.target.value === "") handleScoreChange(match.id, 0, match.teamBScore || 0); }}
                              onChange={(e) => handleScoreChange(match.id, parseInt(e.target.value) || 0, match.teamBScore || 0)}
                            />
                          </div>
                          <div className="text-lg font-black opacity-20 mt-4 shrink-0">VS</div>
                          <div className="flex-1 flex flex-col gap-1">
                            <span className="text-[9px] font-black uppercase opacity-40 text-center">T2</span>
                            <Input 
                              type="number" min="0"
                              className={cn("h-12 text-2xl font-black text-center border-2 no-spinner", teamBScore > teamAScore ? "border-primary bg-primary/5" : "bg-card")}
                              value={!match.teamBScore || match.teamBScore === 0 ? "" : match.teamBScore}
                              placeholder="0"
                              onBlur={(e) => { if (e.target.value === "") handleScoreChange(match.id, match.teamAScore || 0, 0); }}
                              onChange={(e) => handleScoreChange(match.id, match.teamAScore || 0, parseInt(e.target.value) || 0)}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <CardFooter className="p-2.5 border-t mt-auto gap-2">
                      {court.status === 'occupied' && match ? (
                        <>
                          {!match.startTime ? (
                            <Button onClick={() => startTimer(court.id)} className="w-full h-10 bg-green-600 hover:bg-green-700 font-black text-tiny uppercase px-2 truncate">
                              <Play className="h-3.5 w-3.5 mr-1.5 shrink-0" /> START
                            </Button>
                          ) : (
                            <div className="flex w-full gap-2">
                               <Button onClick={() => handleFinishMatch(court.id, teamAScore, teamBScore)} className="flex-1 h-10 bg-primary font-black text-tiny uppercase px-2 truncate">
                                  FINISH
                               </Button>
                               <Button variant="outline" size="icon" onClick={() => endMatch(court.id, 'cancelled')} className="h-10 w-10 p-0 border-2 shrink-0">
                                  <Ban className="h-3.5 w-3.5 text-destructive" />
                               </Button>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex w-full justify-between items-center px-1 h-10">
                          <p className="text-[9px] font-black uppercase opacity-40 truncate">READY</p>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-destructive hover:text-white shrink-0" onClick={() => deleteCourt(court.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
