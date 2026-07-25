// Shared Framer Motion variants used across landing/marketing sections for consistent,
// low-effort scroll/entrance animation (avoids re-declaring the same tween in every page).
export const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

export const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};
