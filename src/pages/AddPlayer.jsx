import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import PlayerCard, { POSITIONS, positionLabel } from '../components/PlayerCard.jsx';
import { usePlayers } from '../context/PlayersContext.jsx';
import { compressPhoto, frameForCard, stripBackground } from '../lib/photo.js';
import PlayerReveal from '../components/PlayerReveal.jsx';
import { didSaveFail } from '../db/database.js';
import { downloadCard } from '../lib/cardImage.js';

export default function AddPlayer() {
  const { players, ready, addPlayer, removePlayer } = usePlayers();

  const [name, setName] = useState('');
  const [position, setPosition] = useState(POSITIONS[0].code);
  const [number, setNumber] = useState('');
  const [numberTouched, setNumberTouched] = useState(false);
  const [file, setFile] = useState(null);
  const [skipRemoval, setSkipRemoval] = useState(false);
  const [photo, setPhoto] = useState(null); // { blob, url }
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [inputKey, setInputKey] = useState(0);
  const [viewing, setViewing] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const photoUrlRef = useRef(null);

  // Remove the background (unless skipped), then shrink, whenever the file changes.
  useEffect(() => {
    if (!file) {
      setPhoto(null);
      return undefined;
    }

    let cancelled = false;
    (async () => {
      setNotice('');
      setBusy(skipRemoval ? 'Preparing photo…' : 'Loading background remover…');
      let source = file;

      if (!skipRemoval) {
        try {
          source = await stripBackground(file, (key, current, total) => {
            if (cancelled) return;
            setBusy(
              key.startsWith('fetch') && total
                ? `Downloading background remover… ${Math.round((current / total) * 100)}%`
                : 'Removing background…'
            );
          });
        } catch (err) {
          console.error(err);
          if (!cancelled) {
            setNotice(
              'Background removal failed, so the original photo is used. Check your internet connection, or tick “Photo already has no background”.'
            );
          }
        }
      }

      try {
        const blob = await compressPhoto(source);
        const framed = await frameForCard(blob); // the preview shows what the card will show
        if (cancelled) return;
        setPhoto({ blob, url: URL.createObjectURL(framed) });
      } catch (err) {
        console.error(err);
        if (!cancelled) setNotice('This file could not be read as an image. Try a JPG or PNG.');
      } finally {
        if (!cancelled) setBusy('');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [file, skipRemoval]);

  // Keep one blob URL alive for the preview, and free the old one on change.
  useEffect(() => {
    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
    photoUrlRef.current = photo?.url ?? null;
  }, [photo]);

  useEffect(() => () => photoUrlRef.current && URL.revokeObjectURL(photoUrlRef.current), []);

  // Suggest the next free number until the user types their own.
  const suggested = Math.max(0, ...players.map((p) => p.number ?? 0)) + 1;
  useEffect(() => {
    if (!numberTouched) setNumber(String(suggested));
  }, [suggested, numberTouched]);

  const numberValue = Number(number);
  const numberValid = Number.isInteger(numberValue) && numberValue >= 1 && numberValue <= 999;
  const numberOwner = numberValid ? players.find((p) => p.number === numberValue) : null;
  const numberError = number !== '' && !numberValid
    ? 'Use a whole number from 1 to 999.'
    : numberOwner
      ? `Number ${numberValue} is already used by ${numberOwner.name}.`
      : '';

  // the photo is optional; the number is not, because it identifies the card in the draw
  const canSave = name.trim() && numberValid && !numberOwner && !busy && !saving;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    try {
      const bytes = photo ? new Uint8Array(await photo.blob.arrayBuffer()) : null;
      await addPlayer({
        name: name.trim(),
        position,
        number: numberValue,
        photo: bytes,
        photoType: photo?.blob.type ?? '',
      });
      setNotice(
        didSaveFail()
          ? `${name.trim()} added, but this browser blocked saving. The player will be lost on refresh.`
          : `${name.trim()} added.`
      );
      setName('');
      setNumberTouched(false);
      setFile(null);
      setPhoto(null);
      setInputKey((k) => k + 1);
      navigator.storage?.persist?.();
    } catch (err) {
      console.error(err);
      setNotice('Could not save this player. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const onRemove = (p) => {
    if (window.confirm(`Remove ${p.name}?`)) removePlayer(p.id);
  };

  const onDownload = async (p) => {
    setDownloadingId(p.id);
    try {
      await downloadCard(p);
    } catch (err) {
      console.error(err);
      setNotice(`Could not create the card image for ${p.name}. Try again.`);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="add">
      <header className="add__bar">
        <Link className="add__back" to="/">
          ← Back to reveal
        </Link>
        <h1 className="add__title">Add player</h1>
      </header>

      <div className="add__body">
        <form className="form" onSubmit={onSubmit}>
          <label className="field">
            <span className="field__label">Name</span>
            <input
              className="field__input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              autoComplete="off"
              placeholder="e.g. Afsahudheen"
            />
          </label>

          <div className="field-row">
            <label className="field">
              <span className="field__label">Position</span>
              <select
                className="field__input"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
              >
                {POSITIONS.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.label} ({p.code})
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="field__label">Number</span>
              <input
                className="field__input"
                type="number"
                inputMode="numeric"
                min="1"
                max="999"
                step="1"
                value={number}
                onChange={(e) => {
                  setNumber(e.target.value);
                  setNumberTouched(true);
                }}
                aria-invalid={!!numberError}
              />
            </label>
          </div>
          <p className={`field__hint${numberError ? ' field__hint--error' : ''}`}>
            {numberError || 'The card shows this number in the draw, so the name stays hidden until the reveal.'}
          </p>

          <label className="field">
            <span className="field__label">Photo (optional)</span>
            <input
              key={inputKey}
              className="field__file"
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <span className="field__hint">Without a photo the card shows a placeholder silhouette.</span>
          </label>

          <label className="check">
            <input
              type="checkbox"
              checked={skipRemoval}
              onChange={(e) => setSkipRemoval(e.target.checked)}
            />
            Photo already has no background
          </label>

          {busy && (
            <p className="status" role="status">
              <span className="spinner" aria-hidden="true" />
              {busy}
            </p>
          )}
          {notice && !busy && (
            <p className="status status--note" role="status">
              {notice}
            </p>
          )}

          <button className="form__save" type="submit" disabled={!canSave}>
            {saving ? 'Saving…' : 'Save player'}
          </button>
        </form>

        <div className="add__preview">
          <PlayerCard name={name} position={position} photoUrl={photo?.url} />
        </div>
      </div>

      <section className="roster">
        <h2 className="roster__title">Players ({players.length})</h2>
        {ready && players.length === 0 && (
          <p className="roster__empty">No players yet. Fill in the form to add the first one.</p>
        )}
        <ul className="roster__list">
          {players.map((p) => (
            <li className="roster__item" key={p.id}>
              {p.photoUrl ? (
                <img className="roster__thumb" src={p.photoUrl} alt="" />
              ) : (
                <span className="roster__thumb roster__thumb--empty" aria-hidden="true">
                  {p.name.trim().charAt(0).toUpperCase()}
                </span>
              )}
              <div className="roster__info">
                <span className="roster__name">
                  <span className="roster__num">#{p.number}</span> {p.name}
                </span>
                <span className="roster__pos">{positionLabel(p.position)}</span>
              </div>
              <div className="roster__actions">
                <button className="roster__btn roster__show" type="button" onClick={() => setViewing(p)}>
                  Show card
                </button>
                <button
                  className="roster__btn roster__download"
                  type="button"
                  onClick={() => onDownload(p)}
                  disabled={downloadingId === p.id}
                >
                  {downloadingId === p.id ? 'Preparing…' : 'Download'}
                </button>
                <button className="roster__btn roster__remove" type="button" onClick={() => onRemove(p)}>
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {viewing && <PlayerReveal player={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
