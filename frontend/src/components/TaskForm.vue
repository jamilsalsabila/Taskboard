<script setup>
import { reactive } from 'vue';

const emit = defineEmits(['submit']);

const form = reactive({
  title: '',
  description: '',
  assignee: 'Unassigned',
  priority: 'medium',
  status: 'todo',
  dueDate: ''
});

const onSubmit = () => {
  if (!form.title.trim()) return;

  emit('submit', {
    title: form.title,
    description: form.description,
    assignee: form.assignee,
    priority: form.priority,
    status: form.status,
    dueDate: form.dueDate || null
  });

  form.title = '';
  form.description = '';
  form.assignee = 'Unassigned';
  form.priority = 'medium';
  form.status = 'todo';
  form.dueDate = '';
};
</script>

<template>
  <form class="task-form" @submit.prevent="onSubmit">
    <input v-model="form.title" type="text" placeholder="Judul task" required />
    <textarea v-model="form.description" rows="3" placeholder="Deskripsi"></textarea>
    <div class="row">
      <input v-model="form.assignee" type="text" placeholder="Assignee" />
      <select v-model="form.priority">
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>
      <select v-model="form.status">
        <option value="todo">To Do</option>
        <option value="in_progress">In Progress</option>
        <option value="done">Done</option>
      </select>
      <input v-model="form.dueDate" type="date" />
    </div>
    <button type="submit">Tambah Task</button>
  </form>
</template>
