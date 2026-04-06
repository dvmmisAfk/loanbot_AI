import { motion } from 'framer-motion';
import { products } from '../data/features';
import { ArrowUpRight } from 'lucide-react';

export default function ProductCards() {
  return (
    <section className="py-24 bg-[var(--color-dark-base)]">
      <div className="container mx-auto px-6 lg:px-12 xl:px-24">
        <div className="text-center mb-20 max-w-3xl mx-auto">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="text-3xl lg:text-5xl font-bold font-['Poppins'] mb-6"
          >
            Meet Your <span className="text-[var(--color-accent-purple)]">AI Loan Team</span>
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product, index) => {
            const Icon = product.icon;
            return (
              <motion.div
                key={product.title}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                whileHover={{ y: -8 }}
                className="group relative h-full bg-gradient-to-b from-[var(--color-fintech-navy)] to-transparent rounded-3xl p-[1px] overflow-hidden"
              >
                {/* Gradient border effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/10 opacity-60 group-hover:opacity-100 transition-opacity" />
                
                <div className="relative h-full bg-[var(--color-fintech-navy)] rounded-3xl p-8 flex flex-col items-center text-center">
                  <div className="p-4 rounded-full bg-[var(--color-dark-base)] mb-6 shadow-[0_0_20px_rgba(34,211,238,0.2)] transform group-hover:scale-110 transition-transform duration-300">
                    <Icon className="w-8 h-8 text-[var(--color-accent-blue)] group-hover:text-[var(--color-success)] transition-colors" />
                  </div>
                  
                  <h3 className="text-xl font-semibold mb-3 text-white">
                    {product.title}
                  </h3>
                  
                  <p className="text-sm text-[var(--color-secondary)] leading-relaxed mb-6 flex-grow">
                    {product.description}
                  </p>

                  <button className="flex items-center gap-1 text-sm font-semibold text-[var(--color-primary)] opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                    {product.step} <ArrowUpRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
