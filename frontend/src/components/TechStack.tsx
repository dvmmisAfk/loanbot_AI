import { motion } from 'framer-motion';

const badges = [
  { emoji: '⚡', name: 'LangGraph', border: 'rgba(167,139,250,0.6)', bg: 'rgba(167,139,250,0.08)' },
  { emoji: '🦙', name: 'Groq Llama 3.3', border: 'rgba(251,146,60,0.6)', bg: 'rgba(251,146,60,0.08)' },
  { emoji: '🐍', name: 'FastAPI', border: 'rgba(74,222,128,0.6)', bg: 'rgba(74,222,128,0.08)' },
  { emoji: '⚛️', name: 'React + Vite', border: 'rgba(34,211,238,0.6)', bg: 'rgba(34,211,238,0.08)' },
  { emoji: '📄', name: 'ReportLab PDF', border: 'rgba(239,68,68,0.6)', bg: 'rgba(239,68,68,0.08)' },
  { emoji: '🔗', name: 'WebSocket', border: 'rgba(234,179,8,0.6)', bg: 'rgba(234,179,8,0.08)' },
  { emoji: '🗺️', name: 'LangChain', border: 'rgba(20,184,166,0.6)', bg: 'rgba(20,184,166,0.08)' },
];

export default function TechStack() {
  return (
    <section className="py-16 bg-[var(--color-dark-base)] relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="container mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-secondary)] mb-8 font-semibold">
            Built With
          </p>

          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {badges.map((badge, i) => (
              <motion.div
                key={badge.name}
                initial={{ opacity: 0, scale: 0.85 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.06 }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] text-[var(--color-primary)] font-medium"
                style={{ border: `1px solid ${badge.border}`, background: badge.bg }}
              >
                <span>{badge.emoji}</span>
                <span>{badge.name}</span>
              </motion.div>
            ))}
          </div>

          <p className="text-[11px] text-[var(--color-secondary)]">
            Matrix 3.0 Hackathon &bull; Team TechMaster &bull; Divyam (Team Lead) + Aarushi Garg
          </p>
        </motion.div>
      </div>
    </section>
  );
}
