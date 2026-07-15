const DB_NAME = "edoslmis-offline";
const STORE_NAME = "queue";
const DB_VERSION = 1;

export type QueuedActionType = "collectSpecimens" | "enterResults";

export type QueuedAction = {
  id: string;
  type: QueuedActionType;
  label: string;
  payload: Record<string, string[]>;
  createdAt: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function addQueuedAction(action: Omit<QueuedAction, "id" | "createdAt">): Promise<QueuedAction> {
  const db = await openDb();
  const full: QueuedAction = { ...action, id: crypto.randomUUID(), createdAt: Date.now() };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(full);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return full;
}

export async function getQueuedActions(): Promise<QueuedAction[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve((req.result as QueuedAction[]).sort((a, b) => a.createdAt - b.createdAt));
    req.onerror = () => reject(req.error);
  });
}

export async function removeQueuedAction(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function formDataToPayload(formData: FormData): Record<string, string[]> {
  const payload: Record<string, string[]> = {};
  for (const [key, value] of formData.entries()) {
    const str = String(value);
    if (!payload[key]) payload[key] = [];
    payload[key].push(str);
  }
  return payload;
}

export function payloadToFormData(payload: Record<string, string[]>): FormData {
  const formData = new FormData();
  for (const [key, values] of Object.entries(payload)) {
    for (const value of values) formData.append(key, value);
  }
  return formData;
}
