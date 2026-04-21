<script setup>
import { reactive, ref } from 'vue';
import TaskCard from './TaskCard.vue';

defineProps({
  title: { type: String, required: true },
  status: { type: String, required: true },
  tasks: { type: Array, required: true }
});

const emit = defineEmits(['move', 'open', 'delete', 'add-task']);

const showForm = ref(false);
const localTask = reactive({ title: '', description: '', assignee: 'Unassigned' });

const onDrop = (event, status) => {
  const taskId = event.dataTransfer.getData('taskId');
  if (taskId) emit('move', { taskId, status });
};

const submitTask = () => {
  if (!localTask.title.trim()) return;

  emit('add-task', {
    title: localTask.title.trim(),
    description: localTask.description.trim(),
    assignee: localTask.assignee.trim() || 'Unassigned'
  });

  localTask.title = '';
  localTask.description = '';
  localTask.assignee = 'Unassigned';
  showForm.value = false;
};
</script>

<template>
  <section class="column" @dragover.prevent @drop="onDrop($event, status)">
    <header class="column-header">
      <h3>{{ title }}</h3>
      <button class="column-menu" type="button">...</button>
    </header>

    <button class="add-task-btn" type="button" @click="showForm = !showForm">
      <span>+</span>
      <span>Tambah tugas</span>
    </button>

    <form v-if="showForm" class="inline-task-form" @submit.prevent="submitTask">
      <input v-model="localTask.title" type="text" placeholder="Judul" required />
      <input v-model="localTask.assignee" type="text" placeholder="Assignee" />
      <textarea v-model="localTask.description" rows="2" placeholder="Detail"></textarea>
      <div class="inline-task-form-actions">
        <button type="submit">Simpan</button>
      </div>
    </form>

    <div class="task-list">
      <TaskCard
        v-for="task in tasks"
        :key="task.id"
        :task="task"
        @open="emit('open', $event)"
        @delete="emit('delete', $event)"
      />
    </div>
  </section>
</template>
