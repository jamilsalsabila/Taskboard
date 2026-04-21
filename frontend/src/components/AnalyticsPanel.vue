<script setup>
defineProps({
  analytics: { type: Array, required: true }
});
</script>

<template>
  <section class="analytics">
    <h2>Analisis Kinerja Tim</h2>
    <table>
      <thead>
        <tr>
          <th>Assignee</th>
          <th>Total</th>
          <th>To Do</th>
          <th>In Progress</th>
          <th>Done</th>
          <th>Avg Selesai (jam)</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in analytics" :key="item.assignee">
          <td>{{ item.assignee }}</td>
          <td>{{ item.totalTasks }}</td>
          <td>{{ item.todoTasks }}</td>
          <td>{{ item.inProgressTasks }}</td>
          <td>{{ item.doneTasks }}</td>
          <td>{{ item.avgCompletionHours }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
