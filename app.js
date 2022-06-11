// Create express app
var express = require("express");
var net = require("net");
var con = require("./config.js");
const axios = require("axios");
const readXlsxFile = require("read-excel-file/node");
const multer = require("multer");
const path = require("path");
var md5 = require("md5");
const cookieParser = require("cookie-parser");
const sessions = require("express-session");
const { res } = require("date-and-time");
const { response } = require("express");
const { on } = require("events");

var app = express();
// var bodyParser = require("body-parser");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname + "/views"));
app.set("view engine", "ejs");

// creating 24 hours from milliseconds
const oneDay = 1000 * 60 * 60 * 24;

// User for starting a socket 
// for listning for GPS device
host = "0.0.0.0";
port = 8090;

var server = net.createServer();

server.listen(port, () => {
  console.log(`TCP server listening on ${host}:${port}`);
});

server.on("connection", (socket) => {
  var clientAddress = `${socket.remoteAddress}:${socket.remotePort}`;
  console.log(`new client connected: ${clientAddress}`);
  socket.on("data", (data) => {
    console.log(`${clientAddress}: ${data}`);
    
  });
  socket.on("close", () => {
    console.log(`connection closed: ${clientAddress}`);
  });
  socket.on("error", (err) => {
    console.log(`Error occurred in ${clientAddress}: ${err.message}`);
  });
});

//session middleware
app.use(
  sessions({
    secret: "thisismysecrctekeyfhrgfgrfrty84fwir767",
    saveUninitialized: true,
    cookie: { maxAge: oneDay },
    resave: false,
  })
);
app.use(cookieParser());

// a variable to save a session
var session;

// Server port
var HTTP_PORT = 80;
// Start Server
app.listen(process.env.PORT || HTTP_PORT, () => {
  console.log("Server running on port %PORT%".replace("%PORT%", HTTP_PORT));
});

const excelFilter = (req, file, cb) => {
  if (
    file.mimetype.includes("excel") ||
    file.mimetype.includes("spreadsheetml")
  ) {
    cb(null, true);
  } else {
    cb("Please upload only excel file.", false);
  }
};
var storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, __dirname + "/resources/assets/uploads/");
  },
  filename: (req, file, cb) => {
    console.log(file.originalname);
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
var uploadFile = multer({ storage: storage, fileFilter: excelFilter });

function format_date(p1, date_format) {
  if (date_format == "YYYY-MM-DD") {
    var dd = p1.substring(0, 2);
    var mm = p1.substring(3, 5);
    var yy = p1.substring(6, 11);
    var new_date = yy.concat("-", mm, "-", dd);

    return new_date; // The function returns date in the format YYYY-MM-DD
  } else if (date_format == "DD/MM/YYYY") {
    var yy = p1.substring(0, 4);
    var mm = p1.substring(5, 7);
    var dd = p1.substring(8, 10);
    var new_date = dd.concat("/", mm, "/", yy);

    return new_date; // The function returns date in the format YYYY-MM-DD
  }
}

app.get("/", (req, res, next) => {
  // Root endpoint
  session = req.session;
  var date = new Date();
  var last = new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000);
  var sday = last.getDate();
  var smonth = last.getMonth() + 1;
  var syear = last.getFullYear();
  var eday = date.getDate();
  var emonth = date.getMonth() + 1;
  var eyear = date.getFullYear();
  if (session.userid) {
    if (session.role === "user") {
      console.log(session.userid);
      var user = session.userid;
      var sql =
        "SELECT Device_no, Container_no from containers where UserID = ?";
      var params = [user];
      con.connect(function (err) {
        if (err) throw err;
        var sql =
          "SELECT Device_no, Container_no from containers where UserID = ?";
        var values = [user];
        con.query(sql, values, function (err, devices) {
          if (err) throw err;
          if (devices.lenght === 0) {
            res.render("index", {
              status: 400,
              data: devices,
              selected: "No containers",
              startdate: sday
                .toString()
                .concat("/", smonth.toString(), "/", syeartoString()),
              enddate: eday
                .toString()
                .concat("/", emonth.toString(), "/", eyear.toString()),
            });
            return;
          }
          var device = devices[0].Device_no;
          var container = devices[0].Container_no;
          console.log(device);
          var sql2 =
            "SELECT Latitude, Longitude, Time from location where Device_no = ?;";
          var values2 = [device];
          con.query(sql2, values2, function (err, rows) {
            if (err) throw err;
            if (rows.lenght === 0) {
              res.render("index", {
                status: 201,
                data: rows,
                containers: devices,
                selected: container,
                startdate: sday
                  .toString()
                  .concat("/", smonth.toString(), "/", syear.toString()),
                enddate: eday
                  .toString()
                  .concat("/", emonth.toString(), "/", eyear.toString()),
              });
              return;
            }
            console.log(rows);
            console.log(rows[0].Time);
            res.render("index", {
              status: 200,
              data: rows,
              containers: devices,
              selected: container,
              startdate: format_date(rows[0].Time, "DD/MM/YYYY"),
              enddate: format_date(rows[rows.length - 1].Time, "DD/MM/YYYY"),
            });
          });
        });
      });
    } else {
      var user = session.userid;
      con.connect(function (err) {
        if (err) throw err;
        var sql =
          "Select c.Device_no, c.Container_no, c.Container_type, c.Status, c.userID from containers as c, user as u where Companycode = ( select CompanyID from company where AdminId = ? ) AND c.UserID = u.UserID;";
        var values = [user];
        con.query(sql, values, function (err, devices) {
          if (err) throw err;
          if (devices.lenght === 0) {
            res.render("index", {
              status: 400,
              data: devices,
              selected: "No containers",
              startdate: sday
                .toString()
                .concat("/", smonth.toString(), "/", syear.toString()),
              enddate: eday
                .toString()
                .concat("/", emonth.toString(), "/", eyear.toString()),
            });
            return;
          }
          var device = devices[0].Device_no;
          var container = devices[0].Container_no;
          console.log(device);
          var sql2 =
            "SELECT Latitude, Longitude, Time from location where Device_no = ?;";
          var values2 = [device];
          con.query(sql2, values2, function (err, rows) {
            if (err) throw err;
            if (rows.lenght === 0) {
              res.render("index", {
                status: 201,
                data: rows,
                containers: devices,
                selected: container,
                startdate: sday
                  .toString()
                  .concat("/", smonth.toString(), "/", syear.toString()),
                enddate: eday
                  .toString()
                  .concat("/", emonth.toString(), "/", eyear.toString()),
              });
              return;
            }
            console.log(rows);
            console.log(rows[0].Time);
            res.render("index", {
              status: 200,
              data: rows,
              containers: devices,
              selected: container,
              startdate: format_date(rows[0].Time, "DD/MM/YYYY"),
              enddate: format_date(rows[rows.length - 1].Time, "DD/MM/YYYY"),
            });
          });
        });
      });
    }
  } else {
    res.redirect("login");
  }
});

app.get("/admin", (req, res, next) => {
  // Get all containers form the database
  session = req.session;
  if (session.userid) {
    var user = session.userid;
    if (session.role === "user") {
      con.connect(function (err) {
        if (err) throw err;
        var sql = "SELECT * FROM containers WHERE UserID = ?";
        var values = [user];
        con.query(sql, values, function (err, result) {
          if (err) throw err;
          res.render("user_console", { data: result });
          return;
        });
      });
    } else {
      con.connect(function (err) {
        if (err) throw err;
        var sql =
          "Select c.ID, c.Device_no, c.Container_no, c.Container_type, c.Current_city, c.status, c.Battery, c.userID from containers as c, user as u where Companycode = ( select CompanyID from company where AdminId = ? ) AND c.UserID = u.UserID;";
        var values = [user];
        con.query(sql, values, function (err, result) {
          if (err) throw err;
          res.render("admin", { data: result });
          return;
        });
      });
    }
  } else {
    res.redirect("login");
  }
});

app.post("/", (req, res, next) => {
  session = req.session;
  // Respond with new details of containers based on requested parameters
  var user = session.userid;
  var container = req.body.select_box;
  console.log(req.body);
  if (!req.body) {
    return;
  }
  var date = req.body.filter_date.replace(/ /g, "").split("-");
  console.log(date);
  var start_date = format_date(date[0], "YYYY-MM-DD");
  var end_date = format_date(date[1], "YYYY-MM-DD");
  if (session.role === "user") {
    // User
    con.connect(function (err) {
      if (err) throw err;
      var sql =
        "SELECT Device_no, Container_no from containers where UserID = ?";
      var values = [user];
      con.query(sql, values, function (err, devices) {
        if (err) throw err;
        var sql2 =
          "SELECT Device_no, Container_no from containers where Container_no = ?";
        var values2 = [container];
        con.query(sql2, values2, function (err, device) {
          if (err) throw err;
          var device_no = device[0].Device_no;
          console.log(container);
          var sql3 =
            "SELECT * from location where Device_no = ? AND TIME BETWEEN ? AND ?;";
          var values3 = [device_no, start_date, end_date];
          con.query(sql3, values3, function (err, rows) {
            if (err) throw err;
            if (rows.length === 0) {
              res.render("index", {
                status: 201,
                data: rows,
                containers: devices,
                selected: container,
                startdate: date[0],
                enddate: date[1],
              });
              return;
            }
            res.render("index", {
              status: 200,
              data: rows,
              containers: devices,
              selected: container,
              startdate: date[0],
              enddate: date[1],
            });
          });
          return;
        });
      });
    });
  } else {
    con.connect(function (err) {
      if (err) throw err;
      var sql =
        "Select c.Device_no, c.Container_no, c.Container_type, c.status, c.userID from containers as c, user as u where Companycode = ( select CompanyID from company where AdminId = ? ) AND c.UserID = u.UserID;";
      var values = [user];
      con.query(sql, values, function (err, devices) {
        if (err) throw err;
        var sql2 =
          "SELECT Device_no, Container_no from containers where Container_no = ?";
        var values2 = [container];
        con.query(sql2, values2, function (err, device) {
          if (err) throw err;
          var device_no = device[0].Device_no;
          console.log(container);
          var sql3 =
            "SELECT * from location where Device_no = ? AND TIME BETWEEN ? AND ?;";
          var values3 = [device_no, start_date, end_date];
          con.query(sql3, values3, function (err, rows) {
            if (err) throw err;
            if (rows.length === 0) {
              res.render("index", {
                status: 201,
                data: rows,
                containers: devices,
                selected: container,
                startdate: date[0],
                enddate: date[1],
              });
              return;
            }
            res.render("index", {
              status: 200,
              data: rows,
              containers: devices,
              selected: container,
              startdate: date[0],
              enddate: date[1],
            });
          });
          return;
        });
      });
    });
  }
});
app.get("/signup", (req, res, next) => {
  // render signup page for user
  res.render("signup");
});

app.get("/signup-admin", (req, res, next) => {
  // render admin signup page for user
  res.render("signup-admin");
});

app.get("/login", (req, res, next) => {
  // render login page for user
  session = req.session;
  console.log(session);
  if (session.userid) {
    res.redirect("/admin");
  } else res.render("login");
});

app.post("/login", (req, res, next) => {
  // render login page for user
  var email = req.body.email;

  con.connect(function (err) {
    if (err) throw err;
    var password = md5(req.body.password);
    var sql = "select * from user where email = ? and password = ?";
    var values = [email, password];
    con.query(sql, values, function (err, rows) {
      if (err) throw err;
      if (rows.length !== 0) {
        session = req.session;
        session.userid = rows[0].UserID;
        session.role = rows[0].role;
        res.json({
          status: 200,
          message: "You are Logged in sucessfully",
        });
      } else {
        res.json({
          status: 400,
          message: "Invalid Username or Password",
        });
      }
    });
  });
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

app.get("/api/admin/getContainers", (req, res, next) => {
  // Get all containers form the database
  session = req.session;
  if (session.userid) {
    var user = session.userid;
    if (session.role === "user") {
      con.connect(function (err) {
        var sql2 = "SELECT * FROM containers WHERE UserID = ?";
        var params = [user];
        con.query(sql, values, function (err, rows) {
          if (err) throw err;
          res.render("user_console", { data: rows });
        });
      });
    } else {
      var sql =
        "Select c.Device_no, c.Container_no, c.Container_type, c.status, c.UserID from containers as c, user as u where Companycode = ( select CompanyID from company where AdminId = ? ) AND c.UserID = u.UserID;";
      var values = [user];
      con.connect(function (err) {
        if (err) throw err;
        con.query(sql, values, function (err, rows) {
          if (err) throw err;
          res.json({
            data: rows,
          });
        });
      });
    }
  } else {
    res.redirect("login");
  }
});

app.get("/api/getUserDetails", (req, res, next) => {
  // Get user details form the database
  session = req.session;
  var user = session.userid;
  var sql =
    "SELECT UserID, Name, Email, Phone, Companycode FROM user WHERE UserID = ?";
  var values = [user];
  con.connect(function (err) {
    if (err) throw err;
    con.query(sql, values, function (err, rows) {
      if (err) throw err;
      var sql2 = "Select * from company where CompanyID = ?;";
      var values2 = [rows[0].Companycode];
      con.query(sql2, values2, function (err, comdata) {
        if (err) throw err;
        res.json({
          status: 200,
          data: rows,
          comdata: comdata,
        });
      });
    });
  });
});

app.get("/api/getUserlist", (req, res, next) => {
  // Get all user form the database under that admin
  session = req.session;
  var user = session.userid;
  var sql = "SELECT * FROM company WHERE AdminID = ?";
  var values = [user];
  con.connect(function (err) {
    if (err) throw err;
    con.query(sql, values, function (err, rows) {
      if (err) throw err;
      if (rows.length === 0) {
        res.json({
          status: 201,
          data: rows,
        });
        return;
      }
      var sql2 =
        "SELECT UserID, Name, Email, role, DOJ FROM user WHERE Companycode = ?";
      var values2 = [rows[0].CompanyID];
      con.query(sql2, values2, function (err, users) {
        if (err) throw err;
        res.json({
          status: 200,
          data: users,
        });
      });
    });
  });
});

app.get("/api/getcontainertype", (req, res, next) => {
  session = req.session;
  var user = session.userid;
  var sql = "SELECT distinct Container_type FROM containers;";
  con.connect(function (err) {
    if (err) throw err;
    con.query(sql, function (err, rows) {
      if (err) throw err;
      res.json({ data: rows });
    });
  });
});

app.post("/usrregistration", (req, res, next) => {
  // Register an user to the website
  var email = req.body.email;
  console.log(req.body.userid);
  var userid = req.body.userid;
  session = req.session;
  var user = session.userid;
  var sql = "Select * from user where Email = ? OR UserID = ?";
  var values = [email, userid];
  con.connect(function (err) {
    if (err) throw err;
    con.query(sql, values, function (err, rows) {
      if (err) throw err;
      if (rows.length !== 0) {
        res.json({
          status: 100,
          message: "User already resgestered",
        });
      } else {
        if (req.body.role.toLowerCase() === "user") {
          var sql2 = "Select * from company where AdminId = ?";
          var values2 = [user];
          con.query(sql2, values2, function (err, row) {
            if (err) throw err;
            companyCode = row[0].CompanyID;
            var password = md5(req.body.password);
            var instsql =
              "INSERT INTO user (Name, UserID, Email, Password, Role, CompanyCode) Values (?,?,?,?,?,?)";
            var instvalues = [
              req.body.name,
              req.body.userid,
              req.body.email,
              password,
              req.body.role,
              companyCode,
            ];
            con.query(instsql, instvalues, function (err, rows) {
              if (err) throw err;
              res.json({
                status: 201,
                message: "You are registered sucessfully ",
              });
            });
          });
        } else {
          var sql = "Select * from company where AdminId = ?";
          var values = [user];
          con.query(sql, values, function (err, row) {
            if (err) throw err;
            companyCode = row[0].CompanyID;
            BusinessName = row[0].BusinessName;
            address = row[0].Address;
            phone = row[0].Phone;
            email = row[0].Email;
            var password = md5(req.body.password);
            var instsql =
              "INSERT INTO user (Name, UserID, Email, Password, Role, CompanyCode) Values (?,?,?,?,?,?)";
            var instvalues = [
              req.body.name,
              req.body.userid,
              req.body.email,
              password,
              req.body.role,
              companyCode,
            ];
            con.query(instsql, instvalues, function (err, rows) {
              if (err) throw err;
              res.json({
                status: 201,
                message: "You are registered sucessfully ",
              });
            });
          });
        }
      }
    });
  });
});

app.post("/adminregistration", (req, res, next) => {
  // Register an user to the website
  var email = req.body.email;
  console.log(req.body.usrname);
  var userid = req.body.usrname;
  var sql = "Select * from user where Email = ? OR UserID = ?";
  var values = [email, userid];
  con.connect(function (err) {
    if (err) throw err;
    con.query(sql, values, function (err, rows) {
      if (err) throw err;
      if (rows.length !== 0) {
        res.json({
          status: 100,
          message: "User already registered",
        });
      } else {
        var password = md5(req.body.password);
        var instsql =
          "INSERT INTO user (Name, UserID, Email, Password, Role) Values (?,?,?,?,?)";
        var instvalues = [
          req.body.name,
          req.body.usrname,
          req.body.email,
          password,
          "admin",
        ];
        con.query(instsql, instvalues, function (err, rows) {
          if (err) throw err;
          res.json({
            status: 201,
            message: "You are registered sucessfully ",
          });
        });
      }
    });
  });
});

app.post("/api/update/admindata", (req, res) => {
  // update data to the contianers table
  session = req.session;
  var user = session.userid;
  // Fetch old company code
  var sql_select = "SELECT Companycode FROM user WHERE UserID=?";
  var values = [user];
  con.connect(function (err) {
    if (err) throw err;
    con.query(sql_select, values, function (err, companycode) {
      if (err) throw err;
      if (companycode.length === 0) {
        var sql2 = "UPDATE user set Companycode = ?, Phone=? where UserID = ?;";
        var values2 = [req.body.companycode, req.body.phone, req.body.username];
        con.query(sql2, values2, function (err, rows) {
          if (err) throw err;
        });
      } else {
        //update company code for admin
        var sql = "UPDATE user set Companycode = ?, Phone=? where UserID = ?;";
        var values = [req.body.companycode, req.body.phone, req.body.username];
        con.query(sql, values, function (err, rows) {
          if (err) throw err;
        });

        //update company code for all users under that company
        var sql = "UPDATE user set Companycode = ? where Companycode = ?;";
        var values = [req.body.companycode, companycode[0].Companycode];
        con.query(sql, values, function (err, result) {
          if (err) throw err;
        });
        var sql_select = "SELECT * FROM  company where AdminID = ?;";
        var values_select = [user];
        con.query(sql_select, values_select, function (err, rows) {
          if (err) throw err;
          if (rows.length === 0) {
            var sql =
              "Insert INTO company (CompanyID, BusinessName, AdminId, Address, Phone, Email) VALUES (?,?,?,?,?,?);";
            var values = [
              req.body.companycode,
              req.body.companyname,
              req.body.username,
              req.body.companylocation,
              req.body.phone,
              req.body.email,
            ];
            con.query(sql, values, function (err, rows) {
              if (err) throw err;
            });
          } else {
            var sql =
              "UPDATE company set CompanyID = ?, BusinessName=?, Address=?, Phone=?, Email=? where AdminID = ?;";
            var values = [
              req.body.companycode,
              req.body.companyname,
              req.body.companylocation,
              req.body.phone,
              req.body.email,
              user,
            ];
            con.query(sql, values, function (err, rows) {
              if (err) throw err;
            });
          }
        });
      }
    });
  });
});

app.get("/api/update/userprofile", (req, res) => {
  // update data to the contianers table

  var sql = "UPDATE user set Name = ?, Phone=? where UserID = ?;";
  var values = [req.body.name, req.body.phone, req.body.username];
  con.connect(function (err) {
    if (err) throw err;
    con.query(sql, values, function (err, rows) {
      if (err) throw err;
    });
  });
});

app.get("/api/get/dashboard", (req, res) => {
  // update data to the contianers table
  session = req.session
  var user = session.userid
  var sql = "SELECT Count(Container_no) as Count, Created_on FROM containers where UserID = ? GROUP BY Created_on;";
  var values = [user];
  con.connect(function (err) {
    if (err) throw err;
    con.query(sql, values, function (err, rows) {
      if (err) throw err;
      var sql = 'SELECT count(Container_no) as Total, count(distinct Container_type) as types,  count( \
        CASE \
          WHEN Status="Active" THEN Container_no \
            END) as "Active" \
            from containers where UserID = ?;'
      var values = [user];
      con.query(sql, values, function(err, counts){
        if (err) throw err;
        var sql = 'SELECT count(UserID) as users FROM user WHERE Companycode = (select companyID from company where AdminID=?);'
      var value = [user]
      con.query(sql, value, function(err, users){
        if(err) throw err;
        res.json({rows, counts, users})
      })
      })
      
    });
  });
});

app.post("/api/update/user", (req, res) => {
  // update data to the contianers table
  var password = md5(req.body.password);
  var sql =
    "UPDATE user set UserID=?, Name = ?, Email=?, Password=?, role=? where UserID = ?;";
  var values = [
    req.body.userid,
    req.body.name,
    req.body.email,
    password,
    req.body.role,
    req.body.id,
  ];
  con.connect(function (err) {
    if (err) throw err;
    con.query(sql, values, function (err, rows) {
      if (err) throw err;
    });
  });
});

app.put("/api/update_container", (req, res) => {
  // update data to the contianers table
  var sql =
    "UPDATE containers SET Device_no = ?, Container_no=?, Container_type=?, Modified_on=current_timestamp WHERE ID=?;";
  var values = [
    req.body.device,
    req.body.container,
    req.body.type,
    req.body.id,
  ];
  con.connect(function (err) {
    if (err) throw err;
    con.query(sql, values, function (err, rows) {
      if (err) throw err;
      res.json({ message: "sucessfully Updeted The values" });
    });
  });
});

app.post("/api/delete/user", (req, res) => {
  // update data to the contianers table
  var sql = "Delete from user where UserID = ?";
  var values = [req.body.id];
  con.connect(function (err) {
    if (err) throw err;
    con.query(sql, values, function (err, rows) {
      if (err) throw err;
      res.json({ status: 201, message: "sucessfully Deleted" + req.body.id });
    });
  });
});

app.post("/api/add_container", (req, res) => {
  // Add new container and device pair to the container table
  session = req.session;
  var user = session.userid;
  var sql = 'SELECT Container_no, Device_no from containers Where Container_no =? or Device_no=?'
  var values=[req.body.container_no, req.body.device_no]
  console.log(req.body)
});

// app.post("/api/add_container", (req, res) => {
//   // Add new container and device pair to the container table
//   session = req.session;
//   var user = session.userid;
//   var sql = 'SELECT Container_no, Device_no from Containers Where Container_no =? or Device_no=?'
//   var values=[req.body.container_no, req.body.device_no]
//   con.connect(function(err){
//     if(err) throw err;
//     con.query(sql, values, function(err, rows){
//       if(err){
//         console.log(err);
//         return;
//       }
//       if(rows.length === 0){
//         var sql =
//         'INSERT INTO Containers (Device_no, Container_no, Container_type, Status, UserID, created_on, Modified_on) Values (?,?,?,"Active",?,current_timestamp,current_timestamp)';
//       var values = [
//         req.body.device_no,
//         req.body.container_no,
//         req.body.container_type,
//         user,
//       ];
//       con.connect(function (err) {
//         if (err) throw err;
//         con.query(sql, values, function (err, rows) {
//           if (err) throw err;
//           res.json({ status:200,
//             message: "Added Sucessfully" });
//         });
//       });
//       }else{
//         res.json({status:201,
//           rows : rows
//         })
//       }
//     })
//   })
// });


app.post("/api/update/status", (req, res) => {
  // update stuatus data to the contianers table
  if (req.body.status === "active") {
    console.log(req.body);
    var sql = "UPDATE containers SET status=? WHERE ID=?;";
    var values = ["Inactive", req.body.id];
    con.connect(function (err) {
        if (err) throw err;
        con.query(sql, values, function (err, rows) {
          if (err) throw err;
        });
      });
  } else {
    var sql = "UPDATE containers SET status=? WHERE ID=?;";
    var values = ["Active", req.body.id];
    con.connect(function (err) {
        if (err) throw err;
        con.query(sql, values, function (err, rows) {
          if (err) throw err;
        });
      });
  }
});

app.post("/api/uploadfile", uploadFile.single("uploadfile"), (req, res) => {
  // Upload data to sqlite from excel file
  // var response = importExcelData2MySQL(
  //   __dirname + "/resources/assets/uploads/" + req.file.filename
  // );
  var filePath = __dirname + "/resources/assets/uploads/" + req.file.filename
  var devices = []
  var containers = []
  readXlsxFile(filePath).then((rows) =>{
    rows.shift();
    var sql =
      "Select Device_no, Container_no from containers where Device_no IN (?) or Container_no IN (?);";
    rows.forEach((element) => {
      
      devices.push(element[0]);
      containers.push(element[1]);
     
    })
     con.connect(function(err){
        if(err){
          console.log(err)
          return;
        }
        values = [devices, containers]
        con.query(sql, values, function(err, rows){
          if(err){
            console.log(err)
            return;
          }
          res.json({rows
          })
          return;
        })
      });
  })
  
});
// ****************************************************************************************
app.post("/api/uploadfile/replace", uploadFile.single("uploadfile"), (req, res) => {
  // Upload data to sqlite from excel file
  importExcelData2MySQL(
    __dirname + "/resources/assets/uploads/" + req.file.filename
  );
    
});

// -> Import Excel Data to MySQL database
function importExcelData2MySQL(filePath) {
  // File path.
  readXlsxFile(filePath).then((rows) => {
    // `rows` is an array of rows
    // each row being an array of cells.

    // Remove Header ROW
    rows.shift();
    let sql = "SELECT * from containers where Device_no = ? or Container_no = ?;"
    
    rows.forEach((element) => {
      console.log(element);
      var params = [element[0], element[1]];
      var values = [element[0], element[1],element[2]]
      con.connect(function(err){
        if(err){
          console.log(err);
          return;
        }
        con.query(sql, params, function(err, rows){
          if(err){
            console.log(err);
            return;
          }
          if(rows.length === 0){
            let instsql =
                'INSERT INTO containers (Device_no, Container_no, Container_type, UserID) Values (?);';
            con.query(instsql, values, function(err, rows){
              if(err){
                console.log(err);
                return;
              }
              })
            }else{
              let instsql =
                'UPDATE containers SET Device_no =?, Container_no=?, Container_type =? where UserID = ?;';
            con.query(instsql, values, function(err, rows){
              if(err){
                console.log(err);
                return;
              }
              console.log(rows)
              })
            }

        })
      })
    });

  });
}

function call_for_data(callback) {
  axios
    .get(
      "https://api.thingspeak.com/channels/1647037/feeds.json?api_key=ZQQ5XA6VDP855J1K&results=1"
    )
    .then((response) => {
      var data = {
        latitude: response.data.feeds[0].field1,
        longitude: response.data.feeds[0].field2,
        satellites: response.data.feeds[0].field3,
        time: response.data.feeds[0].created_at,
        battery: response.data.feeds[0].field4,
        device: "ABC346",
      };

      var sql =
        "INSERT INTO location (Device_no, Latitude, Longitude, Satellite, Time, Battery) VALUES (?,?,?,?,?,?)";
      var values = [
        data.device,
        data.latitude,
        data.longitude,
        data.satellites,
        data.time,
        data.battery,
      ];
      con.connect(function(err){
          if(err) throw err;
          con.query(sql, values, function(err){
              if(err) throw err;
          })
      })
    })
    .catch((error) => {
      console.log(error);
    });
  callback();
}

function wait60sec() {
  setTimeout(function () {
    call_for_data(wait60sec);
  }, 60000);
}

app.get("/api/thing", (reqs, res, next) => {
  // Fetch data from Thingspeak
  //res.json({"message":"In thingspeak"})

  call_for_data(wait60sec);
});

// Trial function for new implementation
app.get("/api/trial/", (req, res, next) => {
    session=req.session
  var user = session.userid
  var sql = "SELECT Device_no, Container_no FROM containers WHERE UserID = ?";
  var values = [user];
  con.connect(function(err){
    if(err) throw err;
    con.query(sql, values, function(err, rows){
        if(err) throw err;
        res.json({
            message: "sucess",
            data: rows,
          });
    })
})
});

app.get("/api/", (_req, res, next) => {
  // Fetch all the data from the database
  var sql = "select * from location";
  con.connect(function (err) {
    if (err) throw err;
    con.query(sql, function (err, result) {
      if (err) throw err;
      res.json({
        message: "sucess",
        data: result,
      });
    });
  });
});

app.post("/api/", (req, res, next) => {
  // Insert data to the server
  var errors = [];
  // Reject the request if the api key is not matched
  if (req.body.api_key != "QRB0vOdUNJ81BgQjyg3V") {
    res.status(400).json({ error: "No valid api key provided" });
    return;
  } else {
    // Check if all the fields are filled while sending
    if (!req.body.latitude) {
      errors.push("No latitude specified");
    }
    if (!req.body.longitude) {
      errors.push("No longitude specified");
    }
    if (!req.body.satellites) {
      errors.push("No satellites specified");
    }
    if (!req.body.time) {
      errors.push("No time specified");
    }
    if (!req.body.battery) {
      errors.push("No battery specified");
    }
    if (errors.length) {
      res.status(400).json({ error: errors.join(",") });
      return;
    }
    // Insert data to the server
    var data = {
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      satellites: req.body.satellites,
      time: req.body.time,
      battery: req.body.battery,
    };
    var sql =
      "INSERT INTO location (latitude, longitude, satellites, time, battery) VALUES (?,?,?,?,?)";
    var values = [
      data.latitude,
      data.longitude,
      data.satellites,
      data.time,
      data.battery,
    ];
    con.connect(function (err) {
        if (err) throw err;
        con.query(sql, values, function (err, rows) {
          if (err) throw err;
          res.json({
            message: "Success",
            data: data,
            id: this.lastID,
          });
        });
      });
  }
});

// Default responce for any other request
app.use(function (req, res) {
  res.status(404);
});
