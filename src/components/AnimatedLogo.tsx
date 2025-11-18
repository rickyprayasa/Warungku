import { motion, Variants } from 'framer-motion';
// Donut chart properties
const DONUT_RADIUS = 11;
const DONUT_STROKE_WIDTH = 2.5;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;
const donutGroupVariants: Variants = {
  rest: {
    scale: 1,
    rotate: -90,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
  hover: {
    scale: 1.02,
    rotate: 270, // 360 - 90
    transition: {
      duration: 4,
      ease: 'linear',
      repeat: Infinity,
    },
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
export function AnimatedLogo({ textColor = "text-brand-black" }: { textColor?: string }) {
  const brandColors = ['rgb(243, 128, 32)', 'rgb(17, 17, 17)', 'rgb(160, 160, 160)', 'rgb(255, 255, 255)'];
  const donutColors = ['rgb(17, 17, 17)', 'rgb(255, 255, 255)', 'rgb(160, 160, 160)']; // Black, White, Gray
  const numDonutSegments = donutColors.length;
  const segmentLength = DONUT_CIRCUMFERENCE / numDonutSegments;
  const gapLength = DONUT_CIRCUMFERENCE - segmentLength;
  const barX = [7, 10, 13, 16];
  const separatorAngles = [0, 120, 240];
  const innerRadius = DONUT_RADIUS - DONUT_STROKE_WIDTH / 2;
  const outerRadius = DONUT_RADIUS + DONUT_STROKE_WIDTH / 2;
  return (
    <motion.div
      initial="rest"
      whileHover="hover"
      animate="rest"
      className="flex items-center gap-2 cursor-pointer transform-gpu"
    >
      <motion.svg
        viewBox="0 0 24 24"
        className="w-8 h-8"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Donut Chart Frame */}
        <motion.g style={{ transformOrigin: 'center' }} variants={donutGroupVariants}>
          {donutColors.map((color, i) => (
            <motion.circle
              key={i}
              cx="12"
              cy="12"
              r={DONUT_RADIUS}
              stroke={color}
              strokeWidth={DONUT_STROKE_WIDTH}
              strokeLinecap="butt"
              strokeDasharray={`${segmentLength} ${gapLength}`}
              transform={`rotate(${i * (360 / numDonutSegments)}, 12, 12)`}
            />
          ))}
          {/* Segment Separators */}
          {separatorAngles.map((angle) => (
            <line
              key={`sep-${angle}`}
              x1="12"
              y1={12 - innerRadius}
              x2="12"
              y2={12 - outerRadius}
              stroke="rgb(17, 17, 17)"
              strokeWidth="1"
              transform={`rotate(${angle} 12 12)`}
            />
          ))}
        </motion.g>
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
      <span className={`font-display text-2xl font-bold ${textColor}`}>OMZETIN</span>
    </motion.div>
  );
}