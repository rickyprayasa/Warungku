import { motion, Variants } from 'framer-motion';
// Donut chart properties
const DONUT_RADIUS = 11;
const DONUT_STROKE_WIDTH = 2.5;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;
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
// Bar chart properties - adjusted to fit inside the donut
const BAR_BASE_Y = 18;
const barVariants: Variants = {
  rest: (i: number) => ({
    y: BAR_BASE_Y - [4, 6, 8, 5][i], // Rest heights
    height: [4, 6, 8, 5][i],
    transition: { duration: 0.4, ease: 'easeOut' },
  }),
  hover: (i: number) => ({
    y: BAR_BASE_Y - [8, 12, 10, 7][i], // Hover heights
    height: [8, 12, 10, 7][i],
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
  const barX = [7, 10, 13, 16];
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
        {/* Donut Chart Frame */}
        <g style={{ transformOrigin: 'center' }}>
          {brandColors.map((color, i) => (
            <motion.circle
              key={i}
              cx="12"
              cy="12"
              r={DONUT_RADIUS}
              stroke={color}
              strokeWidth={DONUT_STROKE_WIDTH}
              strokeLinecap="butt"
              transform={`rotate(${segmentRotations[i]} 12 12)`}
              strokeDasharray={`${DONUT_CIRCUMFERENCE / 4} ${DONUT_CIRCUMFERENCE}`}
              variants={donutSegmentVariants}
            />
          ))}
        </g>
        {/* Bar Chart (inside the donut) */}
        <g>
          {brandColors.map((color, i) => (
            <motion.rect
              key={i}
              x={barX[i]}
              width="2"
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