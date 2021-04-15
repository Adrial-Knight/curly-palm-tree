const {openDb} = require("./db")

const tables = ["USERS", "ARTICLES", "COMMENTS", "FAVORITES"]

async function createTables(db){
  await db.run(`
    CREATE TABLE IF NOT EXISTS USERS(
        u_id INTEGER PRIMARY KEY AUTOINCREMENT,
        u_pseudo varchar(255),
        u_mail varchar(255),
        u_password varchar(255),
        u_connexion date
      );

    CREATE TABLE IF NOT EXISTS ARTICLES(
        a_id INTEGER PRIMARY KEY AUTOINCREMENT,
        a_user INTEGER,
        a_score INTEGER,
        a_date date,
        a_link,
        a_title,
        a_sub,
        a_content
    );

    CREATE TABLE IF NOT EXISTS COMMENTS(
        c_id INTEGER PRIMARY KEY AUTOINCREMENT,
        c_article INTEGER,
        c_user INTEGER,
        c_score INTEGER,
    );

    CREATE TABLE IF NOT EXISTS FAVORITES(
        f_user INTEGER,
        f_article INTEGER,
        f_date date,
    );
  `)
  const u_pseudos = ["Pierre", "Jules"]
  const u_mails = ["pierre@gmail.com", "jules@gmail.com"]
  const u_passwords = ["mdp", "Vernes"]
  var date = new Date();
  var options = {weekday: "long", year: "numeric", month: "long", day: "2-digit", hour: "2-digit", minute: "2-digit"};
  date = date.toLocaleDateString("fr-FR", options)
  const u_connexions = [date, date]

  const sql_insert = `INSERT INTO USERS (u_pseudo, u_mail, u_password, u_connexion) VALUES (?, ?, ?, ?)`

  for (var i = 0; i < u_pseudos.length; i++) {
    await db.run(sql_insert, [u_pseudos[i], u_mails[i], u_passwords[i], u_connexions[i]])
  }
}

async function dropTables(db){
  return await Promise.all(tables.map( table => {
      return db.run(`DROP TABLE IF EXISTS ${table}`)
    }
  ))
}

(async () => {
  // open the database
  let db = await openDb()
  await dropTables(db)
  await createTables(db)
})()
