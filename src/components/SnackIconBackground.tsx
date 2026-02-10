import { useEffect, useState } from 'react';
import {
  Cookie, CakeSlice, Coffee, GlassWater, Sandwich, Lollipop, // F&B
  Hammer, Wrench, PaintBucket, Ruler, HardHat, BrickWall, // Material
  Zap, Lightbulb, Plug, Battery, Radio, // Listrik
  Smartphone, Laptop, Tablet, Headphones, Watch, // Elektronik
  Shirt, Scissors, Tag, ShoppingBag, Glasses, // Pakaian
  Settings, UserCog, Briefcase, // Jasa
  Box, Star, Circle, Store // Lainnya
} from 'lucide-react';
import { motion } from 'framer-motion';

const iconSets: Record<string, React.ElementType[]> = {
  'Warung': [Cookie, CakeSlice, Coffee, GlassWater, Sandwich, Lollipop],
  'F&B': [Cookie, CakeSlice, Coffee, GlassWater, Sandwich, Lollipop],
  'Material/Bangunan': [Hammer, Wrench, PaintBucket, Ruler, HardHat, BrickWall],
  'Listrik': [Zap, Lightbulb, Plug, Battery, Radio],
  'Elektronik': [Smartphone, Laptop, Tablet, Headphones, Watch],
  'Pakaian': [Shirt, Scissors, Tag, ShoppingBag, Glasses],
  'Jasa': [Wrench, Settings, UserCog, Briefcase],
  'Lainnya': [Box, Star, Circle, Store]
};

interface IconStyle {
  id: number;
  Icon: React.ElementType;
  style: React.CSSProperties;
}

const generateRandomStyles = (count: number, isMobile: boolean, category: string): IconStyle[] => {
  const icons = iconSets[category] || iconSets['Warung'];

  return Array.from({ length: count }, (_, i) => {
    const Icon = icons[Math.floor(Math.random() * icons.length)];
    // Smaller icons on mobile
    const size = isMobile
      ? Math.random() * 20 + 20  // 20px to 40px on mobile
      : Math.random() * 32 + 24; // 24px to 56px on desktop

    // More transparent on mobile to reduce visual clutter
    const opacity = isMobile
      ? Math.random() * 0.06 + 0.03  // 0.03 to 0.09 on mobile
      : Math.random() * 0.1 + 0.05;   // 0.05 to 0.15 on desktop

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
        opacity,
        color: 'rgb(17, 17, 17)',
      },
    };
  });
};

export function SnackIconBackground({ category = 'Warung' }: { category?: string }) {
  const [iconStyles, setIconStyles] = useState<IconStyle[]>([]);

  useEffect(() => {
    // Detect if mobile based on window width
    const isMobile = window.innerWidth < 768;
    // Use fewer icons on mobile (12) vs desktop (30)
    const iconCount = isMobile ? 12 : 30;

    // Initial generation
    setIconStyles(generateRandomStyles(iconCount, isMobile, category));

    // Re-generate on resize
    const handleResize = () => {
      const isMobileNow = window.innerWidth < 768;
      const count = isMobileNow ? 12 : 30;
      setIconStyles(generateRandomStyles(count, isMobileNow, category));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [category]); // Re-run if category changes

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