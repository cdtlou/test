📱💻 SYNCHRONISATION PC/MOBILE - GUIDE D'INSTALLATION

═══════════════════════════════════════════════════════════

🚀 ÉTAPES POUR SYNCHRONISER VOS COMPTES PARTOUT:

1️⃣ INSTALLER NODE.JS (une fois seulement)
   ► Télécharge Node.js: https://nodejs.org/
   ► Installe la version LTS
   ► Vérifie: ouvre PowerShell et tape: node --version

2️⃣ LANCER LE SERVEUR DE SYNCHRONISATION
   ► Ouvre PowerShell dans le dossier du jeu
   ► Tape: node sync-server.js
   ► Tu devrais voir: "🚀 Serveur de synchronisation lancé sur http://localhost:3000"

3️⃣ ACCÉDER AU JEU
   ► Sur ton PC: http://localhost:5500 (ou l'URL de ton serveur local)
   ► Sur ton TÉLÉPHONE: http://192.168.X.X:5500 (L'IP de ton PC)
     • Pour trouver l'IP: tape "ipconfig" en PowerShell
     • Cherche "Adresse IPv4" (ex: 192.168.1.100)

4️⃣ CRÉER ET JOUER
   ► Sur le PC: Créer un compte
   ► Sur le téléphone: Se connecter avec les MÊMES identifiants
   ► ✅ Les données seront synchronisées!

═══════════════════════════════════════════════════════════

💾 OÙ SONT LES DONNÉES?

- Sur le PC: localStorage du navigateur (cache local)
- Sur le serveur: accounts-data.json (sauvegarde permanente)
- Sur le téléphone: localStorage du navigateur (copie locale)

Si le serveur s'arrête, tu peux quand même jouer localement!

═══════════════════════════════════════════════════════════

🔧 DÉPANNAGE:

❌ "Pseudo non trouvé sur mon téléphone"
   ► Le serveur ne tourne pas? Lance-le en PowerShell
   ► Mauvaise IP? Vérifie avec ipconfig

❌ "Erreur de connexion au serveur"
   ► Vérifie que tu utilises http:// (pas https://)
   ► Vérifie que le port 3000 n'est pas bloqué

❌ "Les données ne se synchronisent pas"
   ► Rafraîchis la page (F5)
   ► Attends 5 secondes (sauvegarde auto)
   ► Vérifie la console (F12 → Console)

═══════════════════════════════════════════════════════════

✅ C'EST PRÊT! Tes comptes sont maintenant synchronisés partout!
