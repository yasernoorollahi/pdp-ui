export const SIGNAL_COLORS = {
  energy: '#00E5FF',
  motivation: '#00FFA3',
  social: '#5B8CFF',
  discipline: '#C084FC',
  friction: '#FF6B6B',
} as const;

export type SignalKey = keyof typeof SIGNAL_COLORS;

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export const formatShortDate = (dateStr: string) => {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const formatLongDate = (dateStr: string) => {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
};

export const levelLabel = (value: number) => {
  if (value >= 0.75) return 'HIGH';
  if (value >= 0.5) return 'MEDIUM';
  if (value >= 0.3) return 'LOW';
  return 'VERY LOW';
};

export const interpretationText = (signal: SignalKey, value: number) => {
  switch (signal) {
    case 'energy':
      if (value >= 0.75) return 'High energy day with productive momentum';
      if (value >= 0.5) return 'Steady energy with good focus potential';
      if (value >= 0.3) return 'Low energy, consider lighter tasks';
      return 'Very low energy, recovery recommended';
    case 'motivation':
      if (value >= 0.75) return 'Strong drive and sustained motivation';
      if (value >= 0.5) return 'Motivation is stable and consistent';
      if (value >= 0.3) return 'Motivation dipped, progress may slow';
      return 'Motivation very low, external support may help';
    case 'social':
      if (value >= 0.75) return 'Social activity is highly engaged';
      if (value >= 0.5) return 'Social presence is steady';
      if (value >= 0.3) return 'Social activity is quiet';
      return 'Social signals are very low';
    case 'discipline':
      if (value >= 0.75) return 'Discipline is strong and reliable';
      if (value >= 0.5) return 'Discipline is steady and holding';
      if (value >= 0.3) return 'Discipline is wavering';
      return 'Discipline needs attention';
    case 'friction':
      if (value >= 0.75) return 'High friction, likely blockers or stress';
      if (value >= 0.5) return 'Moderate friction, watch for slowdowns';
      if (value >= 0.3) return 'Low friction with minor obstacles';
      return 'Very low friction, flow state likely';
    default:
      return 'Signal level';
  }
};
