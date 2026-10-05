import { Link } from 'react-router-dom';

export default function Header({ revealedCount, total }) {
  const pct = total ? Math.round((revealedCount / total) * 100) : 0;

  return (
    <header className="hero">
      <img className="hero__img" src="/bg-stadium.jpg" alt="" />
      <div className="hero__sheet">
        <div className="hero__inner">
          <div className="hero__brand">
            <img
              className="hero__logo"
              src="/logo.png"
              alt=""
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div>
              <h1 className="hero__title">VZK Super League</h1>
              <p className="hero__sub">Player reveal</p>
            </div>
          </div>
          <div
            className="progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={revealedCount}
          >
            <p className="progress__text">
              <strong>{revealedCount}</strong> of {total} revealed
            </p>
            <div className="progress__track">
              <div className="progress__fill" style={{ width: `${pct}%` }} />
            </div>
            <Link className="hero__add" to="/add">
              Add players
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
