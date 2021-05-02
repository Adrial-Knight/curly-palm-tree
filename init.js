const {openDb} = require("./db")

const tables = ["USERS", "ARTICLES", "COMMENTS", "FAVORITES", "VOTES"]

async function createTables(db){
  await db.run(`
    CREATE TABLE IF NOT EXISTS USERS(
        u_id INTEGER PRIMARY KEY AUTOINCREMENT,
        u_pseudo varchar(255),
        u_mail varchar(255),
        u_password varchar(255),
        u_connexion date
      );
    `)

  await db.run(`
    CREATE TABLE IF NOT EXISTS ARTICLES(
        a_id INTEGER PRIMARY KEY AUTOINCREMENT,
        a_user INTEGER,
        a_score INTEGER,
        a_reaction INTEGER,
        a_date date,
        a_link varchar(255),
        a_title varchar(255),
        a_sub varchar(255),
        a_content varchar(40000)
    );
  `)

  await db.run(`
    CREATE TABLE IF NOT EXISTS COMMENTS(
        c_id INTEGER PRIMARY KEY AUTOINCREMENT,
        c_article INTEGER,
        c_user INTEGER,
        c_content varchar(40000),
        c_score INTEGER
    );
  `)

  await db.run(`
    CREATE TABLE IF NOT EXISTS FAVORITES(
        f_user INTEGER,
        f_article INTEGER,
        f_date date
    );
  `)

  await db.run(`
    CREATE TABLE IF NOT EXISTS VOTES(
        v_user INTEGER,
        v_reference INTEGER,
        v_date date,
        v_kind varchar(7),
        v_vote INTEGER
    );
  `)

  const u_pseudos = ["bob", "max"]
  const u_mails = ["bob@gmail.com", "max@gmail.com"]
  const u_passwords = ["bob", "max"]
  const date = new Date();
  var options = {weekday: "long", year: "numeric", month: "long", day: "2-digit", hour: "2-digit", minute: "2-digit"};
  const date_fr = date.toLocaleDateString("fr-FR", options)

  let sql_insert = `INSERT INTO USERS (u_pseudo, u_mail, u_password, u_connexion) VALUES (?, ?, ?, ?)`

  for (var i = 0; i < u_pseudos.length; i++) {
    await db.run(sql_insert, [u_pseudos[i], u_mails[i], u_passwords[i], date_fr])
  }

  sql_insert = `INSERT INTO ARTICLES (a_user, a_score, a_reaction, a_date, a_link, a_title, a_sub, a_content) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  await db.run(sql_insert, [2, 0, 1, date_fr, "http://google.fr", "Mon nouveau moteur de recherche", "Web", "blablabla"])

  sql_insert = `INSERT INTO COMMENTS (c_article, c_user, c_content, c_score) VALUES (?, ?, ?, ?)`
  await db.run(sql_insert, [1, 1, "Excellent site pour faire des recherches!",1])

  sql_insert = `INSERT INTO VOTES (v_user, v_reference, v_date, v_kind, v_vote) VALUES (?, ?, ?, ?, ?)`
  await db.run(sql_insert, [2, 1, date, "comment", 1])

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
