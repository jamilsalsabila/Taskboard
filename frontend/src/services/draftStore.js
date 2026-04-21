import { createStore, del, get, keys, set } from 'idb-keyval';

const store = createStore('taskboard-db', 'note-drafts');
const keyOf = (id) => `note:${id}`;

export const saveNoteDraft = async (id, draft) => {
  await set(keyOf(id), draft, store);
};

export const removeNoteDraft = async (id) => {
  await del(keyOf(id), store);
};

export const loadAllDrafts = async () => {
  const allKeys = await keys(store);
  const drafts = {};

  for (const key of allKeys) {
    if (typeof key !== 'string' || !key.startsWith('note:')) continue;
    const id = key.slice(5);
    const value = await get(key, store);
    if (value) drafts[id] = value;
  }

  return drafts;
};
