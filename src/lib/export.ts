export const exportToCSV = (data: any[], filename: string, headers: string[]) => {
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle nested objects, arrays, and special characters
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value).replace(/"/g, '""');
        return String(value).replace(/"/g, '""');
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportFeesToCSV = (fees: any[], players: any[]) => {
  const data = fees.map(fee => {
    const player = players.find(p => p.id === fee.playerId);
    return {
      Date: fee.date,
      Player: player?.name || 'Unknown',
      Amount: fee.amount,
      Status: fee.status,
    };
  });
  exportToCSV(data, 'fees_report', ['Date', 'Player', 'Amount', 'Status']);
};

export const exportRankingsToCSV = (players: any[]) => {
  const data = players.map(player => ({
    Name: player.name,
    SkillLevel: player.skillLevel,
    Wins: player.wins,
    GamesPlayed: player.gamesPlayed,
    WinRate: player.gamesPlayed > 0 ? Math.round((player.wins / player.gamesPlayed) * 100) + '%' : '0%',
    ImprovementScore: player.improvementScore,
    Status: player.status,
  }));
  exportToCSV(data, 'daily_rankings', ['Name', 'SkillLevel', 'Wins', 'GamesPlayed', 'WinRate', 'ImprovementScore', 'Status']);
};

export const exportMatchHistoryToCSV = (matches: any[], players: any[]) => {
  const data = matches.map(match => {
    const teamANames = match.teamA.map((id: string) => players.find((p: any) => p.id === id)?.name || 'Unknown').join(', ');
    const teamBNames = match.teamB.map((id: string) => players.find((p: any) => p.id === id)?.name || 'Unknown').join(', ');
    return {
      Date: new Date(match.timestamp).toLocaleDateString(),
      Time: new Date(match.timestamp).toLocaleTimeString(),
      TeamA: teamANames,
      TeamB: teamBNames,
      Winner: match.winner === 'teamA' ? 'Team A' : match.winner === 'teamB' ? 'Team B' : 'Draw',
      Status: match.status,
    };
  });
  exportToCSV(data, 'match_history', ['Date', 'Time', 'TeamA', 'TeamB', 'Winner', 'Status']);
};

export const exportPlayersToCSV = (players: any[], sessionId?: string) => {
  const sessionPlayers = sessionId ? players.filter(p => p.sessionId === sessionId || p.sessionIds?.includes(sessionId)) : players;
  const data = sessionPlayers.map(player => ({
    Name: player.name,
    SkillLevel: player.skillLevel,
    Wins: player.wins,
    GamesPlayed: player.gamesPlayed,
    WinRate: player.gamesPlayed > 0 ? Math.round((player.wins / player.gamesPlayed) * 100) + '%' : '0%',
    Status: player.status,
    LastAvailableAt: player.lastAvailableAt ? new Date(player.lastAvailableAt).toLocaleString() : 'Never',
  }));
  exportToCSV(data, sessionId ? `players_${sessionId}` : 'players', ['Name', 'SkillLevel', 'Wins', 'GamesPlayed', 'WinRate', 'Status', 'LastAvailableAt']);
};

export const backupData = (data: any) => {
  const backup = {
    timestamp: new Date().toISOString(),
    data,
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `badminton_backup_${new Date().toISOString().split('T')[0]}.json`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const restoreData = (file: File): Promise<any> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const backup = JSON.parse(e.target?.result as string);
        resolve(backup.data);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
};
