import { motion } from 'framer-motion';
const iconVariants = {
  rest: {
    '--path-1-d': 'path("M 12 2 A 10 10 0 0 1 22 12")',
    '--path-2-d': 'path("M 2 12 A 10 10 0 0 1 12 22")',
    '--bar-1-y': 14,
    '--bar-2-y': 10,
    '--bar-3-y': 6,
    transition: { duration: 0.3, ease: 'easeInOut' },
  },
  hover: {
    '--path-1-d': 'path("M 12 2 A 10 10 0 1 1 2 12")',
    '--path-2-d': 'path("M 22 12 A 10 10 0 0 1 12 22")',
    '--bar-1-y': 10,
    '--bar-2-y': 6,
    '--bar-3-y': 14,
    transition: { duration: 0.4, ease: 'easeInOut', repeat: Infinity, repeatType: 'reverse' },
  },
};
export function AnimatedLogo() {
  return (
    <motion.div
      initial="rest"
      whileHover="hover"
      animate="rest"
      className="flex items-center gap-2 cursor-pointer"
    >
      <motion.svg
        viewBox="0 0 24 24"
        className="w-8 h-8"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Donut Chart Part */}
        <motion.path
          d="M 12 2 A 10 10 0 0 1 22 12"
          stroke="rgb(17, 17, 17)"
          strokeWidth="3"
          style={{ d: 'var(--path-1-d)' as any }}
          variants={iconVariants}
        />
        <motion.path
          d="M 2 12 A 10 10 0 0 1 12 22"
          stroke="rgb(243, 128, 32)"
          strokeWidth="3"
          style={{ d: 'var(--path-2-d)' as any }}
          variants={iconVariants}
        />
        {/* Bar Chart Part (inside the donut) */}
        <motion.rect
          x="6"
          width="3"
          height="8"
          fill="rgb(17, 17, 17)"
          rx="1"
          style={{ y: 'var(--bar-1-y)' as any }}
          variants={iconVariants}
        />
        <motion.rect
          x="10.5"
          width="3"
          height="12"
          fill="rgb(243, 128, 32)"
          rx="1"
          style={{ y: 'var(--bar-2-y)' as any }}
          variants={iconVariants}
        />
        <motion.rect
          x="15"
          width="3"
          height="16"
          fill="rgb(17, 17, 17)"
          rx="1"
          style={{ y: 'var(--bar-3-y)' as any }}
          variants={iconVariants}
        />
      </motion.svg>
      <span className="font-display text-2xl font-bold text-brand-black">OMZETIN</span>
    </motion.div>
  );
}