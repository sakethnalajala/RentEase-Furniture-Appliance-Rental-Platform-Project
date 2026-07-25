'use client';

import { useRef } from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';

const VARIANTS = {
  solid: 'border border-slate-200 bg-white shadow-premium dark:border-white/10 dark:bg-slate-900/80',
  glass: 'glass shadow-glass dark:shadow-glass-dark',
};

// tilt=true gives the card a subtle 3D pointer-follow rotation (perspective tilt), on top
// of the existing hover lift — used for showcase/feature cards, not form/content cards.
function TiltWrapper({ children, className }) {
  const ref = useRef(null);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springX = useSpring(rotateX, { stiffness: 300, damping: 25 });
  const springY = useSpring(rotateY, { stiffness: 300, damping: 25 });

  const handleMouseMove = (e) => {
    const rect = ref.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    rotateY.set(px * 10);
    rotateX.set(py * -10);
  };

  const handleMouseLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={{ y: -6, scale: 1.015 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      style={{ rotateX: springX, rotateY: springY, transformStyle: 'preserve-3d', perspective: 800 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function Card({ children, className = '', variant = 'solid', hover = false, tilt = false, ...props }) {
  const classes = `rounded-2xl ${VARIANTS[variant]} ${className}`;

  if (tilt) {
    return (
      <TiltWrapper className={classes} {...props}>
        {children}
      </TiltWrapper>
    );
  }

  const Component = hover ? motion.div : 'div';
  const hoverProps = hover
    ? { whileHover: { y: -6, scale: 1.01 }, transition: { type: 'spring', stiffness: 300, damping: 22 } }
    : {};

  return (
    <Component className={classes} {...hoverProps} {...props}>
      {children}
    </Component>
  );
}
