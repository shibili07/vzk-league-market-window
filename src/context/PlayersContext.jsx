import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as db from '../db/database.js';
import { frameForCard } from '../lib/photo.js';

const PlayersContext = createContext(null);

export function PlayersProvider({ children }) {
  const [players, setPlayers] = useState([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const photoUrls = useRef(new Map()); // player id -> blob: URL
  const chain = useRef(Promise.resolve());

  // Serialised so overlapping refreshes never create the same blob URL twice.
  const refresh = useCallback(() => {
    chain.current = chain.current.then(async () => {
      const rows = await db.listPlayers();
      const cache = photoUrls.current;
      const keep = new Set(rows.map((r) => r.id));

      for (const [id, url] of cache) {
        if (!keep.has(id)) {
          URL.revokeObjectURL(url);
          cache.delete(id);
        }
      }
      for (const row of rows) {
        if (cache.has(row.id)) continue;
        const photo = await db.getPhoto(row.id);
        if (!photo?.bytes?.length) continue; // player added without a photo
        const blob = new Blob([photo.bytes], { type: photo.type });
        // the card shows the upper body, large; the saved original stays untouched
        const framed = await frameForCard(blob).catch(() => blob);
        cache.set(row.id, URL.createObjectURL(framed));
      }

      setPlayers(rows.map((r) => ({ ...r, revealed: !!r.revealed, photoUrl: cache.get(r.id) })));
    });
    return chain.current;
  }, []);

  useEffect(() => {
    refresh()
      .then(() => setReady(true))
      .catch((err) => {
        console.error(err);
        setError(err);
        setReady(true);
      });
  }, [refresh]);

  const value = useMemo(
    () => ({
      players,
      ready,
      error,
      addPlayer: async (player) => {
        await db.addPlayer(player);
        await refresh();
      },
      removePlayer: async (id) => {
        await db.removePlayer(id);
        await refresh();
      },
      markRevealed: async (id) => {
        await db.setRevealed(id, true);
        await refresh();
      },
      resetRevealed: async () => {
        await db.resetRevealed();
        await refresh();
      },
    }),
    [players, ready, error, refresh]
  );

  return <PlayersContext.Provider value={value}>{children}</PlayersContext.Provider>;
}

export function usePlayers() {
  const ctx = useContext(PlayersContext);
  if (!ctx) throw new Error('usePlayers must be used inside PlayersProvider');
  return ctx;
}
