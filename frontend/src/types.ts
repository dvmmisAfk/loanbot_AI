export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  showLoanOffer?: boolean;
  showKYCCard?: boolean;
}

export interface LoanData {
  loan_amount?: number;
  tenure?: number;
  emi?: number;
  name?: string;
  aadhaar?: string;
  pan?: string;
  cibil_score?: number;
  loan_status?: string;
}

export function parseLoanData(content: string, existing: LoanData): LoanData {
  const d = { ...existing };

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

  if (!d.loan_status) {
    if (content.includes('APPROVED')) d.loan_status = 'APPROVED';
    else if (content.includes('REVIEW')) d.loan_status = 'REVIEW';
  }

  return d;
}

export function formatINR(n: number): string {
  return n.toLocaleString('en-IN');
}
