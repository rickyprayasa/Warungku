import { useEffect, useState } from 'react';
import { Cookie, CakeSlice, Coffee, GlassWater, Sandwich, Lollipop } from 'lucide-react';
import { motion } from 'framer-motion';
const icons = [Cookie, CakeSlice, Coffee, GlassWater, Sandwich, Lollipop];
interface IconStyle {
  id: number;
  Icon: React.ElementType;
  style: React.CSSProperties;
}
const generateRandomStyles = (count: number): IconStyle[] => {
  return Array.from({ length: count }, (_, i) => {
    const Icon = icons[Math.floor(Math.random() * icons.length)];
    const size = Math.random() * 32 + 24; // 24px to 56px
    return {
      id: i,
      Icon,
      style: {
        position: 'absolute',
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        width: `${size}px`,
        height: `${size}px`,
        transform: `rotate(${Math.random() * 360}deg)`,
        opacity: Math.random() * 0.1 + 0.05, // 0.05 to 0.15
        color: 'rgb(17, 17, 17)',
      },
    };
  });
};
export function SnackIconBackground() {
  const [iconStyles, setIconStyles] = useState<IconStyle[]>([]);
  useEffect(() => {
    setIconStyles(generateRandomStyles(30));
  }, []);
  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
      {iconStyles.map(({ id, Icon, style }) => (
        <motion.div
          key={id}
          style={style}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: style.opacity }}
          transition={{ duration: 0.5, delay: Math.random() * 1 }}
        >
          <Icon style={{ width: '100%', height: '100%' }} />
        </motion.div>
      ))}
    </div>
  );
}