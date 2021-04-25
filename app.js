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
  const email_input = req.session.email
  const signup = req.session.signup
  if(req.query.reset == "edit")
    req.session.edit = null

  const db = await openDb()

  const user = await db.get(`
    SELECT u_id, u_pseudo, u_password FROM USERS
    WHERE u_pseudo = ?
  `,[pseudo_input]);

  let data = {
    pseudo_error: 0,
    password_error: 0,
    login_request: 1,
    title: "Se connecter",
    action: "/login",
    pseudo: null,
    password: null
  }

  let succes_login = 0

  if (signup == 0){ // tentative de connexion
    if (user != undefined) { // le pseudo renseigné est dans la BDD
      if (user.u_password === password_input) {
      succes_login = 1
      req.session.u_id = user.u_id
      }
      else  // Le mot de passe ne correspond pas
        data.password_error = "Mot de passe erroné"
    }
    else{
      if (pseudo_input != undefined) // La session a en mémoire une tentative
        data.pseudo_error = 1
    }
  }

  else if (signup == 1){ // tentative d'inscription
    data.login_request = 0
    data.title = "S'inscrire"
    data.action = "/signup"
    if (user != undefined) // pseudo déjà utilisé
      data.pseudo_error = 2
    else if (email_input != null) { // on enregistre
      var date = new Date()
      var options = {weekday: "long", year: "numeric", month: "long", day: "2-digit", hour: "2-digit", minute: "2-digit"}
      date = date.toLocaleDateString("fr-FR", options)

      const sql_insert = `INSERT INTO USERS (u_pseudo, u_mail, u_password, u_connexion) VALUES (?, ?, ?, ?)`
      db.run(sql_insert,[pseudo_input, email_input, password_input, date])

      // On redirige vers la page de connexion
      data.login_request = 1
      data.title = "Bienvenue " + pseudo_input + ", vous pouvez vous connecter !"
      data.action = "/login"
      data.pseudo = pseudo_input
      data.password = password_input
    }
    // else on redirige vers la page d'enregistrement depuis la page de login
  }
  // else: première fois que l'on charge la page dans cette session

  if (succes_login === 1)
    res.redirect("home")
  else
    res.render("login", data)

  db.close()
})

// Affiche l'accueil
app.get("/home", async (req, res) => {
  const db = await openDb()

  const user = await db.get(`
    SELECT * FROM USERS
    WHERE u_id = ?
  `,[req.session.u_id]);

  const articles = await db.all(`
      SELECT a_id, a_user, a_score, a_reaction, a_date, a_title, v_vote, u_pseudo
      FROM ARTICLES
      JOIN VOTES
      ON a_id = v_reference
      JOIN USERS
      ON a_user = u_id
      WHERE v_user = ?
    UNION
      SELECT a_id, a_user, a_score, a_reaction, a_date, a_title, NULL as v_vote, u_pseudo
      FROM ARTICLES
      JOIN USERS
      ON a_user = u_id
      WHERE a_id NOT IN
          (SELECT a_id
          FROM ARTICLES
          JOIN VOTES
          ON a_id = v_reference
          JOIN USERS
          ON a_user = u_id
          WHERE v_user = ?)
    ORDER BY a_score DESC
    `, [req.session.u_id, req.session.u_id])


  // on trie en sommant le score des articles
  const subs = await db.all(`
    SELECT a_sub as title, SUM(a_score) as score
    FROM ARTICLES
    GROUP BY a_sub
    ORDER BY SUM(a_score) DESC
    `)

  db.close()

  const edit = req.session.edit
  res.render("home", {user, articles, edit, subs})
})

// Affiche la page de profils
app.get("/profils", async (req, res) =>{
  const db = await openDb()

  const user = await db.get(`
    SELECT * FROM USERS
    WHERE u_id = ?
  `,[req.session.u_id])

  const reacted = await db.all(`
    SELECT U.u_pseudo as owner, A.a_score as score, A.a_reaction as reaction,
    A.a_link as link, A.a_title as title, A.a_sub as sub
    FROM ARTICLES as A
    JOIN USERS as U
    ON A.a_user = U.u_id
    WHERE ( a_id IN
            (SELECT DISTINCT c_article FROM COMMENTS
            WHERE c_user = ?)
        OR
          a_id IN
            (SELECT v_reference FROM VOTES
            WHERE v_user = ?) )
  `, [user.u_id, user.u_id])

  const owned = await db.all(`
    SELECT a_score as score, a_reaction as reaction, a_link as link,
    a_title as title, a_sub as sub
    FROM ARTICLES
    WHERE a_user = ?
    `, user.u_id)

  db.close()

  res.render("profils", {user, owned, reacted})
})

// Affiche la page d'un article
app.get("/article/:id", async (req, res) => {
  if(req.query.reset == "edit")
    req.session.edit = null

  const db = await openDb()

  const article = await db.get(`
    SELECT a_id, a_user, a_score, a_reaction, a_date, a_link, a_title, a_sub,
    a_content, u_pseudo
    FROM ARTICLES
    JOIN USERS
    ON a_user = u_id
    WHERE a_id = ?
  `,[req.params.id])

  var related = await db.all(`
      SELECT a_id, a_title, a_user, a_score FROM ARTICLES
      WHERE (a_id != ? AND a_sub = ?)
      ORDER BY a_score DESC
    `)

  const comments = await db.all(`
      SELECT c_id, c_user, c_score, c_content, v_vote, u_pseudo
      FROM COMMENTS
      JOIN VOTES
      ON c_id = v_reference
      JOIN USERS
      ON c_user = u_id
      WHERE c_article = ? AND v_kind = "comment"
    UNION
      SELECT c_id, c_user, c_score, c_content, null as v_vote, u_pseudo
      FROM COMMENTS
      JOIN USERS
      ON c_user = u_id
      WHERE c_article = ? AND c_id NOT IN
          (SELECT c_id
          FROM COMMENTS
          JOIN VOTES
          ON c_id = v_reference
          JOIN USERS
          ON c_user = u_id
          WHERE c_article = ? AND v_kind = "comment")
    ORDER BY c_score DESC
    `, [req.params.id, req.params.id, req.params.id])

  const user = await db.get(`
    SELECT * FROM USERS
    WHERE u_id = ?
  `,[req.session.u_id])

  // vote de l'article
  vote = await db.get(`
    SELECT * FROM VOTES
    WHERE (v_user = ? AND v_reference = ? AND v_kind = ?)
  `, [user.u_id, req.params.id, "article"])

  db.close()
  const edit = req.session.edit

  res.render("article", {article, comments, vote, user, related, edit})
})

// Affiche la page d'une sous-catégorie
app.get("/sub/:name", async (req, res) => {
  const db = await openDb()

  const user = await db.get(`
    SELECT * FROM USERS
    WHERE u_id = ?
  `,[req.session.u_id])

  const articles = await db.all(`
    SELECT a_id, a_title, a_user, a_score, a_date, v_vote, u_pseudo
    FROM ARTICLES
    JOIN VOTES
    ON a_id = v_reference
    JOIN USERS
    ON a_user = u_id
    WHERE ( (a_sub = ?) AND (v_kind = "article") )
  UNION
    SELECT a_id, a_title, a_user, a_score, a_date, null as v_vote, u_pseudo
    FROM ARTICLES
    JOIN USERS
    ON a_user = u_id
    WHERE a_sub = ? AND a_id NOT IN
        (SELECT a_id
        FROM ARTICLES
        JOIN VOTES
        ON a_id = v_reference
        JOIN USERS
        ON a_user = u_id
        WHERE ( (a_sub = ?) AND (v_kind = "article") ) )
    ORDER BY a_score DESC
    `, [req.params.name, req.params.name, req.params.name])

  const sub = await db.get(`
    SELECT a_sub as title, a_date as creation
    FROM ARTICLES
    WHERE a_sub = ?
    ORDER BY a_id
  `,[req.params.name])

  db.close()

  const edit = req.session.edit

  res.render("sub", {user, articles, sub, edit})
})

// Enregistre le pseudo et le mot de passe entré
app.post("/login", (req, res) => {
  req.session.password = req.body.password_input
  req.session.pseudo = req.body.pseudo_input
  req.session.signup = 0
  res.redirect("/")
})

// Redirige vers la page d'enregistrement
app.post("/signin", (req, res) => {
  req.session.signup = 1
  res.redirect("/")
})

// Enregistre les données entrées pour une potentielle inscription
app.post("/signup", async (req, res) => {
  req.session.password = req.body.password_input
  req.session.pseudo = req.body.pseudo_input
  req.session.email = req.body.email_input
  req.session.signup = 1
  res.redirect("/")
})

// Prend en compte un vote
app.post("/:page/:id/vote/:change/:v_user/:v_reference/:v_kind/:v_vote/:new_score", async (req, res) => {
  const page = req.params.page
  const user = req.params.v_user
  const v_reference = req.params.v_reference
  const v_kind = req.params.v_kind
  const v_vote = req.params.v_vote
  const new_score = req.params.new_score
  const change = req.params.change
  const id = req.params.id

  const db = await openDb()
  if (change === "new"){ // première fois que l'utilisateur vote l'article ou le commentaire
    await db.run(`
    INSERT INTO VOTES (v_user, v_reference, v_kind, v_vote) VALUES (?, ?, ?, ?)
  `,[user, v_reference, v_kind, v_vote])
  }

  else if (change === "udapte"){  // l'utilisateur change son vote
    await db.run(`
    UPDATE VOTES
    SET v_vote = ?
    WHERE (v_user = ? AND v_reference = ? AND v_kind = ?)
  `,[v_vote, user, v_reference, v_kind])
}
  else{ // l'utilisateur supprime son vote
    await db.run(`
    DELETE FROM VOTES
    WHERE (v_user = ? AND v_reference = ? AND v_kind = ?)
    `,[user, v_reference, v_kind])
  }

  if (v_kind === "article"){ // on met à jour la table ARTICLES
    await db.run(`
    UPDATE ARTICLES
    SET a_score = ?
    WHERE a_id = ?
  `,[new_score, v_reference])
  }

  else { // on met à jour la table COMMENTS
    await db.run(`
    UPDATE COMMENTS
    SET c_score = ?
    WHERE c_id = ?
  `,[new_score, v_reference])
  }


  db.close()

  let path
  if (page == "home")
    path = "/home"
  else if (page == "article")
    path = "/article/"+id
  else if (page == "sub")
    path = "/sub/"+id
  res.redirect(path)
})

// Nouvel article ou commentaire de l'utilisateur
app.post("/:page/:id/new", async (req, res) => {
  const pseudo = req.session.pseudo
  const title = req.body.title
  const link = req.body.link
  const sub = req.body.sub
  const content = req.body.content
  const id = req.params.id

  var date = new Date();
  var options = {weekday: "long", year: "numeric", month: "long", day: "2-digit", hour: "2-digit", minute: "2-digit"};
  date = date.toLocaleDateString("fr-FR", options)

  const db = await openDb()

  if (sub != undefined){ // l'utilisateur écrit un nouveau post
    await db.run(`
    INSERT INTO ARTICLES (a_user, a_score, a_reaction, a_date, a_link, a_title, a_sub, a_content) VALUES (?, 0, 0, ?, ?, ?, ?, ?)
  `,[req.session.u_id, date, link, title, sub, content])
  }
  else{ // l'utilisateur écrit un nouveau commentaire
    await db.run(`
    INSERT INTO COMMENTS (c_article, c_user, c_content, c_score) VALUES (?, ?, ?, 0)
  `,[id, req.session.u_id, content])
  }

  let path
  if (id == 0)
    path = "/home"
  else
    path = "/article/"+id
  res.redirect(path)
})

// Edite un article ou un commentaire de l'utilisateur
app.post("/:page/:page_id/edite/:kind/:target_id/:status", async (req, res) => {
  const db = await openDb()
  if (req.params.kind == "article"){
    if (req.params.status == "processing"){
      const article = await db.get(`
        SELECT a_title, a_link, a_content, a_sub FROM ARTICLES
        WHERE a_id = ?
      `, [req.params.target_id])

      req.session.edit = {
        kind: req.params.kind,
        id: req.params.target_id,
        title: article.a_title,
        link: article.a_link,
        content: article.a_content,
        sub: article.a_sub
      }
    }
    else if (req.params.status == "saved"){ //on enregistre les modifications
      if (req.params.page == "sub") // on ne change pas de catégorie depuis la page des catégories
        req.body.sub = req.params.page_id

      await db.run(`
      UPDATE ARTICLES
      SET a_title = ?, a_link = ?, a_sub = ?, a_content = ?
      WHERE a_id = ?
    `,[req.body.new_title, req.body.link, req.body.sub, req.body.content, req.session.edit.id])

      req.session.edit = null
    }
    else if (req.params.status == "del"){ // on supprime l'article et les commentaires associés
      await db.run(`
        DELETE FROM ARTICLES
        WHERE a_id = ?
      `,[req.session.edit.id])

      await db.run(`
        DELETE FROM COMMENTS
        WHERE c_article = ?
      `,[req.session.edit.id])

      req.session.edit = null
    }
    else if (req.params.status == "cancel")// on ne prend pas en compte les modifications (bouton "annuler")
      req.session.edit = null
  }
  else{ // commentaire
    if (req.params.status == "processing"){
      const comment = await db.get(`
        SELECT c_article, c_user, c_content FROM COMMENTS
        WHERE c_id = ?
      `, [req.params.target_id])

      req.session.edit = {
        kind: req.params.kind, // est-ce utile ?
        id: req.params.target_id,
        article: comment.c_article,
        owner: comment.c_user,
        content: comment.c_content
      }
    }
    else if (req.params.status == "saved"){ //on enregistre les modifications
      await db.run(`
      UPDATE COMMENTS
      SET c_content = ?
      WHERE c_id = ?
    `,[req.body.content, req.session.edit.id])

      req.session.edit = null
    }
    else if (req.params.status == "del"){ // on supprime le commentaire
      await db.run(`
        DELETE FROM COMMENTS
        WHERE c_id = ?
      `,[req.session.edit.id])

      req.session.edit = null
    }
    else if (req.params.status == "cancel")// on ne prend pas en compte les modifications (bouton "annuler")
      req.session.edit = null
  }

  db.close()

  let path
  if (req.params.page == "article"){
    if ( (req.params.kind == "comment") || (req.params.kind == "article") ){
      path = "/article/"+req.params.page_id
      if ( (req.params.kind == "article") && (req.params.status == "del") )
        path = "/home"
    }
  }
  else if (req.params.page == "sub")
    path = "/sub/"+req.params.page_id

  else
    path = "/home"

  res.redirect(path)
})

// Suppression d'un article ou d'un commentaire de l'utilisateur
app.post("/:page/:page_id/del/:kind/:target_id", async (req, res) => {

  const db = await openDb()
  if (req.params.kind === "article"){
    await db.run(`
      DELETE FROM ARTICLES
      WHERE a_id = ?
    `,[req.params.target_id])

    // Supprime les commentaires votés dans VOTES
    await db.run(`
      DELETE FROM VOTES
      WHERE v_reference IN
      	(SELECT c_id FROM COMMENTS
      	WHERE c_article = ?)
    `, [req.params.target_id])

    // Supprime les commentaires
    await db.run(`
      DELETE FROM COMMENTS
      WHERE c_article = ?
    `,[req.params.target_id])
  }
  else {
    await db.run(`
      DELETE FROM COMMENTS
      WHERE c_id = ?
    `,[req.params.target_id])
  }

  // Supprime la référence cible de la table VOTES
  await db.run(`
    DELETE FROM VOTES
    WHERE v_reference = ?
  `, [req.params.target_id])

  let path

  if (req.params.kind == "comment")
    path = "/article/"+req.params.page_id
  else if (req.params.page == "sub")
    path = "/sub/"+req.params.page_id
  else if ((req.params.page == "home") || (req.params.kind == "article"))
    path = "/home"

  res.redirect(path)
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
