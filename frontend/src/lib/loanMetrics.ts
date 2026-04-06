export function getScoreBand(score?: number) {
  if ((score ?? 0) >= 750) return 'EXCELLENT';
  if ((score ?? 0) >= 700) return 'GOOD';
  if ((score ?? 0) >= 650) return 'FAIR';
  if ((score ?? 0) >= 550) return 'POOR';
  return 'VERY POOR';
}

export function getScorePillLabel(score?: number) {
  const band = getScoreBand(score);
  if (band === 'GOOD') return 'GOOD STANDING';
  return band;
}

export function getScoreColor(score?: number) {
  if ((score ?? 0) >= 750) return '#22c55e';
  if ((score ?? 0) >= 700) return '#84cc16';
  if ((score ?? 0) >= 650) return '#f59e0b';
  return '#ef4444';
}

export function getScoreSoftBackground(score?: number) {
  const color = getScoreColor(score);
  if (color === '#22c55e') return 'rgba(34,197,94,0.18)';
  if (color === '#84cc16') return 'rgba(132,204,22,0.18)';
  if (color === '#f59e0b') return 'rgba(245,158,11,0.18)';
  return 'rgba(239,68,68,0.18)';
}

export function getEmiRatioColor(ratio?: number) {
  if ((ratio ?? 0) < 30) return '#22c55e';
  if ((ratio ?? 0) <= 40) return '#facc15';
  if ((ratio ?? 0) <= 50) return '#f59e0b';
  return '#ef4444';
}

export function getEmiRatioLabel(ratio?: number) {
  if ((ratio ?? 0) <= 40) return 'Within 30-40% safe zone';
  if ((ratio ?? 0) <= 50) return 'Above recommended';
  return 'Exceeds safe limit';
}

export function getNpaRiskColor(risk?: string) {
  if (risk === 'LOW') return '#22c55e';
  if (risk === 'MEDIUM') return '#f59e0b';
  if (risk === 'HIGH') return '#ef4444';
  return '#8892a4';
}

export function getDecisionState(score?: number) {
  if ((score ?? 0) >= 650) {
    return {
      key: 'approved',
      background: 'rgba(34,197,94,0.15)',
      border: 'rgba(34,197,94,0.35)',
      color: '#22c55e',
      label: '✓ LOAN APPROVED — Offer rate: 10.5% p.a.',
    };
  }

  if ((score ?? 0) >= 600) {
    return {
      key: 'review',
      background: 'rgba(245,158,11,0.15)',
      border: 'rgba(245,158,11,0.35)',
      color: '#f59e0b',
      label: '⚠ UNDER REVIEW — A loan officer will contact you',
    };
  }

  return {
    key: 'declined',
    background: 'rgba(239,68,68,0.15)',
    border: 'rgba(239,68,68,0.35)',
    color: '#ef4444',
    label: '✗ APPLICATION DECLINED — Insufficient profile',
  };
}

export function clampPercent(value?: number) {
  return Math.max(0, Math.min(100, value ?? 0));
}
