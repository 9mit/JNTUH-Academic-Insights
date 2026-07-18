import { motion } from 'framer-motion';

export default function AmbientBackground() {
  return (
    <div className="ambient-root" aria-hidden>
      <div className="ambient-mesh" />
      <div className="ambient-grid" />
      <motion.div
        className="ambient-orb ambient-orb-a"
        animate={{ x: [0, 28, -14, 0], y: [0, -22, 14, 0], scale: [1, 1.06, 0.97, 1] }}
        transition={{ duration: 36, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="ambient-orb ambient-orb-b"
        animate={{ x: [0, -32, 18, 0], y: [0, 26, -14, 0], scale: [1, 0.94, 1.04, 1] }}
        transition={{ duration: 42, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="ambient-orb ambient-orb-c"
        animate={{ x: [0, 16, -20, 0], y: [0, 28, -24, 0] }}
        transition={{ duration: 48, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="ambient-noise" />
      <div className="ambient-vignette" />
    </div>
  );
}
