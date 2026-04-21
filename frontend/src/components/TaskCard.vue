<script setup>
const props = defineProps({
  task: { type: Object, required: true }
});

const emit = defineEmits(['open', 'delete']);
</script>

<template>
  <article
    class="task-card"
    draggable="true"
    @dragstart="$event.dataTransfer.setData('taskId', props.task.id)"
    @click="emit('open', props.task)"
  >
    <div class="task-main-row">
      <span class="task-bullet" aria-hidden="true"></span>
      <h4>{{ props.task.title }}</h4>
      <button class="task-menu" type="button" @click.stop="emit('delete', props.task.id)">...</button>
    </div>
    <p v-if="props.task.description" class="task-detail">{{ props.task.description }}</p>
    <div class="task-icons" v-if="props.task.dueDate || props.task.assignee !== 'Unassigned'">
      <span v-if="props.task.dueDate">Due {{ new Date(props.task.dueDate).toLocaleDateString() }}</span>
      <span v-if="props.task.assignee !== 'Unassigned'">By {{ props.task.assignee }}</span>
    </div>
  </article>
</template>
