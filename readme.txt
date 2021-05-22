                  🏗️ 🏗️ 🏗️ Déploiement 🏗️ 🏗️ 🏗️
-------------------------------------------------------------------

node install.js : (ré)initialise la base de donnée
node app.js     : lance le site sur le port 3000




                  ⚙️⚙️⚙️ FONCTIONNALITÉS ⚙️⚙️⚙️
-------------------------------------------------------------------

L'authentification ✅

Première page rencontrée par tout utilisateur non connecté. On peut
s'enregistrer ou accéder à son compte. Lorsque l'on s'enregistre,
les champs d'identification sont complétés automatiquement.


La barre de navigation 🔎

Présente en haut de toute les pages du site (à l'exception de
celles permettant de s'authentifier).
	- À gauche:  un raccourci vers la page d'accueil.
	- Au milieu: un champ permettant de rechercher des posts
		     suivant son titre, sa catégorie, son auteur,
		     ou encore son contenu.
	- À droite:  un accès au profil et un bouton pour se
		     déconnecter.

Lorsque l'on fait défiler une page, cette barre reste fixée.


La page d'accueil 🏠

En haut, l'utilisateur peut publier un nouveau post contenant un 
titre, un lien web, une catégorie et un contenu. Il peut agrandir
ou réduire à sa guise le dernier champ. La publication se fait via
le bouton "Publier" sur la droite.

En dessous, la page se divise en deux:
	- À gauche: la liste des posts populaires sur les dernières
		    24 heures. Le score de popularité utilisé pour 
		    les ordonner est la somme des nouveaux votes et 
		    des nouveaux commentaires
	- À droite: un ensemble de catégories commentés par l'utili-
		    sateur dont d'autres utilisateurs ont réagis du-
		    rant ces dernières 24 heures. Ils sont rassem-
		    blés par catégorie (sub-reddit).
		    A cela s'ajoute une aide à la navigation pour
		    remonter ou descendre dans la page.
		    Cet ensemble est fixé.


Les posts 📑

L'utilisateur peut accéder à un post de différentes manières:
depuis la page d'accueil si ce dernier est populaire, par une
recherche, depuis son profil s'il a déjà intéragi avec celui-ci
ou depuis un autre post possédant la même catégorie (sub-reddit).

Il peut commenter autant de fois qu'il le souhaite.

Si il est l'auteur du post, il peut modifier ou supprimer son post.
En cas de suppression d'un post, tous les commentaires votes et
favoris relatifs sont supprimés de la base de données.


Les commentaires 💬

Depuis la page d'un post, tout utilisateur peut commenter autant de
fois qu'il le souhaite.

À tout moment il peut éditer ou supprimer un de ses commentaires,
soit depuis la page du post concerné, soit depuis son profil. Auquel
cas, les votes associés à son commentaire sont également supprimés


Les votes 👎 / 👍

Pour chaque post et commentaire présenté à l'utilisateur, ce dernier
à la possibilité de voter. Il peut retirer son vote et le modifier à
tout moment. Enfin, suivant son vote, le fond affichant le score
global du poste ou du commentaire concerné change de couleur.


Les favoris ⭐

Au niveau de chaque post, une étoile est présente. Lorsqu'elle est
coloriée, le post est marqué comme favoris et est accessible depuis
le profil de l'utilisateur.


Le profil 👤

Accessible depuis la barre de navigation à côté du du bouton decon-
nexion. L'utilisateur trouve deux listes de posts:
	- Les posts dont il est l'auteur
	- Les posts auxquels il a réagit (vote ou commentaire)
Elles sont triées de manière anti-chronologique.

Pour tous ces posts, si l'utilisateur a commenté, l'ensemble de ses
commentaires sont affichés en-dessous du post concerné.

L'utilisateur peut directement voter (ainsi qu'éditer et supprimer
s'il est l'auteur) les posts affichés.

Sur le côté, l'utilisateur trouve divers statistiques le concernant
sur ce site ainsi qu'un lien le conduisant vers l'ensemble des ses 
posts favoris.




      ❌ ❌ ❌ FONCTIONNALITÉS MANQUANTES / DÉFAUTS ❌ ❌ ❌
-------------------------------------------------------------------

Dans la page du profil, dans la rubrique "vos posts les plus récents",
le dernier post a son bouton downvote défectueux: on a du mal à cliquer
dessus.

Depuis la page affichant l'ensemble des posts d'une catégorie, on ne
peut pas supprimer directement un post si celui-ci est le seul de sa
catégorie.

L'interaction avec les posts depuis la page de recherche est limitée à
un lien conduisant vers les pages spécifiques à ces posts (pas d'édition,
de suppression ou de votes possible). La raison est qu'une interaction
recharge la page. Il aurait donc fallu enregistrer la requête de l'utili-
sateur pour rendre ces fonctionnalités valides.




                  📁 📁 📁 ARCHITECTURE 📁 📁 📁
-------------------------------------------------------------------

src/public/DDLC_mirror.png   : image à gauche de la barre de recherche
src/pubic/ENSEIRB-MATMECA.pg : image à droite de la précédente
src/public/favicon.png       : utilisée sur l'onglet du navigateur
src/public/favorite.png      : utilisée pour un post favori
src/public/footer_illustration.svg : utilisée sur la page d'accueil
src/public/not_favorite.png  : utilisée pour un post non favori

src/views/CSS/article.css : css additionnels pour les pages des posts
src/views/CSS/general.css : css de base, commun à toutes les pages
src/views/CSS/home.css    : css de l'accueil
src/views/CSS/layout.css  : css du layout (la barre de recherche)
src/views/CSS/login.css   : css pour se connecter/s'enregistrer
src/views/CSS/profils.css : css du profil
src/views/CSS/result.css  : css lorsque l'on affiche les résultats
src/views/CSS/sub.css     : css de la page des catégories

src/views/article.jade  : affichage de la page d'un post
src/views/favorite.jade : (affichage) de l'ensemble des posts favoris
src/views/home.jade     : l'accueil
src/views/layout.jade   : la barre de recherche
src/views/login.jade    : la connexion et l'inscription
src/views/profils.jade  : le profil de l'utilisateur
src/views/result.jade   : les résultats effectués par une recherche
src/views/sub.jade      : l'ensemble des posts d'une catégorie

src/app.js : gère les requêtes SQL et l'affichage des différentes pages
src/db.js  : code fournit en cours pour utiliser SQlite
install.js : initialise les tables de la base de données

src/main.db  : base de donnée (crée après le déploiement du site)
src/sessions : session de l'utilisateur (lorsqu'il est connecté)

src/db_structure.png : schéma de la base de donnée implémentée




          🔗🔗🔗 STRUCTURE DE LA BASE DE DONNÉE 🔗🔗🔗
-------------------------------------------------------------------

La base de donnée se divise en 6 tables: ARTICLES, COMMENTS,
FAVORITES, INTERACTIONS, USERS et VOTES.

Les noms des colonnes commencent toujours par la première lettre de
la table. Par exemple, la colonne id de USERS est u_id et la colonne
id de ARTICLES est a_id.

Cela permet d'éviter de faire des alias dans les requêtes SQL.
Le fichier src/db_structure.png illustre les tables, leurs champs
ainsi que les liens existant entre ces derniers.
