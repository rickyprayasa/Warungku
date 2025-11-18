import { motion, Variants } from 'framer-motion';
const CIRCLE_LENGTH = 2 * Math.PI * 10; // 2 * PI * R
const donutVariants: Variants = {
  rest: {
    strokeDashoffset: CIRCLE_LENGTH * 0.25, // Start at 75% full
    transition: { duration: 0.4, ease: 'easeOut' },
  },
  hover: {
    strokeDashoffset: 0, // Animate to 100% full
    transition: { duration: 0.5, ease: 'easeInOut', repeat: Infinity, repeatType: 'reverse' },
  },
};
const barVariants: Variants = {
  rest: {
    y: [14, 10, 6],
    transition: { duration: 0.4, ease: 'easeOut' },
  },
  hover: {
    y: [10, 6, 14],
    transition: { duration: 0.5, ease: 'easeInOut', repeat: Infinity, repeatType: 'reverse' },
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
        {/* Donut Chart */}
        <circle cx="12" cy="12" r="10" stroke="rgb(17, 17, 17)" strokeOpacity="0.2" strokeWidth="3" />
        <motion.circle
          cx="12"
          cy="12"
          r="10"
          stroke="rgb(243, 128, 32)"
          strokeWidth="3"
          strokeLinecap="round"
          transform="rotate(-90 12 12)"
          strokeDasharray={CIRCLE_LENGTH}
          variants={donutVariants}
        />
        {/* Bar Chart */}
        <motion.rect x="6" width="3" height="8" fill="rgb(17, 17, 17)" rx="1" variants={barVariants} custom={0} style={{ y: barVariants.rest.y[0] }} />
        <motion.rect x="10.5" width="3" height="12" fill="rgb(243, 128, 32)" rx="1" variants={barVariants} custom={1} style={{ y: barVariants.rest.y[1] }} />
        <motion.rect x="15" width="3" height="16" fill="rgb(17, 17, 17)" rx="1" variants={barVariants} custom={2} style={{ y: barVariants.rest.y[2] }} />
      </motion.svg>
      <span className="font-display text-2xl font-bold text-brand-black">OMZETIN</span>
    </motion.div>
  );
}