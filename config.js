var mysql = require('mysql2');

var con = mysql.createConnection({
    host: "osciltechinstance.cufga4wez9ub.ap-south-1.rds.amazonaws.com",
    port: "3306",
    user: "oscil_tech",
    password: "Osciltech2022",
    database: "osciltech"
    
});

con.connect(function(err){
    if (err) throw err;
    console.log("connected!");
});
module.exports = con;