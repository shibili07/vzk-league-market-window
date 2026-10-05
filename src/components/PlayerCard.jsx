export const POSITIONS = [
  { code: 'GK', label: 'Goal Keeper' },
  { code: 'DEF', label: 'Defender' },
  { code: 'MID', label: 'Midfielder' },
  { code: 'FWD', label: 'Forward' },
];

export const positionLabel = (code) => POSITIONS.find((p) => p.code === code)?.label ?? code;

function Silhouette() {
  return (
    <svg className="pcard__silhouette" viewBox="0 0 200 240" aria-hidden="true">
      <circle cx="100" cy="78" r="46" />
      <path d="M12 240c0-62 40-96 88-96s88 34 88 96z" />
    </svg>
  );
}

// The card: your template artwork (public/card-template.jpg, text removed)
// with the photo, name and position laid on top. Sized in container units, so
// it scales to any width.
export default function PlayerCard({ name, position, photoUrl, animate = false }) {
  const label = name.trim() || 'Player name';
  // 96 keeps long names inside the straight part of the pill
  const fontSize = Math.min(8.5, 96 / label.length);

  return (
    <div className={`pcard-wrap${animate ? ' pcard-wrap--animate' : ''}`}>
      <div className="pcard">
        <img className="pcard__bg" src="/card-template.jpg" alt="" draggable={false} />

        <span className="pcard__code">{position}</span>

        <div className="pcard__photo">
          {photoUrl ? <img src={photoUrl} alt={label} /> : <Silhouette />}
        </div>

        <div className="pcard__name">
          <span style={{ fontSize: `${fontSize}cqw` }}>{label}</span>
        </div>

        <div className="pcard__pos">
          <span>Position</span>
          <strong>{positionLabel(position)}</strong>
        </div>
      </div>
    </div>
  );
}
