import { motion, Variants } from 'framer-motion';
const CIRCLE_LENGTH = 2 * Math.PI * 10; // 2 * PI * R
const donutVariants: Variants = {
  rest: {
    strokeDashoffset: 0, // Show full circle by default
    transition: { duration: 0.4, ease: 'easeOut' },
  },
  hover: {
    scale: 1.05, // Add a subtle pulse on hover
    transition: { duration: 0.5, ease: 'easeInOut', repeat: Infinity, repeatType: 'reverse' },
  },
};
const barVariants: Variants = {
  rest: (i: number) => ({
    y: [20, 18, 16, 14][i], // Make bars visible in rest state
    transition: { duration: 0.4, ease: 'easeOut' },
  }),
  hover: (i: number) => ({
    y: [16, 12, 8, 4][i],
    transition: {
      duration: 0.5,
      ease: 'easeInOut',
      repeat: Infinity,
      repeatType: 'reverse',
      delay: i * 0.05,
    },
  }),
};
export function AnimatedLogo() {
  const barColors = ['rgb(243, 128, 32)', 'rgb(17, 17, 17)', 'rgb(160, 160, 160)', 'rgb(255, 255, 255)'];
  const barX = [5, 9, 13, 17];
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
        <circle cx="12" cy="12" r="10" stroke="rgb(17, 17, 17)" strokeOpacity="0.2" strokeWidth="2.5" />
        <motion.circle
          cx="12"
          cy="12"
          r="10"
          stroke="rgb(243, 128, 32)"
          strokeWidth="2.5"
          strokeLinecap="round"
          transform="rotate(-90 12 12)"
          strokeDasharray={CIRCLE_LENGTH}
          originX="12"
          originY="12"
          variants={donutVariants}
        />
        {/* Bar Chart */}
        <g>
          {barColors.map((color, i) => (
            <motion.rect
              key={i}
              x={barX[i]}
              width="2.5"
              height="20"
              fill={color}
              stroke="rgb(17, 17, 17)"
              strokeWidth="0.5"
              rx="1"
              variants={barVariants}
              custom={i}
            />
          ))}
        </g>
      </motion.svg>
      <span className="font-display text-2xl font-bold text-brand-black">OMZETIN</span>
    </motion.div>
  );
}