const express = require('express');
const bodyParser = require('body-parser');
const app = express()
const port = 3000

app.set('views', './views');
app.set('view engine', 'jade');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json())

const session = require('express-session')
const SQLiteStore = require('connect-sqlite3')(session);

const {openDb} = require("./db");

const sess = {
  store: new SQLiteStore,
  secret: 'secret key',
  resave: true,
  rolling: true,
  cookie: {
    maxAge: 1000 * 3600//ms
  },
  saveUninitialized: true
}
app.use(session(sess))



// Affiche la page de connexion
app.get("/", async (req, res)=>{
  const pseudo_input = req.session.pseudo
  const password_input = req.session.password

  const db = await openDb()

  const user = await db.get(`
    SELECT u_id, u_pseudo, u_password FROM USERS
    WHERE u_pseudo = ?
  `,[pseudo_input]);

  let data = {
    pseudo_error: 0,
    password_error: 0,
    mail_error: 0,
    signup: 0
  }

  let succes_login = 0

  if (user != undefined) { // le pseudo renseigné est dans la BDD
    if (user.u_password === password_input) {
    succes_login = 1
    req.session.u_id = user.u_id
    }
    else  // Le mot de passe ne correspond pas
      data.password_error = 1
  }
  else{
    if (pseudo_input != undefined) // La session a en mémoire une tentative
      data.pseudo_error = 1
  }


  if (succes_login === 1)
    res.redirect("home")
  else
    res.render("login", data)

  db.close()
});


app.get("/home", async (req, res) => {
  const db = await openDb()

  const user = await db.get(`
    SELECT * FROM USERS
    WHERE u_id = ?
  `,[req.session.u_id]);

  db.close()
  res.render("home", user)
})


// Enregistre le pseudo et le mot de passe entré
app.post("/login", (req, res) => {
  req.session.password = req.body.password_input
  req.session.pseudo = req.body.pseudo_input
  res.redirect("/")
})


// Enregistre la date et l'heure, et se deconnecte
app.post("/deconnexion", async (req, res) => {
  const db = await openDb()
  const user = await db.get(`
    SELECT * FROM USERS
    WHERE u_pseudo = ?
  `,[req.session.pseudo]);
  var date = new Date()
  var options = {weekday: "long", year: "numeric", month: "long", day: "2-digit", hour: "2-digit", minute: "2-digit"};
  date = date.toLocaleDateString("fr-FR", options)
  await db.run(`
  UPDATE USERS
  SET u_connexion = ?
  WHERE u_id = ?
`,[date, user.u_id])

  db.close()
  req.session.password = null
  req.session.pseudo = null
  res.redirect("/")
})




app.listen(port,() => {
  console.log("Redditeirb sur le port", port)
})
