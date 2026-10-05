import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { usePlayers } from '../context/PlayersContext.jsx';
import { INTRO_VIDEO } from '../lib/media.js';
import Header from '../components/Header.jsx';
import PlayerGrid from '../components/PlayerGrid.jsx';
import PickButton from '../components/PickButton.jsx';
import IntroVideo from '../components/IntroVideo.jsx';
import PlayerReveal from '../components/PlayerReveal.jsx';

export default function RevealPage() {
  const { players, ready, markRevealed, resetRevealed } = usePlayers();
  const [phase, setPhase] = useState('grid'); // 'grid' | 'video' | 'reveal'
  const [chosen, setChosen] = useState(null);
  const [videoSrc, setVideoSrc] = useState(INTRO_VIDEO);

  // The clip is large and its index sits at the end of the file, so a plain
  // <video src> can take a while to start. Load it in the background now so
  // pressing the button plays it straight away.
  useEffect(() => {
    let url;
    let cancelled = false;
    fetch(INTRO_VIDEO)
      .then((res) => {
        if (!res.ok || !res.headers.get('content-type')?.startsWith('video')) throw new Error('no video');
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setVideoSrc(url);
      })
      .catch(() => {}); // fall back to the plain URL, which reports its own error
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, []);

  const waiting = useMemo(() => players.filter((p) => !p.revealed), [players]);
  // most recently revealed first; players revealed before timestamps existed go last
  const revealed = useMemo(
    () =>
      players
        .filter((p) => p.revealed)
        .sort((a, b) => (b.revealed_at ?? '').localeCompare(a.revealed_at ?? '') || b.id - a.id),
    [players]
  );

  // reveal one chosen player: video first, then the card
  const startReveal = useCallback(
    (player) => {
      if (phase !== 'grid') return;
      setChosen(player);
      setPhase('video');
    },
    [phase]
  );

  const pickRandom = useCallback(() => {
    if (waiting.length === 0) return;
    startReveal(waiting[Math.floor(Math.random() * waiting.length)]);
  }, [waiting, startReveal]);

  const showReveal = useCallback(() => {
    if (chosen) markRevealed(chosen.id);
    setPhase('reveal');
  }, [chosen, markRevealed]);

  // reopen a card that was already revealed: no video, no change to the draw
  const viewCard = useCallback(
    (player) => {
      if (phase !== 'grid') return;
      setChosen(player);
      setPhase('reveal');
    },
    [phase]
  );

  const backToGrid = useCallback(() => {
    setChosen(null);
    setPhase('grid');
  }, []);

  const confirmReset = useCallback(() => {
    if (window.confirm('Reset all reveals? Every player goes back into the draw.')) resetRevealed();
  }, [resetRevealed]);

  useEffect(() => {
    const onKey = (e) => {
      if (phase !== 'grid') return;
      if (e.key === 'f' || e.key === 'F') {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen?.();
      } else if (e.shiftKey && (e.key === 'R' || e.key === 'r')) {
        confirmReset();
      } else if (e.key === 'Enter' && document.activeElement === document.body) {
        pickRandom();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, pickRandom, confirmReset]);

  return (
    <div className="app">
      <Header revealedCount={revealed.length} total={players.length} />
      <PlayerGrid
        waiting={waiting}
        revealed={revealed}
        total={players.length}
        ready={ready}
        onPick={startReveal}
        onView={viewCard}
        onReset={confirmReset}
      />
      <PickButton
        disabled={phase !== 'grid' || waiting.length === 0}
        empty={ready && players.length === 0}
        allDone={players.length > 0 && waiting.length === 0}
        onClick={pickRandom}
      />

      <AnimatePresence>
        {phase === 'video' && <IntroVideo key="video" src={videoSrc} onDone={showReveal} />}
        {phase === 'reveal' && chosen && (
          <PlayerReveal key="reveal" player={chosen} onClose={backToGrid} />
        )}
      </AnimatePresence>
    </div>
  );
}
