const express = require('express');
const app = express();

// This line lets you read JSON from request bodies (req.body)
// Without it, req.body is always undefined — a common beginner mistake
app.use(express.json());

// In-memory store — Hour 2 will replace this with PostgreSQL
let tasks = [];
let nextId = 1;

// GET /tasks — return all tasks
app.get('/tasks', (req, res) => {
  res.json(tasks);
});

// POST /tasks — create a new task
app.post('/tasks', (req, res) => {
  const { title } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const task = {
    id: nextId++,
    title,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  tasks.push(task);
  res.status(201).json(task);
});

// PUT /tasks/:id — update a task's title or status
app.put('/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const task = tasks.find(t => t.id === id);

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const { title, status } = req.body;
  if (title) task.title = title;
  if (status) task.status = status;

  res.json(task);
});

// DELETE /tasks/:id — remove a task
app.delete('/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = tasks.findIndex(t => t.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  tasks.splice(index, 1);
  res.status(204).send();
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});