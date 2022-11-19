// modules required
require("dotenv").config();
const express = require("express");
const bodyParse = require("body-parser");
const ejs = require("ejs");
const mysql = require("mysql2");
const session = require("express-session");

const connection = mysql.createConnection({
  host: "localhost",
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: "counselingsystem",
});

connection.connect();

// app
const app = express();

app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
  })
);
// port declared
const port = process.env.PORT || 3000;

//changing settings for apps
app.use(express.static(__dirname + "/public"));
app.use(bodyParse.urlencoded({ extended: true }));
app.set("view engine", "ejs");

// requests
app.get("/", (req, res) => {
  res.render("index");
});

app.get("/register", (req, res) => {
  res.render("register", {
    error: "",
  });
});

app.post("/register", (req, res) => {
  const query = `select registerUser('${req.body.fname}', '${req.body.mname}', '${req.body.lname}', '${req.body.dob}', '${req.body.gender}', '${req.body.username}', '${req.body.password}', '${req.body.occupation}', '${req.body.email}', '${req.body.image}')`;
  connection.query(query, async (err, result) => {
    const errCode = Object.values(result[0])[0];
    if (errCode === 1) {
      req.session.isAuth = true;
      connection.query(
        `select * from patient where username = '${req.body.username}' and password = '${req.body.password}'`,
        (err, result) => {
          req.session.data = result;
          connection.query(
            `select addContact(${req.session.data[0].patient_id}, '${req.body.contact1}')`
          );
          if (req.body.contact2) {
            connection.query(
              `select addContact(${req.session.data[0].patient_id}, '${req.body.contact2}')`
            );
          }
          res.redirect("/Dashboard");
        }
      );
    } else {
      res.render("register", {
        error: "Username or Email already registered",
      });
    }
  });
});

app.get("/Dashboard", (req, res) => {
  if(req.session.isAuth) {
    res.send("logged in");
  } else {
    res.redirect("/");
  }
});

const server = app.listen(port, () => {
  console.log(`Server Started at port ${port}`);
});

// handles abrupt disconnection
process.on("SIGINT", (_) => {
  server.close(() => {
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
  server.close(() => {
    console.log("server closed properly");
    connection.end();
    process.exit(0);
  });
  // If server hasn't finished in 1000ms, shut down process
  setTimeout(() => {
    process.exit(0);
  }, 1000).unref(); // Prevents the timeout from registering on event loop
});
