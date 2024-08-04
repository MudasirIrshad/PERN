const express = require("express");
const cors = require("cors");
const body = require("body-parser");
const db = require("./db/db");
require("dotenv").config();
const app = express();
app.use(body.json());
app.use(cors());
const jwt = require("jsonwebtoken");

const port = process.env.PORT || 3000;

app.post("/signup", (req, res) => {
  const { user_name, user_email } = req.body;
  db.query(
    "INSERT INTO users (user_name, user_email) VALUES ($1, $2) RETURNING *",
    [user_name, user_email]
  );
  try {
    res.json("User created successfully");
  } catch (err) {
    console.error("Error creating user", err.stack);
    res.status(500).send("Error creating user");
  }
});
app.post("/login", (req, res) => {
  const { user_name, user_email } = req.body;
  db.query("SELECT * FROM users WHERE user_name=$1 AND user_email=$2", [
    user_name,
    user_email,
  ])
    .then((users) => {
      if (users.rows.length === 0) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      const token = jwt.sign({ user_email }, process.env.USER_SECRETKEY);
      res.json({ token });
    })
    .catch((err) => {
      console.error("Error logging in user", err.stack);
      res.status(500).send("Error logging in user");
    });
});

const userMiddleware = (req, res, next) => {
  const token = req.headers["authorization"].split(" ")[1];
  const user_verified = jwt.verify(
    token,
    process.env.USER_SECRETKEY,
    (err, user) => {
      if (err) return res.status(401).send("Invalid token");
      req.user = user;
      next();
    }
  );
};

app.get("/todos", userMiddleware, async (req, res) => {
  const useremail = req.user.user_email;
  console.log(useremail);

  try {
    const client = await db.connect();
    try {
      const tasks = await client.query(
        "SELECT * FROM tasks where user_email=$1",
        [useremail]
      );
      res.json(tasks.rows);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Error fetching data", err.stack);
    res.status(500).send("Error fetching data");
  }
});
app.post("/addTask", userMiddleware, async (req, res) => {
  const user_email = req.user.user_email;
  const { title, description } = req.body;
  const addTask = await db.query(
    "INSERT INTO tasks (user_email, title, description) VALUES ($1, $2, $3) returning *",
    [user_email, title, description]
  );
  try {
    res.json(addTask.rows);
  } catch (err) {
    console.error("Error adding task", err.stack);
    res.status(500).send("Error adding task");
  }
});

app.put("/updateTask", userMiddleware, (req, res) => {
  const user_email = req.user.user_email;
  const { task_id, title, description } = req.body;
  db.query(
    "UPDATE tasks SET title=$1, description=$2 WHERE id=$3 AND user_email=$4",
    [title, description, task_id, user_email]
  );
  try {
    res.json("Update Successful");
  } catch (err) {
    console.error("Error updating task", err.stack);
    res.status(500).send("Error updating task");
  }
});
app.delete("/deleteTask", userMiddleware, (req, res) => {
  const user_email = req.user.user_email;
  const { task_id } = req.body;
  db.query("DELETE FROM tasks WHERE id=$1 AND user_email=$2", [
    task_id,
    user_email,
  ]);
  try {
    res.json("Task deleted successfully");
  } catch (err) {
    console.error("Error deleting task", err.stack);
    res.status(500).send("Error deleting task");
  }
});
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
