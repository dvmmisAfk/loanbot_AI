import { Zap, Shield, Sparkles, Globe, Bot, UserCheck, BarChart2, FileText } from 'lucide-react';

export const features = [
  {
    title: '10 Minute Approval',
    description:
      'What used to take 2-5 days now takes under 10 minutes. Sales, KYC, credit check, and sanction letter — all in one conversation.',
    icon: Zap,
    color: 'var(--color-accent-blue)',
  },
  {
    title: 'Zero Human Touchpoints',
    description:
      '4 AI agents handle the entire process autonomously. No loan officer calls. No manual document checks. No 9am-6pm availability window.',
    icon: Shield,
    color: 'var(--color-success)',
  },
  {
    title: 'Hindi + English Support',
    description:
      'Built for Tier 2 and Tier 3 India. Customers chat in Hindi, Hinglish, or English. The AI understands all three naturally.',
    icon: Sparkles,
    color: 'var(--color-accent-purple)',
  },
  {
    title: 'RBI Compliant by Design',
    description:
      'Sanction letters follow RBI Digital Lending Guidelines 2023-24. Every disbursement disclosure, APR, and grievance contact — auto-included.',
    icon: Globe,
    color: '#F59E0B',
  },
];

export const products = [
  {
    title: 'Sales Agent',
    description:
      'Understands your loan requirement in natural language. Calculates EMI. Presents a personalized offer. Works in Hindi and English.',
    icon: Bot,
    step: 'Step 1 of 4',
  },
  {
    title: 'KYC Agent',
    description:
      'Collects and validates Aadhaar and PAN through conversation. Format-validates every input. Masks sensitive data automatically.',
    icon: UserCheck,
    step: 'Step 2 of 4',
  },
  {
    title: 'Credit Agent',
    description:
      'Runs a CIBIL scoring algorithm using income, loan amount, tenure, and EMI ratio. No API call needed — instant decision.',
    icon: BarChart2,
    step: 'Step 3 of 4',
  },
  {
    title: 'Sanction Agent',
    description:
      'Auto-generates a professional PDF sanction letter. NBFC letterhead, loan table, CIBIL score, terms, signatures — all in one click.',
    icon: FileText,
    step: 'Step 4 of 4',
  },
];
