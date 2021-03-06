const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;

app.set('views', './views');
app.set('view engine', 'jade');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
var path = require('path');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, '../public')));

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
  if(req.query.reset == "edit")
    req.session.edit = null
  const db = await openDb()

  const user = await db.get(`
    SELECT * FROM USERS
    WHERE u_id = ?
  `,[req.session.u_id]);

  const votes = await db.all(`SELECT * FROM VOTES WHERE v_user = ` + req.session.u_id)

  const favorites = await db.all(`SELECT f_article FROM FAVORITES WHERE f_user = ?`, req.session.u_id)

  var interactions = await db.all(`SELECT * FROM INTERACTIONS`)

  const current = new Date()

  // Mets à jour la table des intéractions en enlevant les actions de plus de 24h
  var options = {weekday: "long", year: "numeric", month: "long", day: "2-digit", hour: "2-digit", minute: "2-digit"};

  for (var i = 0; i < interactions.length; i++) {
    if((current - interactions[i].i_date)/(1000*60*60*24) > 1){
      await db.run(`DELETE FROM INTERACTIONS WHERE i_date = `+interactions[i].i_date)
    }
  }
  interactions = await db.all(`SELECT i_article, COUNT(*) as a_interaction FROM INTERACTIONS GROUP BY i_article ORDER BY a_interaction DESC`)

  const articles = new Array()
  const date_option = {weekday: "long", year: "numeric", month: "long", day: "2-digit", hour: "2-digit", minute: "2-digit"};
  var article
  var vote
  var favorite

  for (var i = 0; i < interactions.length; i++) {
    article = await db.get(`
      SELECT a_id, a_user, a_score, a_reaction, a_date, a_title, null as v_vote, u_pseudo, null as favorite, null as a_interaction
      FROM ARTICLES
      JOIN USERS
      ON a_user = u_id
      WHERE a_id = ?
    `, [interactions[i].i_article])

    vote = await db.get(`
      SELECT v_vote
      FROM VOTES
      WHERE v_user = ? AND v_reference = ? AND v_kind = "article"
      `, [req.session.u_id, interactions[i].i_article])

    if (vote != undefined){
      article.v_vote = vote.v_vote
    }

    favorite = await db.get(`
      SELECT f_article
      FROM FAVORITES
      WHERE f_user = ? AND f_article = ?
      `, [req.session.u_id, interactions[i].i_article])

    if (favorite != undefined){
      article.favorite = 1
    }

    article.a_interaction = interactions[i].a_interaction
    article.a_date = new Date(article.a_date).toLocaleDateString("fr-FR", date_option)
    articles.push(article)
  }

  // Les sub où l'utilisateur est engagé et dans lesquels il y a eu de l'activité durant les 24 dernières heures

  const interested_sub = await db.all(`
    SELECT a_sub, COUNT(i_article) as user_score
    FROM INTERACTIONS
    JOIN ARTICLES
    ON i_article = a_id
    WHERE i_user = ?
    GROUP BY a_sub
    ORDER BY user_score DESC
    `, [req.session.u_id])

  var subs = new Array()
  var sub
  for (var i = 0; i < interested_sub.length; i++) {
    sub = await db.get(`
      SELECT a_sub as title, COUNT(i_article) as score
      FROM INTERACTIONS
      JOIN ARTICLES
      ON i_article = a_id
      WHERE a_sub = ?
      `, [interested_sub[i].a_sub])
    sub.score = sub.score - interested_sub[i].user_score
    if (sub.score > 0)
      subs.push(sub)
  }

  db.close()

  const edit = req.session.edit
  res.render("home", {user, articles, edit, subs})
})

// Affiche la page de profils
app.get("/profils", async (req, res) =>{
  if(req.query.reset == "edit")
    req.session.edit = null
  const db = await openDb()

  const user = await db.get(`
    SELECT * FROM USERS
    WHERE u_id = ?
  `,[req.session.u_id])

  const comments_in_reacted = await db.all(`
    SELECT c_id, a_id, c_content, c_score, v_vote
		  FROM ARTICLES
		  JOIN COMMENTS
		  ON a_id = c_article
		  JOIN VOTES
		  ON v_reference = c_id
		  WHERE c_user = ? AND a_user != ?
UNION
	SELECT c_id, a_id, c_content, c_score, null as v_vote
	  FROM ARTICLES
		  JOIN COMMENTS
		  ON a_id = c_article
		  WHERE c_user = ? AND a_user != ? AND c_id NOT IN
		  (SELECT c_id
		  FROM ARTICLES
		  JOIN COMMENTS
		  ON a_id = c_article
      JOIN VOTES
		  ON v_reference = c_id
		  WHERE c_user = ? AND a_user != ?
		  )
    ORDER BY a_id, c_id DESC
      `, [req.session.u_id, req.session.u_id, req.session.u_id, req.session.u_id, req.session.u_id, req.session.u_id])

  const reacted = await db.all(`
    SELECT u_id, u_pseudo, a_id, a_score, a_reaction, a_link, a_title, a_sub, a_date, v_vote, v_date, null as favorite
      FROM ARTICLES
      JOIN USERS
      ON a_user = u_id
      JOIN VOTES
      ON a_id = v_reference
      WHERE v_user = ? AND u_id != ?
  UNION
    SELECT u_id, u_pseudo, a_id, a_score, a_reaction, a_link, a_title, a_sub, a_date, null as v_vote, null as v_date, null as favorite
      FROM ARTICLES
      JOIN USERS
      ON a_user = u_id
      WHERE a_id NOT IN
          (SELECT a_id
            FROM ARTICLES
            JOIN USERS
            ON a_user = u_id
            JOIN VOTES
            ON a_id = v_reference
            WHERE v_user = ? AND u_id != ?)
        AND a_id IN
          (SELECT a_id
            FROM ARTICLES
            JOIN COMMENTS
            ON a_id = c_article
            WHERE c_user = ?)
        AND u_id != ?
  ORDER BY v_date DESC
  `, [user.u_id, user.u_id, user.u_id, user.u_id, user.u_id, user.u_id])

  const owned = await db.all(`
      SELECT DISTINCT a_id, a_score, a_reaction, a_date, a_title, v_vote, a_user, null as favorite
        FROM ARTICLES
        JOIN VOTES
        ON a_id = v_reference
        WHERE a_user = ? AND v_reference = a_id AND v_kind = "article"
    UNION
    	SELECT DISTINCT a_id, a_score, a_reaction, a_date, a_title, null as v_vote, a_user, null as favorite
      	FROM ARTICLES
      	WHERE a_user = ? AND a_id NOT IN
      		(SELECT DISTINCT a_id
      		FROM ARTICLES
      		JOIN VOTES
      		ON a_id = v_reference
      		WHERE a_user = ? AND v_reference = a_id AND v_kind = "article")
    ORDER BY a_id DESC
      `, [req.session.u_id, req.session.u_id, req.session.u_id])

  const comments_in_owned = await db.all(`
    SELECT c_id, a_id, a_date, c_content, c_score, v_vote
		  FROM ARTICLES
		  JOIN COMMENTS
		  ON a_id = c_article
		  JOIN VOTES
		  ON v_reference = c_id
		  WHERE c_user = ? AND a_user = ?
UNION
	SELECT c_id, a_id, a_date, c_content, c_score, null as v_vote
	  FROM ARTICLES
		  JOIN COMMENTS
		  ON a_id = c_article
		  WHERE c_user = ? AND a_user = ? AND c_id NOT IN
		  (SELECT c_id
		  FROM ARTICLES
		  JOIN COMMENTS
		  ON a_id = c_article
      JOIN VOTES
		  ON v_reference = c_id
		  WHERE c_user = ? AND a_user = ?
		  )
    ORDER BY a_id DESC, c_id DESC
      `, [req.session.u_id, req.session.u_id, req.session.u_id, req.session.u_id, req.session.u_id, req.session.u_id])

  const favorites = await db.all(`
    SELECT f_article
    FROM FAVORITES
    WHERE f_user = ?
    `, req.session.u_id)


  const date_option = {weekday: "long", year: "numeric", month: "long", day: "2-digit", hour: "2-digit", minute: "2-digit"};

  for (var i = 0; i < owned.length; i++) {
    for (var j = 0; j < favorites.length; j++) {
      if(favorites[j].f_article == owned[i].a_id){
        owned[i].favorite = 1
        favorites.splice(j, 1)
      }
    }
    owned[i].a_date = new Date(owned[i].a_date).toLocaleDateString("fr-FR", date_option)
  }

  for (var i = 0; i < reacted.length; i++) {
    for (var j = 0; j < favorites.length; j++) {
      if(favorites[j].f_article == reacted[i].a_id){
        reacted[i].favorite = 1
        favorites.splice(j, 1)
      }
    }
    reacted[i].a_date = new Date(reacted[i].a_date).toLocaleDateString("fr-FR", date_option)
  }

  db.close()

  const edit = req.session.edit
  res.render("profils", {user, owned, reacted, edit, comments_in_reacted, comments_in_owned})
})

// Affiche la page des favoris
app.get("/favoris", async (req, res) =>{
  if(req.query.reset == "edit")
    req.session.edit = null
  const db = await openDb()

  const user = await db.get(`
    SELECT * FROM USERS
    WHERE u_id = ?
  `,[req.session.u_id])

  const articles = await db.all(`
      SELECT a_id, a_user, a_score, a_reaction, a_date, a_title, v_vote, u_pseudo, f_date
      FROM ARTICLES
      JOIN VOTES
      ON a_id = v_reference
      JOIN USERS
      ON a_user = u_id
      JOIN FAVORITES
      ON a_id = f_article
      WHERE f_user = ?
    UNION
      SELECT a_id, a_user, a_score, a_reaction, a_date, a_title, NULL as v_vote, u_pseudo, f_date
      FROM ARTICLES
      JOIN USERS
      ON a_user = u_id
      JOIN FAVORITES
      ON a_id = f_article
      WHERE a_id NOT IN
          (SELECT a_id
          FROM ARTICLES
          JOIN VOTES
          ON a_id = v_reference
          JOIN USERS
          ON a_user = u_id
          JOIN FAVORITES
          ON a_id = f_article
          WHERE f_user = ?) AND f_user = ?
    ORDER BY f_date DESC
    `, [req.session.u_id, req.session.u_id, req.session.u_id])

  const edit = req.session.edit
  db.close()
  res.render("favorites", {user, articles, edit})
})

// Affiche la page d'un article
app.get("/article/:id", async (req, res) => {
  if(req.query.reset == "edit")
    req.session.edit = null

  const db = await openDb()

  var article = await db.get(`
    SELECT a_id, a_user, a_score, a_reaction, a_date, a_link, a_title, a_sub,
    a_content, u_pseudo, null as favorite
    FROM ARTICLES
    JOIN USERS
    ON a_user = u_id
    WHERE a_id = ?
  `,[req.params.id])

  var options = {weekday: "long", year: "numeric", month: "long", day: "2-digit", hour: "2-digit", minute: "2-digit"};
  article.a_date = new Date(article.a_date).toLocaleDateString("fr-FR", options)

  const favorite = await db.get(`
    SELECT f_article
    FROM FAVORITES
    WHERE f_user = ? AND f_article = ?
    `, req.session.u_id, req.params.id)

  if (favorite != undefined)
    article.favorite = 1

  var related = await db.all(`
      SELECT a_id, a_title, a_user, a_score, u_pseudo
      FROM ARTICLES
      JOIN USERS
      ON a_user = u_id
      WHERE (a_id != ? AND a_sub = ?)
      ORDER BY a_score DESC
      LIMIT 10
    `, [article.a_id, article.a_sub])

    const comments = await db.all(`
          SELECT c_id, c_user, c_score, c_content, v_vote, u_pseudo
          FROM COMMENTS
          JOIN VOTES
          ON c_id = v_reference
          JOIN USERS
          ON c_user = u_id
          WHERE c_article = ? AND v_kind = "comment" AND c_user = ?
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
              WHERE c_article = ? AND v_kind = "comment" AND c_user = ?)
        ORDER BY c_score DESC
        `, [req.params.id, req.session.u_id, req.params.id, req.params.id, req.session.u_id])

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
  if(req.query.reset == "edit")
    req.session.edit = null
  const db = await openDb()

  const user = await db.get(`
    SELECT * FROM USERS
    WHERE u_id = ?
  `,[req.session.u_id])

  const articles = await db.all(`
    SELECT a_id, a_title, a_user, a_score, a_date, a_reaction, v_vote, u_pseudo
    FROM ARTICLES
    JOIN VOTES
    ON a_id = v_reference
    JOIN USERS
    ON a_user = u_id
    WHERE ( (a_sub = ?) AND (v_kind = "article") )
  UNION
    SELECT a_id, a_title, a_user, a_score, a_date, a_reaction, null as v_vote, u_pseudo
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

  const favorites = await db.all(`
    SELECT f_article
    FROM FAVORITES
    WHERE f_user = ?
    `, req.session.u_id)

  const date_option = {weekday: "long", year: "numeric", month: "long", day: "2-digit", hour: "2-digit", minute: "2-digit"}

  for (var i = 0; i < articles.length; i++) {
    for (var j = 0; j < favorites.length; j++) {
      if(favorites[j].f_article == articles[i].a_id){
        articles[i].favorite = 1
        favorites.splice(j, 1)
      }
    }
    articles[i].a_date = new Date(articles[i].a_date).toLocaleDateString("fr-FR", date_option)
  }

  var sub = await db.get(`
    SELECT a_sub as title, a_date as last
    FROM ARTICLES
    WHERE a_sub = ?
    ORDER BY a_id DESC
  `,[req.params.name])

  sub.last = new Date(sub.last).toLocaleDateString("fr-FR", date_option)

  db.close()

  const edit = req.session.edit

  res.render("sub", {user, articles, sub, edit})
})

// Recherche les articles d'un utilisateur
app.get("/search_user/:u_pseudo", async (req, res) => {
  req.session.edit = null
  const db = await openDb()
  const user = await db.get(`SELECT * FROM USERS WHERE u_id = ?`, [req.session.u_id])
  const articles = await db.all(`
    SELECT *
    FROM ARTICLES
    JOIN USERS
    ON a_user = u_id
    WHERE u_pseudo = ?
    `, [req.params.u_pseudo])
  const header="Recherche des posts publiés par '"+req.params.u_pseudo+"'"

  const date_option = {weekday: "long", year: "numeric", month: "long", day: "2-digit", hour: "2-digit", minute: "2-digit"};
  for (var i = 0; i < articles.length; i++) {
    articles[i].a_date = new Date(articles[i].a_date).toLocaleDateString("fr-FR", date_option)
  }
  db.close()
  res.render("result", {user, articles, header})
})

// Modifie un favoris sans changer de page
app.get("/:page/:p_id/favorite/:a_id", async (req, res) => {
  const db = await openDb()
  const favorite = await db.get(`
    SELECT f_article
    FROM FAVORITES
    WHERE f_user = ? AND f_article = ?`
  , [req.session.u_id, req.params.a_id])

  if (favorite == undefined)    // on met l'article en favoris
    await db.run(`
    INSERT INTO FAVORITES (f_user, f_article, f_date) VALUES (?, ?, ?)
  `, [req.session.u_id, req.params.a_id, new Date()])
  else                         // on supprimer l'article des favoris
    await db.run(`
      DELETE FROM FAVORITES
      WHERE f_user = ? AND f_article = ?
      `, [req.session.u_id, req.params.a_id])

  db.close()

  if (req.params.page == "home")
    var path = "/home"
  else if (req.params.page == "article")
    var path = "/article/"+req.params.p_id
  else if (req.params.page == "sub")
    var path = "/sub/"+req.params.p_id
  else if (req.params.page == "profils")
    var path = "/profils"
  res.redirect(path)
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
    const date = new Date();
    await db.run(`
    INSERT INTO VOTES (v_user, v_reference, v_date, v_kind, v_vote) VALUES (?, ?, ?, ?, ?)
  `,[user, v_reference, date, v_kind, v_vote])
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

  // Met à jour les intéractions
  if (v_kind == "article"){
    if(v_vote == 1){
      await db.run(`INSERT INTO INTERACTIONS (i_article, i_user, i_ref, i_date) VALUES (?, ?, ?, ?)`, [v_reference, user, "vote", new Date()])
    }
    else if (change == "cancel"){
      await db.run(`DELETE FROM INTERACTIONS WHERE i_article = ? AND i_ref = "vote" AND i_user = ?`, [v_reference, user])
    }
  }

  db.close()

  let path
  if (page == "home")
    path = "/home"
  else if (page == "article")
    path = "/article/"+id
  else if (page == "sub")
    path = "/sub/"+id
  else if (page == "profils")
    path = "/profils"
  else if (page == "favorites")
    path = "/favoris"
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

  const db = await openDb()

  if (sub != undefined){ // l'utilisateur écrit un nouveau post
    await db.run(`
    INSERT INTO ARTICLES (a_user, a_score, a_reaction, a_date, a_link, a_title, a_sub, a_content) VALUES (?, 0, 0, ?, ?, ?, ?, ?)
  `,[req.session.u_id, date, link, title, sub, content])
  }
  else{ // l'utilisateur écrit un nouveau commentaire
    const comment = await db.run(`
    INSERT INTO COMMENTS (c_article, c_user, c_content, c_score) VALUES (?, ?, ?, 0)
  `,[id, req.session.u_id, content])

  await db.run(`
    UPDATE ARTICLES
    SET a_reaction = a_reaction + 1
    WHERE a_id = ?
  `, [id])

  await db.run(`INSERT INTO INTERACTIONS (i_article, i_user, i_ref, i_date) VALUES (?, ?, ?, ?)`, [id, req.session.u_id, comment.lastID,new Date()])

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
    else if (req.params.status == "del"){ // on supprime l'article, les commentaires associés et les intéractions
      await db.run(`
        DELETE FROM ARTICLES
        WHERE a_id = ?
      `,[req.session.edit.id])

      await db.run(`
        DELETE FROM COMMENTS
        WHERE c_article = ?
      `,[req.session.edit.id])

      await db.run(`DELETE FROM INTERACTIONS WHERE i_article = ?`, [req.params.target_id])

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
        kind: req.params.kind,
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

      await db.run(`DELETE FROM INTERACTIONS WHERE i_ref = `+ req.session.edit.id)

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
  else if (req.params.page == "profils")
    path = "/profils"
  else if (req.params.page == "favorites")
    path = "/favoris"
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

    // Supprime l'article des favoris
    await db.run(`
      DELETE FROM FAVORITES
      WHERE f_article = ?
    `,[req.params.target_id])

    // Supprime les intéractions de l'article
    await db.run(`DELETE FROM INTERACTIONS WHERE i_article = ?`, [req.params.target_id])
  }
  else { // Supprime un seul commentaire
    await db.run(`
      DELETE FROM COMMENTS
      WHERE c_id = ?
    `,[req.params.target_id])

    await db.run(`
      UPDATE ARTICLES
      SET a_reaction = a_reaction - 1
      WHERE a_id = ?
    `, [req.params.page_id])

    await db.run(`DELETE FROM INTERACTIONS WHERE i_ref = ` + req.params.target_id)
    }

  // Supprime la référence cible de la table VOTES
  await db.run(`
    DELETE FROM VOTES
    WHERE v_reference = ?
  `, [req.params.target_id])

  let path

  if ( (req.params.kind == "comment") && (req.params.page == "article") )
    path = "/article/"+req.params.page_id
  else if (req.params.page == "sub")
    path = "/sub/"+req.params.page_id
  else if (req.params.page == "profils")
    path = "/profils"
  else if ((req.params.page == "home") || (req.params.kind == "article"))
    path = "/home"
  if (req.params.page == "favorites")
    path = "/favoris"

  res.redirect(path)
})

app.post("/search", async (req, res) => {
  const db = await openDb()

  const user = await db.get(`
    SELECT * FROM USERS
    WHERE u_pseudo = ?
  `,[req.session.pseudo]);

  let search_choice = req.body.search_choice

  // construit une requête de recherche selon les mots passés en argument

  const input = req.body.search_input
  const key_words = input.split(' ')

  sql_request=`SELECT a_id, a_user, a_title, a_score, a_reaction, a_date, a_link, a_sub, a_content, u_pseudo, null as favorite FROM ARTICLES JOIN USERS ON u_id = a_user WHERE `
  if (search_choice == "a_user"){
    search_choice = "u_pseudo"
  }

  sql_request += search_choice+` LIKE '`+key_words[0]+`%'`

  for (var i = 1; i < key_words.length; i++) {
    sql_request += ` OR `+search_choice+` LIKE '`+key_words[i]+`%'`
  }

  sql_request += ` ORDER BY a_id DESC`

  // exécute la requête
  const articles = await db.all(sql_request)
  const date_option = {weekday: "long", year: "numeric", month: "long", day: "2-digit", hour: "2-digit", minute: "2-digit"};

  const favorites = await db.all(`
    SELECT f_article
    FROM FAVORITES
    WHERE f_user = ?
    `, req.session.u_id)

  for (var i = 0; i < articles.length; i++) {
    for (var j = 0; j < favorites.length; j++) {
      if(favorites[j].f_article == articles[i].a_id){
        articles[i].favorite = 1
        favorites.splice(j, 1)
      }
    }
    articles[i].a_date = new Date(articles[i].a_date).toLocaleDateString("fr-FR", date_option)
  }

  switch (search_choice) {
    case "a_title":
      header="Recherche avec '"+input+"' comme titre des posts"
      break;
    case "u_pseudo":
      header="Recherche des posts publiés par '"+input+"'"
      break;
    case "a_sub":
      header="Recherche pour la catégorie '"+input+"'"
      break;
    case "a_content":
      header="Recherche les posts traitant de '"+input+"'"
      break
    default:
      header="Erreur POST search"
      break
  }

  if (articles.length == 0)
    header="La r"+header.slice(1)+" n'a rien donné..."

  res.render("result", {articles, user, header})
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
