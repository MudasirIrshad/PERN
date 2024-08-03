const express = require("express");
const cors = require("cors");
const body = require("body-parser");
const db = require("./db/db");
require("dotenv").config();
const app = express();
app.use(body.json());
app.use(cors());

const port = process.env.PORT || 3000;

app.get("/todos", async (req, res) => {
  const useremail = req.body.user_email;
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

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
