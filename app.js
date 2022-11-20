// modules required
require("dotenv").config();
const express = require("express");
const bodyParse = require("body-parser");
const ejs = require("ejs");
const mysql = require("mysql2");
const _ = require("lodash");
const session = require("express-session");

const connection = mysql.createConnection({
  host: "localhost",
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: "counselingsystem",
});
connection.connect(() => {
  console.log("database connected");
  setInterval(() => {
    connection.query("call updateLevel()", () => {
      console.log("updated");
    });
  }, 5 * 60 * 1000);
});

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

/* 
  login route for user
*/
app
  .route("/")
  .get((req, res) => {
    res.render("index", {
      error: "",
    });
  })
  .post((req, res) => {
    const query = `select loginUser('${req.body.username}', '${req.body.password}')`;
    connection.query(query, (err, result) => {
      const errCode = Object.values(result[0])[0];
      if (errCode === 1) {
        req.session.isAuth = true;
        connection.query(
          `select * from patient where username = '${req.body.username}' and password = '${req.body.password}'`,
          (err, result) => {
            req.session.data = result;
            res.redirect("/Dashboard/user/home");
          }
        );
      } else {
        res.render("index", {
          error: "Username or Password wrong",
        });
      }
    });
  });

/*
  register route for user
*/
app
  .route("/register")
  .get((req, res) => {
    res.render("register", {
      error: "",
    });
  })
  .post((req, res) => {
    const query = `select registerUser('${req.body.fname}', '${req.body.mname}', '${req.body.lname}', '${req.body.dob}', '${req.body.gender}', '${req.body.username}', '${req.body.password}', '${req.body.occupation}', '${req.body.email}')`;
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
            res.redirect("/Dashboard/user/home");
          }
        );
      } else {
        res.render("register", {
          error: "Username or Email already registered",
        });
      }
    });
  });

/* 
  login route for counselor
*/
app
  .route("/loginCounselor")
  .get((req, res) => {
    res.render("loginCounselor", {
      error: "",
    });
  })
  .post((req, res) => {
    const query = `select loginCounselor('${req.body.username}', '${req.body.password}')`;
    connection.query(query, (err, result) => {
      const errCode = Object.values(result[0])[0];
      if (errCode === 1) {
        req.session.isAuthCounselor = true;
        connection.query(
          `select * from counselor join type_counselor where counselor.type_id = type_counselor.type_id and username = '${req.body.username}' and password = '${req.body.password}'`,
          (err, result) => {
            req.session.data = result;
            res.redirect("/Dashboard/counselor/home");
          }
        );
      } else {
        res.render("loginCounselor", {
          error: "Username or Password wrong",
        });
      }
    });
  });

/* 
  register a counselor
*/
app
  .route("/registerCounselor")
  .get((req, res) => {
    connection.query(
      "select counselor_type from type_counselor",
      (err, result) => {
        res.render("registerCounselor", {
          error: "",
          type: result,
        });
      }
    );
  })
  .post((req, res) => {
    const query = `select registerCounselor('${req.body.fname}', '${req.body.mname}', '${req.body.lname}', '${req.body.dob}', '${req.body.gender}', '${req.body.type}', '${req.body.username}','${req.body.password}', "${req.body.degree}", '${req.body.email}', '${req.body.exp}')`;
    connection.query(query, async (err, result) => {
      const errCode = Object.values(result[0])[0];
      if (errCode === 1) {
        req.session.isAuthCounselor = true;
        connection.query(
          `select * from counselor join type_counselor where counselor.type_id = type_counselor.type_id and username = '${req.body.username}' and password = '${req.body.password}'`,
          (err, result) => {
            req.session.data = result;
            res.redirect("/Dashboard/counselor/home");
          }
        );
      } else {
        res.render("registerCounselor", {
          error: "Username or Email already registered",
        });
      }
    });
  });

app.route("/Dashboard/:role/:page").get((req, res) => {
  if (req.session.isAuth && _.lowerCase(req.params.role) === "user") {
    connection.query(
      "select type_id, counselor_type from type_counselor",
      (err, result) => {
        if (_.lowerCase(req.params.page) === "home") {
          res.render("dashboardUser", {
            data: req.session.data,
            type: result,
            page: "home",
          });
        } else if (_.lowerCase(req.params.page) === "account") {
          res.render("dashboardUser", {
            data: req.session.data,
            type: result,
            page: "account",
          });
        } else if (_.lowerCase(req.params.page) === "book") {
          res.render("dashboardUser", {
            data: req.session.data,
            type: result,
            page: "book",
            counselor: req.query.counselor 
          });
        } else if (_.lowerCase(req.params.page) === "search") {
          connection.query(
            `select * from counselor_data where counselor_type='${req.query.search}'`,
            (err, search) => {
              res.render("dashboardUser", {
                data: req.session.data,
                type: result,
                page: "search",
                search: search,
              });
            }
          );
        } else if (_.lowerCase(req.params.page) === "appointment") {
          connection.query(
            `select p.first_name, p.middle_name, p.last_name,c.*, r.*, res.* from counseling c join counselor p join reservation r join reason res where c.counselor_id = p.counselor_id and c.reservation_id = r.reservation_id and res.reason_id = r.reason_id and c.patient_id = ${req.session.data[0].patient_id}`,
            (err, search) => {
              res.render("dashboardUser", {
                data: req.session.data,
                page: "appointment",
                type: result,
                search: search,
              });
            }
          );
        } else if (_.lowerCase(req.params.page) === "reservation") {
          connection.query(
            `select p.first_name, p.middle_name, p.last_name,c.*, r.*, res.* from counseling c join patient p join reservation r join reason res where c.patient_id = p.patient_id and c.reservation_id = r.reservation_id and res.reason_id = r.reason_id and c.patient_id = ${req.session.data[0].patient_id}`,
            (err, search) => {
              res.render("dashboardUser", {
                data: req.session.data,
                page: "reservation",
                type: result,
                search: search,
              });
            }
          );
        } else {
          res.render("dashboardUser", {
            data: req.session.data,
            type: result,
            page: "error",
          });
        }
      }
    );
  } else if (
    req.session.isAuthCounselor &&
    _.lowerCase(req.params.role) === "counselor"
  ) {
    if (_.lowerCase(req.params.page) === "home") {
      res.render("dashboardCounselor", {
        data: req.session.data,
        page: "home",
      });
    } else if (_.lowerCase(req.params.page) === "account") {
      res.render("dashboardCounselor", {
        data: req.session.data,
        page: "account",
      });
    } else if (_.lowerCase(req.params.page) === "appointment") {
      connection.query(
        `select p.first_name, p.middle_name, p.last_name,c.*, r.*, res.* from counseling c join patient p join reservation r join reason res where c.patient_id = p.patient_id and c.reservation_id = r.reservation_id and res.reason_id = r.reason_id and c.counselor_id = ${req.session.data[0].counselor_id}`,
        (err, search) => {
          res.render("dashboardCounselor", {
            data: req.session.data,
            page: "appointment",
            search: search,
          });
        }
      );
    } else if (_.lowerCase(req.params.page) === "reservation") {
      connection.query(
        `select p.first_name, p.middle_name, p.last_name,c.*, r.*, res.* from counseling c join patient p join reservation r join reason res where c.patient_id = p.patient_id and c.reservation_id = r.reservation_id and res.reason_id = r.reason_id and c.counselor_id = ${req.session.data[0].counselor_id}`,
        (err, search) => {
          res.render("dashboardCounselor", {
            data: req.session.data,
            page: "reservation",
            search: search,
          });
        }
      );
    } else {
      res.render("dashboardCounselor", {
        data: req.session.data,
        page: "error",
      });
    }
  } else {
    res.redirect("/");
  }
});

app.route("/book").post((req, res) => {
  connection.query(`select booking(${req.session.data[0].patient_id}, ${Number(req.body.counselor)},"${req.body.dateReserve}", "${req.body.reason}", "${req.body.desc}")`, (err, result) => {
    const errCode = Object.values(result[0])[0];
    if(errCode === 1) {
      res.json({success: true});
    } else {
      res.json({success: false})
    }
  })
  
});

app.route("/setLink").post((req, res) => {
  connection.query(`call setLink(${req.body.reservation}, "${req.body.link}" , "${req.body.time}:00")`, (err, result) => {
    res.json({success: true});
  })
})

app.route("/setAdvice").post((req, res) => {
  connection.query(`call setAdvice(${req.body.patient},${req.session.data[0].counselor_id},${req.body.reservation}, "${req.body.msg}" ,  "${req.body.adv}" , "${req.body.link}")`, (err, result) => {
    res.json({success: true});
  })
})

app.route("/giveReview").post((req, res) => {
  connection.query(`call giveReview(${req.body.reservation}, ${req.body.rating} , "${req.body.review}")`, (err, result) => {
    console.log(err);
    res.json({success: true});
  })
})

app.route("/logout").get((req, res) => {
  req.session.destroy();
  res.redirect("/");
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
