import initSqlJs from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

// SQLite runs in the browser (sql.js / WebAssembly). The whole database file is
// saved to IndexedDB after every write, so no server is needed.

const IDB_NAME = 'vzk-league';
const IDB_STORE = 'sqlite';
const IDB_KEY = 'players-db';

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS players (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    position   TEXT    NOT NULL,
    photo      BLOB    NOT NULL,
    photo_type TEXT    NOT NULL,
    revealed   INTEGER NOT NULL DEFAULT 0,
    created_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`;

function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet() {
  const idb = await idbOpen();
  return new Promise((resolve, reject) => {
    const req = idb.transaction(IDB_STORE).objectStore(IDB_STORE).get(IDB_KEY);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(bytes) {
  const idb = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(bytes, IDB_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

let dbPromise;

export function getDb() {
  dbPromise ??= (async () => {
    const SQL = await initSqlJs({ locateFile: () => wasmUrl });
    let saved = null;
    try {
      saved = await idbGet();
    } catch (err) {
      console.warn('Could not read saved players:', err);
    }
    const db = saved ? new SQL.Database(saved) : new SQL.Database();
    db.run(SCHEMA);
    // databases saved by an earlier version have no revealed_at column
    const columns = all(db, 'PRAGMA table_info(players)').map((c) => c.name);
    if (!columns.includes('revealed_at')) db.run('ALTER TABLE players ADD COLUMN revealed_at TEXT');
    // the number shown on a card while the player is still in the draw
    if (!columns.includes('number')) db.run('ALTER TABLE players ADD COLUMN number INTEGER');
    db.run('UPDATE players SET number = id WHERE number IS NULL'); // players added before numbers existed
    return db;
  })();
  return dbPromise;
}

// Writes are chained so two quick saves never overlap.
let writeQueue = Promise.resolve();
let saveFailed = false;

function persist(db) {
  writeQueue = writeQueue
    .then(() => idbPut(db.export()))
    .then(() => {
      saveFailed = false;
    })
    .catch((err) => {
      saveFailed = true;
      console.warn('Could not save players to this browser:', err);
    });
  return writeQueue;
}

export const didSaveFail = () => saveFailed;

function all(db, sql, params = []) {
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    return rows;
  } finally {
    stmt.free();
  }
}

export async function listPlayers() {
  const db = await getDb();
  return all(db, 'SELECT id, name, position, number, revealed, revealed_at FROM players ORDER BY id');
}

export async function getPhoto(id) {
  const db = await getDb();
  const [row] = all(db, 'SELECT photo, photo_type FROM players WHERE id = ?', [id]);
  return row ? { bytes: row.photo, type: row.photo_type } : null;
}

export async function addPlayer({ name, position, number, photo, photoType }) {
  const db = await getDb();
  if (photo?.length) {
    db.run(
      'INSERT INTO players (name, position, number, photo, photo_type) VALUES (?, ?, ?, ?, ?)',
      [name, position, number, photo, photoType]
    );
  } else {
    // No photo is allowed. Store an empty blob rather than NULL so databases
    // saved by earlier versions (photo columns NOT NULL) still accept the row.
    db.run(
      "INSERT INTO players (name, position, number, photo, photo_type) VALUES (?, ?, ?, zeroblob(0), '')",
      [name, position, number]
    );
  }
  await persist(db);
}

export async function removePlayer(id) {
  const db = await getDb();
  db.run('DELETE FROM players WHERE id = ?', [id]);
  await persist(db);
}

export async function setRevealed(id, revealed) {
  const db = await getDb();
  db.run(
    `UPDATE players
        SET revealed = ?,
            revealed_at = CASE WHEN ? = 1 THEN strftime('%Y-%m-%d %H:%M:%f', 'now') END
      WHERE id = ?`,
    [revealed ? 1 : 0, revealed ? 1 : 0, id]
  );
  await persist(db);
}

export async function resetRevealed() {
  const db = await getDb();
  db.run('UPDATE players SET revealed = 0, revealed_at = NULL');
  await persist(db);
}
