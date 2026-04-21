<script setup>
import interact from 'interactjs';
import PQueue from 'p-queue';
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { api, setAuthToken } from './services/api';
import { loadAllDrafts, removeNoteDraft, saveNoteDraft } from './services/draftStore';

const notes = ref([]);
const topLayer = ref(1);
const editingTitleId = ref(null);
const titleHoldState = ref(null);
const interactables = new Map();
const saveTimers = new Map();
const lastSavedHashes = new Map();
const dirtyFields = new Map();
const saveRequestSeq = new Map();
const draftTimers = new Map();
const saveQueues = new Map();
const noteSyncState = ref({});
const socketRef = ref(null);
const socketStatus = ref('offline');
const onlineUsers = ref([]);
const collabName = ref(localStorage.getItem('taskboard-user') || '');
const authTokenRef = ref(localStorage.getItem('taskboard-token') || '');
const viewportRef = ref(null);
const canvasWidth = ref(2400);
const canvasHeight = ref(1600);

const CANVAS_PADDING = 600;
const CANVAS_MIN_WIDTH = 2400;
const CANVAS_MIN_HEIGHT = 1600;

const COLORS = ['#fff59d', '#ffccbc', '#c8e6c9', '#bbdefb', '#d1c4e9', '#ffe082', '#b2dfdb'];

const randomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];
const findNote = (id) => notes.value.find((note) => note.id === id);
const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
const wsUrl = `${wsProtocol}://${window.location.hostname}:3001/ws`;

const toPayload = (note) => ({
  title: note.title,
  content: note.content,
  color: note.color,
  x: Math.round(note.x),
  y: Math.round(note.y),
  width: Math.round(note.width),
  height: Math.round(note.height),
  zIndex: note.zIndex
});

const payloadHash = (payload) => JSON.stringify(payload);

const currentHash = (id) => {
  const note = findNote(id);
  if (!note) return null;
  return payloadHash(toPayload(note));
};

const markAsSaved = (id) => {
  const hash = currentHash(id);
  if (!hash) return;
  lastSavedHashes.set(id, hash);
};

const markDirty = (id, field) => {
  const fields = dirtyFields.get(id) || new Set();
  fields.add(field);
  dirtyFields.set(id, fields);
};

const clearDirty = (id) => {
  dirtyFields.delete(id);
};

const setSyncState = (id, state) => {
  noteSyncState.value = { ...noteSyncState.value, [id]: state };
};

const getSyncState = (id) => noteSyncState.value[id] || 'saved';

const getSyncLabel = (id) => {
  const state = getSyncState(id);
  if (state === 'saving') return 'Saving...';
  if (state === 'queued') return 'Queued';
  if (state === 'offline') return 'Offline draft';
  if (state === 'draft') return 'Draft';
  return 'Saved';
};

const getSaveQueue = (id) => {
  if (saveQueues.has(id)) return saveQueues.get(id);

  const queue = new PQueue({ concurrency: 1 });
  saveQueues.set(id, queue);
  return queue;
};

const clearSaveQueue = (id) => {
  const queue = saveQueues.get(id);
  if (!queue) return;
  queue.clear();
  saveQueues.delete(id);
};

const saveDraft = (id) => {
  const note = findNote(id);
  if (!note) return;
  const payload = {
    title: note.title,
    content: note.content,
    x: note.x,
    y: note.y,
    width: note.width,
    height: note.height,
    zIndex: note.zIndex,
    updatedAt: Date.now()
  };
  void saveNoteDraft(id, payload);
  setSyncState(id, 'draft');
};

const scheduleDraftSave = (id, delay = 450) => {
  if (draftTimers.has(id)) {
    clearTimeout(draftTimers.get(id));
  }

  const timer = setTimeout(() => {
    draftTimers.delete(id);
    saveDraft(id);
  }, delay);

  draftTimers.set(id, timer);
};

const clearDraft = (id) => {
  if (draftTimers.has(id)) {
    clearTimeout(draftTimers.get(id));
    draftTimers.delete(id);
  }
  void removeNoteDraft(id);
};

const applyDraftsToNotes = async () => {
  const store = await loadAllDrafts();
  for (const note of notes.value) {
    const draft = store[note.id];
    if (!draft) continue;
    note.title = draft.title ?? note.title;
    note.content = draft.content ?? note.content;
    note.x = draft.x ?? note.x;
    note.y = draft.y ?? note.y;
    note.width = draft.width ?? note.width;
    note.height = draft.height ?? note.height;
    note.zIndex = draft.zIndex ?? note.zIndex;
  }
};

const persistAllDirtyNotes = () => {
  for (const noteId of dirtyFields.keys()) {
    saveDraft(noteId);
  }
};

const onBeforeUnload = () => {
  persistAllDirtyNotes();
};

const ensureCanvasBounds = (note) => {
  if (!note) return;

  const viewport = viewportRef.value;
  const minWidth = Math.max(CANVAS_MIN_WIDTH, (viewport?.clientWidth || 0) + CANVAS_PADDING);
  const minHeight = Math.max(CANVAS_MIN_HEIGHT, (viewport?.clientHeight || 0) + CANVAS_PADDING);

  const requiredWidth = Math.max(minWidth, note.x + note.width + CANVAS_PADDING);
  const requiredHeight = Math.max(minHeight, note.y + note.height + CANVAS_PADDING);

  canvasWidth.value = Math.max(canvasWidth.value, requiredWidth);
  canvasHeight.value = Math.max(canvasHeight.value, requiredHeight);
};

const ensureCanvasFromAllNotes = () => {
  const viewport = viewportRef.value;
  const minWidth = Math.max(CANVAS_MIN_WIDTH, (viewport?.clientWidth || 0) + CANVAS_PADDING);
  const minHeight = Math.max(CANVAS_MIN_HEIGHT, (viewport?.clientHeight || 0) + CANVAS_PADDING);

  canvasWidth.value = minWidth;
  canvasHeight.value = minHeight;

  for (const note of notes.value) {
    ensureCanvasBounds(note);
  }
};

const upsertIncomingNote = async (incomingNote) => {
  const existing = findNote(incomingNote.id);
  if (existing) {
    const dirty = dirtyFields.get(existing.id) || new Set();
    const keepTitle = dirty.has('title') || editingTitleId.value === existing.id;
    const keepContent = dirty.has('content');
    const keepLayout = dirty.has('layout');

    const next = { ...incomingNote };
    if (keepTitle) {
      next.title = existing.title;
    }
    if (keepContent) {
      next.content = existing.content;
    }
    if (keepLayout) {
      next.x = existing.x;
      next.y = existing.y;
      next.width = existing.width;
      next.height = existing.height;
      next.zIndex = existing.zIndex;
    }

    Object.assign(existing, next);
    ensureCanvasBounds(existing);
    if (!keepTitle && !keepContent && !keepLayout) {
      markAsSaved(existing.id);
      setSyncState(existing.id, 'saved');
    }
    return;
  }

  notes.value.push(incomingNote);
  topLayer.value = Math.max(topLayer.value, incomingNote.zIndex || 1);
  lastSavedHashes.set(incomingNote.id, payloadHash(toPayload(incomingNote)));
  ensureCanvasBounds(incomingNote);
  setSyncState(incomingNote.id, 'saved');
  await nextTick();
  setupInteract(incomingNote.id);
};

const removeIncomingNote = (id) => {
  notes.value = notes.value.filter((note) => note.id !== id);
  clearSaveTimer(id);
  saveRequestSeq.delete(id);
  clearSaveQueue(id);
  destroyInteract(id);
  lastSavedHashes.delete(id);
  clearDirty(id);
  clearDraft(id);
  const nextState = { ...noteSyncState.value };
  delete nextState[id];
  noteSyncState.value = nextState;
  if (editingTitleId.value === id) {
    editingTitleId.value = null;
  }
};

const normalizeUsers = (users) => {
  if (!Array.isArray(users)) return [];
  return users.filter((item) => typeof item === 'string' && item.length > 0);
};

const connectRealtime = () => {
  if (!authTokenRef.value) return;

  if (socketRef.value) {
    socketRef.value.close();
    socketRef.value = null;
  }

  const url = `${wsUrl}?token=${encodeURIComponent(authTokenRef.value)}`;
  const socket = new WebSocket(url);
  socketRef.value = socket;
  socketStatus.value = 'connecting';

  socket.addEventListener('open', () => {
    socketStatus.value = 'online';
  });

  socket.addEventListener('close', () => {
    socketStatus.value = 'offline';
  });

  socket.addEventListener('error', () => {
    socketStatus.value = 'offline';
  });

  socket.addEventListener('message', async (event) => {
    let message;
    try {
      message = JSON.parse(event.data);
    } catch {
      return;
    }

    if (message.type === 'sticky_note.created' && message.payload?.note) {
      await upsertIncomingNote(message.payload.note);
      return;
    }

    if (message.type === 'sticky_note.updated' && message.payload?.note) {
      await upsertIncomingNote(message.payload.note);
      return;
    }

    if (message.type === 'sticky_note.deleted' && message.payload?.noteId) {
      removeIncomingNote(message.payload.noteId);
      return;
    }

    if (
      message.type === 'presence.snapshot' ||
      message.type === 'presence.updated' ||
      message.type === 'presence.joined' ||
      message.type === 'presence.left'
    ) {
      onlineUsers.value = normalizeUsers(message.payload?.users);
    }
  });
};

const ensureAuth = async (preferredName = '') => {
  const fallbackName = preferredName || collabName.value || `User-${Math.floor(Math.random() * 900 + 100)}`;

  const result = await api.authGuest(fallbackName);
  const token = result.token;
  const userName = result.user?.name || fallbackName;

  authTokenRef.value = token;
  collabName.value = userName;
  localStorage.setItem('taskboard-token', token);
  localStorage.setItem('taskboard-user', userName);
  setAuthToken(token);
};

const setName = async () => {
  const entered = window.prompt('Nama kolaborasi kamu:', collabName.value || 'Anonymous');
  if (!entered) return;

  try {
    await ensureAuth(entered.slice(0, 60));
    connectRealtime();
  } catch (error) {
    console.error('Failed to set collaboration name:', error);
  }
};

const clampPosition = (note) => {
  note.x = Math.max(0, note.x);
  note.y = Math.max(0, note.y);
  ensureCanvasBounds(note);
};

const scheduleSave = (id, delay = 280) => {
  if (saveTimers.has(id)) {
    clearTimeout(saveTimers.get(id));
  }

  const timer = setTimeout(async () => {
    saveTimers.delete(id);
    const note = findNote(id);
    if (!note) return;
    const payload = toPayload(note);
    const pendingHash = payloadHash(payload);
    const previousHash = lastSavedHashes.get(id);
    if (pendingHash === previousHash) return;
    setSyncState(id, 'queued');

    const seq = (saveRequestSeq.get(id) || 0) + 1;
    saveRequestSeq.set(id, seq);

    try {
      const queue = getSaveQueue(id);
      const saved = await queue.add(async () => {
        setSyncState(id, 'saving');
        return api.updateStickyNote(id, payload);
      });
      if (saveRequestSeq.get(id) !== seq) return;

      const current = findNote(id);
      if (!current) return;

      const currentHashAfterResponse = payloadHash(toPayload(current));
      if (currentHashAfterResponse !== pendingHash) {
        lastSavedHashes.set(id, pendingHash);
        setSyncState(id, 'draft');
        return;
      }

      Object.assign(current, saved);
      clearDirty(id);
      clearDraft(id);
      markAsSaved(id);
      setSyncState(id, 'saved');
    } catch (error) {
      saveDraft(id);
      setSyncState(id, 'offline');
      console.error('Failed to autosave sticky note:', error);
    }
  }, delay);

  saveTimers.set(id, timer);
};

const clearSaveTimer = (id) => {
  if (!saveTimers.has(id)) return;
  clearTimeout(saveTimers.get(id));
  saveTimers.delete(id);
};

const bringToFront = (id, autosave = true) => {
  const note = findNote(id);
  if (!note) return;
  topLayer.value += 1;
  note.zIndex = topLayer.value;
  if (autosave) {
    markDirty(id, 'layout');
    scheduleDraftSave(id, 180);
    scheduleSave(id, 120);
  }
};

const setupInteract = (id) => {
  if (interactables.has(id)) return;
  const el = document.querySelector(`[data-note-id="${id}"]`);
  if (!el) return;

  const instance = interact(el)
    .draggable({
      allowFrom: '.note-header',
      ignoreFrom: '.note-title,.delete-note-btn,.note-body,.resize-handle',
      listeners: {
        start() {
          markDirty(id, 'layout');
          bringToFront(id, false);
        },
        move(event) {
          const note = findNote(id);
          if (!note) return;
          markDirty(id, 'layout');
          note.x += event.dx;
          note.y += event.dy;
          clampPosition(note);
        },
        end() {
          scheduleDraftSave(id, 120);
          scheduleSave(id, 40);
        }
      }
    })
    .resizable({
      edges: { right: '.resize-handle', bottom: '.resize-handle' },
      listeners: {
        start() {
          markDirty(id, 'layout');
          bringToFront(id, false);
        },
        move(event) {
          const note = findNote(id);
          if (!note) return;
          markDirty(id, 'layout');

          note.width = Math.max(140, event.rect.width);
          note.height = Math.max(120, event.rect.height);
          note.x += event.deltaRect.left;
          note.y += event.deltaRect.top;
          clampPosition(note);
        },
        end() {
          scheduleDraftSave(id, 120);
          scheduleSave(id, 40);
        }
      }
    });

  interactables.set(id, instance);
};

const destroyInteract = (id) => {
  const instance = interactables.get(id);
  if (!instance) return;
  instance.unset();
  interactables.delete(id);
};

const createNote = async () => {
  const width = 220;
  const height = 180;
  const viewport = viewportRef.value;
  const scrollLeft = viewport?.scrollLeft || 0;
  const scrollTop = viewport?.scrollTop || 0;
  const vw = viewport?.clientWidth || window.innerWidth;
  const vh = viewport?.clientHeight || window.innerHeight;

  const baseX = scrollLeft + Math.max(20, vw / 2 - width / 2);
  const baseY = scrollTop + Math.max(70, vh / 2 - height / 2);
  const offsetX = Math.floor(Math.random() * 160) - 80;
  const offsetY = Math.floor(Math.random() * 120) - 60;
  const x = Math.max(0, Math.round(baseX + offsetX));
  const y = Math.max(0, Math.round(baseY + offsetY));

  topLayer.value += 1;

  try {
    const created = await api.createStickyNote({
      title: 'Sticky',
      content: '',
      color: randomColor(),
      x,
      y,
      width,
      height,
      zIndex: topLayer.value
    });

    await upsertIncomingNote(created);
  } catch (error) {
    console.error('Failed to create sticky note:', error);
  }
};

const removeNote = async (id) => {
  const existing = findNote(id);
  if (!existing) return;

  notes.value = notes.value.filter((note) => note.id !== id);
  if (editingTitleId.value === id) editingTitleId.value = null;
  clearSaveTimer(id);
  saveRequestSeq.delete(id);
  clearSaveQueue(id);
  lastSavedHashes.delete(id);
  clearDirty(id);
  clearDraft(id);
  const nextState = { ...noteSyncState.value };
  delete nextState[id];
  noteSyncState.value = nextState;
  destroyInteract(id);

  try {
    await api.deleteStickyNote(id);
  } catch (error) {
    console.error('Failed to delete sticky note:', error);
  }
};

const startTitleEdit = async (id) => {
  editingTitleId.value = id;
  await nextTick();
  const input = document.getElementById(`note-title-${id}`);
  if (input) {
    input.focus();
    input.select();
  }
};

const stopTitleEdit = () => {
  const noteId = editingTitleId.value;
  editingTitleId.value = null;
  if (noteId) {
    markDirty(noteId, 'title');
    scheduleDraftSave(noteId, 120);
    scheduleSave(noteId, 50);
  }
};

const cancelTitleHold = () => {
  if (titleHoldState.value?.timer) clearTimeout(titleHoldState.value.timer);
  titleHoldState.value = null;
};

const startTitleHold = (event, id) => {
  event.preventDefault();
  cancelTitleHold();

  const timer = setTimeout(() => {
    startTitleEdit(id);
    titleHoldState.value = null;
  }, 500);

  titleHoldState.value = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    timer
  };
};

const onTitlePointerMove = (event) => {
  if (!titleHoldState.value || titleHoldState.value.pointerId !== event.pointerId) return;

  const dx = Math.abs(event.clientX - titleHoldState.value.startX);
  const dy = Math.abs(event.clientY - titleHoldState.value.startY);
  if (dx > 8 || dy > 8) cancelTitleHold();
};

const onContentInput = (id) => {
  markDirty(id, 'content');
  scheduleDraftSave(id, 500);
  scheduleSave(id, 320);
};

onMounted(async () => {
  window.addEventListener('beforeunload', onBeforeUnload);
  try {
    if (authTokenRef.value) {
      setAuthToken(authTokenRef.value);
      try {
        await api.listStickyNotes();
      } catch {
        await ensureAuth(collabName.value);
      }
    } else {
      await ensureAuth(collabName.value);
    }

    const data = await api.listStickyNotes();
    notes.value = data;
    await applyDraftsToNotes();
    data.forEach((note) => lastSavedHashes.set(note.id, payloadHash(toPayload(note))));

    const maxZ = data.reduce((max, note) => Math.max(max, note.zIndex || 1), 1);
    topLayer.value = maxZ;
    ensureCanvasFromAllNotes();

    await nextTick();
    data.forEach((note) => setupInteract(note.id));
    connectRealtime();
  } catch (error) {
    console.error('Failed to initialize app:', error);
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', onBeforeUnload);
  if (socketRef.value) {
    socketRef.value.close();
  }

  cancelTitleHold();
  interactables.forEach((instance) => instance.unset());
  interactables.clear();

  saveTimers.forEach((timer) => clearTimeout(timer));
  saveTimers.clear();
  saveRequestSeq.clear();
  draftTimers.forEach((timer) => clearTimeout(timer));
  draftTimers.clear();
  saveQueues.forEach((queue) => queue.clear());
  saveQueues.clear();
  persistAllDirtyNotes();
  lastSavedHashes.clear();
  dirtyFields.clear();
});
</script>

<template>
  <main ref="viewportRef" class="blank-page">
    <section class="collab-bar">
      <button class="identity-btn" type="button" @click="setName">
        {{ collabName }}
      </button>
      <span class="presence-pill">{{ socketStatus }} | {{ onlineUsers.length }} online</span>
    </section>

    <button class="plus-btn" type="button" aria-label="Tambah" @click="createNote">+</button>

    <section
      class="infinite-canvas"
      :style="{ width: `${canvasWidth}px`, height: `${canvasHeight}px` }"
    >
      <article
        v-for="note in notes"
        :key="note.id"
        :data-note-id="note.id"
        class="sticky-note"
        :style="{
          left: `${note.x}px`,
          top: `${note.y}px`,
          width: `${note.width}px`,
          height: `${note.height}px`,
          backgroundColor: note.color,
          zIndex: note.zIndex
        }"
        @pointerdown="bringToFront(note.id)"
      >
        <header class="note-header">
          <span
            v-if="editingTitleId !== note.id"
            class="note-title-text"
            @pointerdown="startTitleHold($event, note.id)"
            @pointerup="cancelTitleHold"
            @pointercancel="cancelTitleHold"
            @pointermove="onTitlePointerMove"
            @dblclick.stop="startTitleEdit(note.id)"
          >
            {{ note.title }}
          </span>
          <input
            v-else
            :id="`note-title-${note.id}`"
            v-model="note.title"
            class="note-title"
            type="text"
            @pointerdown.stop
            @keydown.enter.prevent="stopTitleEdit"
            @blur="stopTitleEdit"
          />
          <button
            class="sync-pill"
            :class="`sync-${getSyncState(note.id)}`"
            type="button"
            tabindex="-1"
            disabled
          >
            {{ getSyncLabel(note.id) }}
          </button>
          <button
            class="delete-note-btn"
            type="button"
            aria-label="Hapus note"
            @pointerdown.stop
            @click="removeNote(note.id)"
          >
            x
          </button>
        </header>

        <textarea
          v-model="note.content"
          class="note-body"
          placeholder="Tulis bebas di sini..."
          @input="onContentInput(note.id)"
        ></textarea>
        <button class="resize-handle" type="button" aria-label="Resize"></button>
      </article>
    </section>
  </main>
</template>
