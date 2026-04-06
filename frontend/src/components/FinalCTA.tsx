import { motion } from 'framer-motion';

export default function FinalCTA({ onApply }: { onApply: () => void }) {
  return (
    <section className="relative py-32 overflow-hidden bg-[var(--color-dark-base)]">
      {/* Immersive glowing background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[900px] h-[900px] bg-gradient-to-r from-[var(--color-accent-blue)] via-[var(--color-accent-purple)] to-[var(--color-success)] rounded-full blur-[130px] opacity-22 mix-blend-screen" />
      </div>

      <div className="container mx-auto px-6 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto backdrop-blur-sm bg-white/[0.04] border border-white/20 rounded-[3rem] p-12 lg:p-24 shadow-2xl overflow-hidden relative"
        >
          {/* Subtle inside glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />

          <h2 className="text-4xl lg:text-6xl font-bold font-['Poppins'] mb-8 text-white">
            Ready to approve <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#818cf8] to-[#f472b6]">
              in 10 minutes?
            </span>
          </h2>

          <p className="text-xl text-[var(--color-secondary)] mb-12 max-w-2xl mx-auto">
            LoanBot is live and working right now. Type your loan requirement and get a signed sanction letter before this
            page reloads. No sign up. No forms. Just chat.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <button
              onClick={onApply}
              className="w-full sm:w-auto px-10 py-5 bg-white text-[var(--color-dark-base)] font-bold rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)]"
            >
              Try It Right Now →
            </button>
            <a
              href="https://github.com/dvmmisAfk/loanbot_AI"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-10 py-5 bg-transparent text-white border border-white/20 font-bold rounded-2xl transition-all hover:bg-white/10 text-center"
            >
              View on GitHub
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
