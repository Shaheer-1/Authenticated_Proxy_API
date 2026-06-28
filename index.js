const express = require('express');
// const { PrismaClient } = require('@prisma/client');
const { PrismaClient } = require('./node_modules/@prisma/client');

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

// GET /tasks
app.get('/tasks', async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// POST /tasks
app.post('/tasks', async (req, res) => {
  try {
    const { title } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const task = await prisma.task.create({
      data: { title }
    });

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// PUT /tasks/:id
app.put('/tasks/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, status } = req.body;

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(status && { status })
      }
    });

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Task not found or update failed' });
  }
});

// DELETE /tasks/:id
app.delete('/tasks/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    await prisma.task.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Task not found or delete failed' });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});