// modules required
require("dotenv").config();
const express = require("express");
const bodyParse = require("body-parser");
const ejs = require("ejs");
const lodash = require("lodash");
const mysql = require("mysql2");

const connection = mysql.createConnection({
  host: "localhost",
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
});

connection.connect();

// app
const app = express();

// port declared
const port = process.env.PORT || 3000;

//changing settings for apps
app.use(express.static(__dirname + "/public"));
app.use(bodyParse.urlencoded({ extended: true }));
app.set("view engine", "ejs");

// requests
app.get("/", (request, response) => {
  response.render("index");
});

const server = app.listen(port, () => {
  console.log(`Server Started at port ${port}`);
});

// handles abrupt disconnection
process.on("SIGINT", (_) => {
  appServer.close(() => {
    console.log("server closed :- reason -> interrupted");
    connection.end();
    process.exit(0);
  });
  // If server hasn't finished in 1000ms, shut down process
  setTimeout(() => {
    process.exit(0);
  }, 1000).unref(); // Prevents the timeout from registering on event loop
});

// handled graceful disconnection
process.on("SIGTERM", (_) => {
  appServer.close(() => {
    console.log("server closed properly");
    connection.end();
    process.exit(0);
  });
  // If server hasn't finished in 1000ms, shut down process
  setTimeout(() => {
    process.exit(0);
  }, 1000).unref(); // Prevents the timeout from registering on event loop
});
