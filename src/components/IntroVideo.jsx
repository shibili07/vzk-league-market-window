import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

export default function IntroVideo({ src, onDone }) {
  const ref = useRef(null);
  const [needsTap, setNeedsTap] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    ref.current?.play().catch((err) => {
      // an aborted play (src swapped, unmounted) is not a block by the browser
      if (err.name === 'NotAllowedError') setNeedsTap(true);
    });
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onDone();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDone]);

  const tapToPlay = () => {
    ref.current?.play().then(() => setNeedsTap(false)).catch(() => setFailed(true));
  };

  return (
    <motion.div
      className="stage stage--video"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <video
        ref={ref}
        className="stage__video stage__video--turned"
        src={src}
        playsInline
        preload="auto"
        onEnded={onDone}
        onError={() => {
          console.error('Intro video failed to load:', ref.current?.error);
          setFailed(true);
        }}
      />
      {needsTap && !failed && (
        <button className="stage__tap" onClick={tapToPlay}>
          Tap to play
        </button>
      )}
      {failed && (
        <div className="stage__fail" role="alert">
          <p>The intro video could not be played in this browser.</p>
          <button className="stage__tap stage__tap--inline" onClick={onDone}>
            Show player
          </button>
        </div>
      )}
      {!failed && (
        <button className="stage__skip" onClick={onDone}>
          Skip
        </button>
      )}
    </motion.div>
  );
}
