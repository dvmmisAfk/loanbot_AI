import { motion } from 'framer-motion';

const oldSteps = [
  'Click ad → Fill 20-field static form',
  'Wait 2 days for manual KYC verification',
  'Wait 2 more days for credit officer call',
  'Maybe get a sanction letter by email',
  '80% of applicants drop off before completing',
];

const newSteps = [
  "Say 'mujhe 3 lakh chahiye' in chat",
  'AI collects details conversationally (~2 min)',
  'KYC verified via Aadhaar + PAN (~2 min)',
  'Credit check runs automatically (~1 min)',
  'Sanction letter PDF downloaded (~1 min)',
];

export default function BeforeAfter() {
  return (
    <section id="how-it-works" className="py-24 bg-[var(--color-fintech-navy)] relative overflow-hidden">
      {/* Divider line top */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <div className="container mx-auto px-6 lg:px-12 xl:px-24">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl lg:text-5xl font-bold font-['Poppins']">
            <span className="text-[var(--color-secondary)]">The Old Way</span>
            <span className="text-base font-normal text-[var(--color-secondary)] mx-4">vs</span>
            <span style={{ color: '#b8ff4f' }}>LoanBot Way</span>
          </h2>
        </motion.div>

        {/* Two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* LEFT — Old Process */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl border border-red-500/40 bg-red-500/[0.08] p-8"
          >
            <p className="text-xs uppercase tracking-widest text-[var(--color-secondary)] mb-6 font-semibold">
              Traditional NBFC Loan
            </p>
            <ul className="space-y-4 mb-8">
              {oldSteps.map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-[var(--color-secondary)] leading-relaxed">
                  <span className="mt-0.5 text-red-400 text-base shrink-0">❌</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
            <div className="pt-6 border-t border-red-500/35 text-center">
              <p className="text-4xl font-bold text-red-400 leading-none">~5 Days</p>
              <p className="text-xs text-[var(--color-secondary)] mt-2">average time to sanction</p>
            </div>
          </motion.div>

          {/* RIGHT — LoanBot Process */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-3xl border border-green-500/45 bg-green-500/[0.08] p-8"
          >
            <p className="text-xs uppercase tracking-widest text-[var(--color-secondary)] mb-6 font-semibold">
              LoanBot AI Loan
            </p>
            <ul className="space-y-4 mb-8">
              {newSteps.map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-[var(--color-primary)] leading-relaxed">
                  <span className="mt-0.5 text-[var(--color-success)] text-base shrink-0">✓</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
            <div className="pt-6 border-t border-green-500/35 text-center">
              <p className="text-4xl font-bold leading-none" style={{ color: '#b8ff4f' }}>
                8 min 32 sec
              </p>
              <p className="text-xs text-[var(--color-secondary)] mt-2">from first message to PDF</p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Divider line bottom */}
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </section>
  );
}
