const db = require("../config/db");

const queryTable = (tableName) => {
  return new Promise((resolve, reject) => {
    db.query(`SELECT * FROM ${tableName}`, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

async function main() {
  try {
    console.log("=== ROLES ===");
    const roles = await queryTable("roles");
    console.log(roles);

    console.log("\n=== JABATANS ===");
    const jabatans = await queryTable("jabatans");
    console.log(jabatans);

    console.log("\n=== DEPARTMENTS ===");
    const depts = await queryTable("departments");
    console.log(depts);

    console.log("\n=== SUB_DEPARTMENTS ===");
    const subs = await queryTable("sub_departments");
    console.log(subs);

    process.exit(0);
  } catch (error) {
    console.error("Error querying database:", error);
    process.exit(1);
  }
}

main();
