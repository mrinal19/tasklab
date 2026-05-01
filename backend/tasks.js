const express = require("express");
const router = express.Router();

let tasks = []; // simple memory storage

// GET all tasks
router.get("/", (req, res) => {
  res.json(tasks);
});

// ADD task
router.post("/", (req, res) => {
  const { title } = req.body;

  const newTask = {
    id: Date.now(),
    title
  };

  tasks.push(newTask);

  res.json(newTask); // IMPORTANT
});

module.exports = router;
