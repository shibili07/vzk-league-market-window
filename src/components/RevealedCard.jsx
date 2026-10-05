import { useState } from 'react';
import PlayerCard from './PlayerCard.jsx';
import { downloadCard } from '../lib/cardImage.js';

// A player who has been revealed: the finished card, with buttons under it.
export default function RevealedCard({ player, onView }) {
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const download = async () => {
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
    <div className="rcard">
      <div className="rcard__face" onClick={() => onView(player)}>
        <PlayerCard name={player.name} position={player.position} photoUrl={player.photoUrl} />
      </div>
      <div className="rcard__actions">
        <button className="rcard__btn rcard__btn--main" onClick={() => onView(player)}>
          View card
        </button>
        <button className="rcard__btn" onClick={download} disabled={saving}>
          {saving ? 'Preparing…' : failed ? 'Try again' : 'Download'}
        </button>
      </div>
    </div>
  );
}
