                  ⚙️⚙️⚙️ FONCTIONNALITÉS ⚙️⚙️⚙️
-------------------------------------------------------------------

L'authentification ✅

Première page recontrée par tout utilisateur non connecté. On peut
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
		    rant ces denières 24 heures. Ils sont rassemblé
		    par catégorie (sub-reddit).
		    A cela s'ajoute une aide à la navigation pour
		    remonter ou descendre dans la page.
		    Cet ensemble est fixé.


Les posts 📑

L'utilisateur peut accèder à un post de différentes manières:
depuis la page d'accueil si ce dernier est populaire, par une
recherche, depuis son profil s'il a déjà intéragis avec celui-ci
ou depuis un autre post possédant la même catégorie (sub-reddit).

Il peut commenter autant de fois qu'il le souhaite.

Si il est l'auteur du post, il peut modifier ou supprimer son post.
En cas de supression d'un article, tous les commentaires votes et
favoris relatifs sont supprimés de la base de donnée.


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
Elles sont triées de manière antichronologiques.

Pour tous ces posts, si l'utilisateur a commenté, l'ensemble de ses
commentaires sont affichés en-dessous du post concerné.

L'utilisateur peut directement voter (ainsi qu'éditer et supprimer
s'il est l'auteur) les posts affichés.

Sur le côté, l'utilisateur trouve divers statisqtiques le concernant
sur ce site ainsi qu'un lien 





      ❌ ❌ ❌ FONCTIONNALITÉS MANQUANTES / DÉFAUTS ❌ ❌ ❌
-------------------------------------------------------------------

profils -> vos posts les plus récents -> dernier post -> bouton downvote

depuis la page affichant l'ensemble des posts d'une catégorie, on ne
peut pas supprimer directement un article si celui-ci est le seul de la
catégorie.

L'intéraction avec les posts depuis la page de recherche est limité à
un lien conduisant vers les pages spécifiques à ces posts (pas d'édition,
de suppression ou de votes possible). La raison est qu'une i


                  📁 📁 📁 ARCHITECTURE 📁 📁 📁
-------------------------------------------------------------------



          🔗🔗🔗 STRUCTURE DE LA BASE DE DONNÉE 🔗🔗🔗
-------------------------------------------------------------------
