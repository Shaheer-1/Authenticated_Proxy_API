require('dotenv').config();
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set in .env');
  process.exit(1);
}

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authenticate = require('./auth');

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

// ── AUTH ROUTES (public — no token needed) ──────────────────────────────────

app.post('/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const passwordHash = await bcrypt.hash(password, 10); // 10 = salt rounds

    const user = await prisma.user.create({
      data: { email, password: passwordHash }
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ token, userId: user.id });
  } catch (error) {
    if (error.code === 'P2002') { // Prisma: unique constraint violation
      return res.status(409).json({ error: 'Email already registered' });
    }
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });

    // Same error for wrong email OR wrong password — never tell an attacker which
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, userId: user.id });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// ── TASK ROUTES (protected — token required) ─────────────────────────────────

app.get('/tasks', authenticate, async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { userId: req.user.userId },  // only THIS user's tasks
      orderBy: { createdAt: 'desc' }
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

app.post('/tasks', authenticate, async (req, res) => {
  try {
    const { title } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const task = await prisma.task.create({
      data: {
        title,
        userId: req.user.userId  // attach task to the logged-in user
      }
    });

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

app.put('/tasks/:id', authenticate, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, status } = req.body;

    const task = await prisma.task.findUnique({ where: { id } });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.userId !== req.user.userId) {  // ownership check
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updated = await prisma.task.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(status && { status })
      }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Update failed' });
  }
});

app.delete('/tasks/:id', authenticate, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const task = await prisma.task.findUnique({ where: { id } });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.userId !== req.user.userId) {  // ownership check
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.task.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 — the last option, after every other route
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});