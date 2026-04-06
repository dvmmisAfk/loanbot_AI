export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface LoanData {
  loan_amount?: number;
  tenure?: number;
  income?: number;
  emi?: number;
  emi_ratio?: number;
  affordability_warning?: boolean;
  risk_factors?: string[];
  approval_reasoning?: string;
  npa_risk?: string;
  loan_to_income?: number;
  name?: string;
  aadhaar?: string;
  pan?: string;
  kyc_status?: string;
  video_kyc_status?: string;
  face_match_score?: number;
  liveness_passed?: boolean;
  kyc_confidence?: number;
  cibil_score?: number;
  loan_status?: string;
}

export function parseLoanData(content: string, existing: LoanData, snapshot: Partial<LoanData> = {}): LoanData {
  const hasRiskFactors = Object.prototype.hasOwnProperty.call(snapshot, 'risk_factors');
  const d: LoanData = {
    ...existing,
    ...snapshot,
    risk_factors: hasRiskFactors
      ? [...(snapshot.risk_factors ?? [])]
      : existing.risk_factors
      ? [...existing.risk_factors]
      : [],
  };

  const m1 = content.match(/Amount:\s*₹([\d,]+)/);
  if (m1) d.loan_amount = parseInt(m1[1].replace(/,/g, ''));

  const m2 = content.match(/Tenure:\s*(\d+)\s*months/);
  if (m2) d.tenure = parseInt(m2[1]);

  const m3 = content.match(/(?:Monthly\s+)?EMI:\s*₹([\d,]+)/);
  if (m3) d.emi = parseInt(m3[1].replace(/,/g, ''));

  const m4 = content.match(/CIBIL Score:\s*(\d+)/);
  if (m4) d.cibil_score = parseInt(m4[1]);

  const m5 = content.match(/Borrower:\s*(.+?)(?:\n|$)/);
  if (m5) d.name = m5[1].trim();

  // KYC name (• Name: Divyam)
  const m6 = content.match(/• Name:\s*(.+?)(?:\n|$)/);
  if (m6) d.name = m6[1].trim();

  const m7 = content.match(/Aadhaar:\s*([\dX-]+)/);
  if (m7) d.aadhaar = m7[1];

  const m8 = content.match(/PAN:\s*([A-Z]{3}[A-Z0-9X]+)/);
  if (m8) d.pan = m8[1];

  const m9 = content.match(/EMI-to-income ratio:\s*([\d.]+)%/i);
  if (m9) d.emi_ratio = parseFloat(m9[1]);

  const m10 = content.match(/Monthly Income:\s*₹([\d,]+)/i);
  if (m10) d.income = parseInt(m10[1].replace(/,/g, ''));

  const m11 = content.match(/Loan-to-Income:\s*([\d.]+)x/i);
  if (m11) d.loan_to_income = parseFloat(m11[1]);

  if (content.includes('KYC VERIFIED') || content.includes('Document KYC Captured')) {
    d.kyc_status = 'VERIFIED';
  }

  if (!d.loan_status) {
    if (content.includes('APPROVED')) d.loan_status = 'APPROVED';
    else if (content.includes('REVIEW')) d.loan_status = 'REVIEW';
  }

  return d;
}

export function formatINR(n: number): string {
  return n.toLocaleString('en-IN');
}
