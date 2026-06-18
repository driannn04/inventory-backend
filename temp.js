const db = require("./config/db");
db.query("SELECT * FROM departments", (err, deps) => {
  console.log("DEPARTMENTS", deps);
  db.query("SELECT * FROM sub_departments", (err, subdeps) => {
    console.log("SUB_DEPARTMENTS", subdeps);
    process.exit(0);
  });
});
