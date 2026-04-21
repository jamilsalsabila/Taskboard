<script setup>
import interact from 'interactjs';
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { api } from './services/api';

const notes = ref([]);
const topLayer = ref(1);
const editingTitleId = ref(null);
const titleHoldState = ref(null);
const interactables = new Map();
const saveTimers = new Map();

const COLORS = ['#fff59d', '#ffccbc', '#c8e6c9', '#bbdefb', '#d1c4e9', '#ffe082', '#b2dfdb'];

const randomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];
const findNote = (id) => notes.value.find((note) => note.id === id);

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

const clampPosition = (note) => {
  const maxX = Math.max(0, window.innerWidth - note.width);
  const maxY = Math.max(0, window.innerHeight - note.height);
  note.x = Math.max(0, Math.min(maxX, note.x));
  note.y = Math.max(0, Math.min(maxY, note.y));
};

const scheduleSave = (id, delay = 280) => {
  if (saveTimers.has(id)) {
    clearTimeout(saveTimers.get(id));
  }

  const timer = setTimeout(async () => {
    saveTimers.delete(id);
    const note = findNote(id);
    if (!note) return;

    try {
      const saved = await api.updateStickyNote(id, toPayload(note));
      Object.assign(note, saved);
    } catch (error) {
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
          bringToFront(id, false);
        },
        move(event) {
          const note = findNote(id);
          if (!note) return;
          note.x += event.dx;
          note.y += event.dy;
          clampPosition(note);
          scheduleSave(id);
        }
      }
    })
    .resizable({
      edges: { right: '.resize-handle', bottom: '.resize-handle' },
      listeners: {
        start() {
          bringToFront(id, false);
        },
        move(event) {
          const note = findNote(id);
          if (!note) return;

          note.width = Math.max(140, event.rect.width);
          note.height = Math.max(120, event.rect.height);
          note.x += event.deltaRect.left;
          note.y += event.deltaRect.top;
          clampPosition(note);
          scheduleSave(id);
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
  const maxX = Math.max(8, window.innerWidth - width - 8);
  const maxY = Math.max(56, window.innerHeight - height - 8);
  const x = Math.floor(Math.random() * maxX);
  const y = Math.floor(Math.random() * Math.max(1, maxY - 48)) + 48;

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

    notes.value.push(created);
    topLayer.value = Math.max(topLayer.value, created.zIndex);

    await nextTick();
    setupInteract(created.id);
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
  scheduleSave(id);
};

onMounted(async () => {
  try {
    const data = await api.listStickyNotes();
    notes.value = data;

    const maxZ = data.reduce((max, note) => Math.max(max, note.zIndex || 1), 1);
    topLayer.value = maxZ;

    await nextTick();
    data.forEach((note) => setupInteract(note.id));
  } catch (error) {
    console.error('Failed to load sticky notes:', error);
  }
});

onBeforeUnmount(() => {
  cancelTitleHold();
  interactables.forEach((instance) => instance.unset());
  interactables.clear();

  saveTimers.forEach((timer) => clearTimeout(timer));
  saveTimers.clear();
});
</script>

<template>
  <main class="blank-page">
    <button class="plus-btn" type="button" aria-label="Tambah" @click="createNote">+</button>

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
  </main>
</template>
