import { Link } from 'react-router-dom';
import PlayerTile from './PlayerTile.jsx';
import RevealedCard from './RevealedCard.jsx';

export default function PlayerGrid({ waiting, revealed, total, ready, onPick, onView, onReset }) {
  if (!ready) return <p className="grid-note">Loading players…</p>;

  if (total === 0) {
    return (
      <div className="grid-note">
        <p>No players yet.</p>
        <Link className="grid-note__link" to="/add">
          Add the first player
        </Link>
      </div>
    );
  }

  return (
    <main className="sections">
      <section>
        <div className="section__head">
          <h2 className="section__title">
            In the draw<span className="section__count">{waiting.length}</span>
          </h2>
        </div>
        {waiting.length > 0 ? (
          <div className="grid">
            {waiting.map((p) => (
              <PlayerTile key={p.id} player={p} onPick={onPick} />
            ))}
          </div>
        ) : (
          <p className="section__note">Every player has been revealed.</p>
        )}
      </section>

      {revealed.length > 0 && (
        <section>
          <div className="section__head">
            <h2 className="section__title">
              Revealed<span className="section__count">{revealed.length}</span>
            </h2>
            <button className="section__reset" onClick={onReset}>
              Reset reveals
            </button>
          </div>
          <div className="grid grid--cards">
            {revealed.map((p) => (
              <RevealedCard key={p.id} player={p} onView={onView} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
