import { parseProject, type Project, type Saved } from './model';
let database: Promise<IDBDatabase> | undefined;
function db() { return database ??= new Promise((resolve, reject) => { const request = indexedDB.open('minecad-voladuras-v1', 1); request.onupgradeneeded = () => request.result.createObjectStore('data'); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
async function read(key: string) { const database = await db(); return new Promise<unknown>((resolve, reject) => { const r = database.transaction('data', 'readonly').objectStore('data').get(key); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); }); }
async function write(key: string, data: unknown) { const database = await db(); return new Promise<void>((resolve, reject) => { const tx = database.transaction('data', 'readwrite'); tx.objectStore('data').put(data, key); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error ?? Error('Guardado cancelado.')); }); }
export async function loadDraft() { const p = await read('draft'); return p ? parseProject(p) : null; }
export function saveDraft(p: Project) { return write('draft', p); }
export async function loadLibrary(): Promise<Saved[]> { const raw = await read('library'); if (!Array.isArray(raw)) return []; return raw.map(item => ({ id: String(item.id), savedAt: String(item.savedAt), project: parseProject(item.project) })); }
export function saveLibrary(entries: Saved[]) { return write('library', entries); }
