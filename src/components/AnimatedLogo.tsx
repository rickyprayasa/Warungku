import { motion, Variants } from 'framer-motion';
const CIRCLE_RADIUS = 10;
const CIRCLE_STROKE_WIDTH = 3;
const CIRCLE_LENGTH = 2 * Math.PI * CIRCLE_RADIUS;
const donutSegmentVariants: Variants = {
  rest: {
    scale: 1,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
  hover: {
    scale: 1.05,
    transition: { duration: 0.5, ease: 'easeInOut', repeat: Infinity, repeatType: 'reverse' },
  },
};
const barVariants: Variants = {
  rest: (i: number) => ({
    y: [20, 18, 16, 14][i],
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
  const brandColors = ['rgb(243, 128, 32)', 'rgb(17, 17, 17)', 'rgb(160, 160, 160)', 'rgb(255, 255, 255)'];
  const barX = [5, 9, 13, 17];
  const segmentRotations = [-90, 0, 90, 180];
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
        {/* Donut Chart - now with 4 colored segments */}
        <g style={{ transformOrigin: 'center' }}>
          {brandColors.map((color, i) => (
            <motion.circle
              key={i}
              cx="12"
              cy="12"
              r={CIRCLE_RADIUS}
              stroke={color}
              strokeWidth={CIRCLE_STROKE_WIDTH}
              strokeLinecap="butt"
              transform={`rotate(${segmentRotations[i]} 12 12)`}
              strokeDasharray={`${CIRCLE_LENGTH / 4} ${CIRCLE_LENGTH}`}
              variants={donutSegmentVariants}
            />
          ))}
        </g>
        {/* Bar Chart - slightly scaled down to emphasize donut */}
        <g transform="scale(0.8) translate(3, 3)">
          {brandColors.map((color, i) => (
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