import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import PlayerCard from './PlayerCard.jsx';
import { downloadCard } from '../lib/cardImage.js';

export default function PlayerReveal({ player, onClose }) {
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const download = async (e) => {
    e.stopPropagation();
    setSaving(true);
    setFailed(false);
    try {
      await downloadCard(player);
    } catch (err) {
      console.error(err);
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      className="stage stage--reveal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      onClick={onClose}
    >
      <motion.div
        className="reveal__card"
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 160, damping: 18, delay: 0.1 }}
      >
        <PlayerCard
          name={player.name}
          position={player.position}
          photoUrl={player.photoUrl}
          animate
        />
      </motion.div>
      <button
        className="stage__back"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Back"
      >
        ← Back
      </button>
      <button className="stage__download" onClick={download} disabled={saving}>
        {saving ? 'Preparing…' : failed ? 'Try download again' : 'Download card'}
      </button>
    </motion.div>
  );
}
