import { computed, ref } from 'vue';
import { api } from '../services/api';

const columns = ['todo', 'in_progress', 'done'];

export const useTaskboard = () => {
  const tasks = ref([]);
  const analytics = ref([]);
  const activeTask = ref(null);
  const comments = ref([]);
  const loading = ref(false);
  const error = ref('');

  const groupedTasks = computed(() => {
    return columns.reduce((acc, status) => {
      acc[status] = tasks.value.filter((task) => task.status === status);
      return acc;
    }, {});
  });

  const refresh = async () => {
    loading.value = true;
    error.value = '';
    try {
      const [taskData, analyticsData] = await Promise.all([api.listTasks(), api.analytics()]);
      tasks.value = taskData;
      analytics.value = analyticsData;
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  };

  const createTask = async (payload) => {
    await api.createTask(payload);
    await refresh();
  };

  const moveTask = async (taskId, status) => {
    await api.moveTask(taskId, status);
    await refresh();
  };

  const deleteTask = async (taskId) => {
    await api.deleteTask(taskId);
    if (activeTask.value?.id === taskId) {
      activeTask.value = null;
      comments.value = [];
    }
    await refresh();
  };

  const openTask = async (task) => {
    activeTask.value = task;
    comments.value = await api.listComments(task.id);
  };

  const addComment = async (payload) => {
    if (!activeTask.value) return;
    await api.addComment(activeTask.value.id, payload);
    comments.value = await api.listComments(activeTask.value.id);
  };

  return {
    tasks,
    analytics,
    activeTask,
    comments,
    loading,
    error,
    groupedTasks,
    refresh,
    createTask,
    moveTask,
    deleteTask,
    openTask,
    addComment
  };
};
