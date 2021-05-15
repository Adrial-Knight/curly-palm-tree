#!/bin/bash

clear

if [ "$1" = "db" ]; then
	echo "Réinitialise la base de donnée"
	node install.js

elif [ "$1" = "ss" ]; then
	if [ -e sessions ]; then
		echo "Supprime la précédente session"
		rm sessions
	else
		echo "Pas de précédente session à supprimer"
	fi

elif [ "$1" = "a" ]; then
	echo "Réinitialise la base de donnée"
	node init.js
	if [ -e sessions ]; then
		echo "Supprime la précédente session"
		rm sessions
	else
		echo "Pas de précédente session à supprimer"
	fi
fi

node app.js
