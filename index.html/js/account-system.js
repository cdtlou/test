// ============ SYSTÈME DE COMPTES AVEC SYNCHRONISATION SERVEUR ============
class AccountSystem {
    constructor() {
        this.accounts = this.loadAccounts();
        this.currentUser = this.loadCurrentSession();
        // URL du serveur de synchronisation (par défaut en local)
        this.serverUrl = 'http://localhost:3000';
        // Sauvegarde automatique toutes les 5 secondes
        this.startAutoSave();
        // Synchronisation entre onglets/fenêtres (même PC/mobile)
        this.setupStorageSync();
        // Synchroniser avec le serveur au démarrage
        this.syncWithServer();
    }

    // (Comportement simple) pas de détection automatique complexe — utiliser localhost:3000 par défaut

    loadAccounts() {
        const data = localStorage.getItem('tetrisAccounts');
        return data ? JSON.parse(data) : {};
    }

    loadCurrentSession() {
        const session = localStorage.getItem('tetrisCurrentUser');
        return session ? session : null;
    }

    saveCurrentSession() {
        if (this.currentUser) {
            localStorage.setItem('tetrisCurrentUser', this.currentUser);
        } else {
            localStorage.removeItem('tetrisCurrentUser');
        }
    }

    saveAccounts() {
        // TRIPLE SAUVEGARDE: localStorage principal + backup localStorage + serveur
        const dataString = JSON.stringify(this.accounts);
        
        // Sauvegarder dans localStorage (principal)
        localStorage.setItem('tetrisAccounts', dataString);
        localStorage.setItem('tetrisLastSave', new Date().toISOString());
        
        // Sauvegarder un backup dans localStorage aussi (redondance)
        localStorage.setItem('tetrisAccountsBackup', dataString);
        
        // Sauvegarder aussi dans sessionStorage pour la session actuelle
        sessionStorage.setItem('tetrisAccountsSession', dataString);
        
        // Vérifier que la sauvegarde s'est bien faite localement
        const verify = localStorage.getItem('tetrisAccounts');
        if (verify !== dataString) {
            console.error('❌ ERREUR: La sauvegarde locale n\'a pas fonctionné!');
            alert('⚠️ ATTENTION: Erreur lors de la sauvegarde des données!');
        } else {
            console.log('✅ Sauvegarde locale réussie - ' + Object.keys(this.accounts).length + ' compte(s)');
        }
        
        // Synchroniser avec le serveur en arrière-plan
        if (this.serverUrl) {
            this.syncToServer();
        }
    }

    // Synchroniser avec le serveur (charger les données du serveur)
    async syncWithServer() {
        if (!this.serverUrl) return;
        
        try {
            window.dispatchEvent(new CustomEvent('sync-status', { detail: 'syncing' }));
            
            const response = await fetch(`${this.serverUrl}/api/accounts`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // Fusionner avec les données locales (les données du serveur prioritaires)
                    this.accounts = { ...this.accounts, ...data.accounts };
                    localStorage.setItem('tetrisAccounts', JSON.stringify(this.accounts));
                    console.log('🔄 Synchronisation avec serveur réussie');
                    window.dispatchEvent(new CustomEvent('sync-status', { detail: 'synced' }));
                }
            }
        } catch (error) {
            console.log('⚠️ Serveur indisponible - Mode local seulement');
            window.dispatchEvent(new CustomEvent('sync-status', { detail: 'error' }));
        }
    }

    // Envoyer les comptes au serveur
    async syncToServer() {
        try {
            const response = await fetch(`${this.serverUrl}/api/accounts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    accounts: this.accounts,
                    merge: true,
                    timestamp: new Date().toISOString()
                })
            });
            if (response.ok) {
                console.log('📤 Données synchronisées avec le serveur');
                window.dispatchEvent(new CustomEvent('sync-status', { detail: 'synced' }));
            }
        } catch (error) {
            // Silencieux - le serveur n'est peut-être pas disponible
            window.dispatchEvent(new CustomEvent('sync-status', { detail: 'error' }));
        }
    }

    // Synchronisation entre onglets/fenêtres (si on ouvre plusieurs onglets)
    setupStorageSync() {
        window.addEventListener('storage', (e) => {
            if (e.key === 'tetrisAccounts') {
                console.log('🔄 Synchronisation détectée - Rechargement des comptes');
                this.accounts = this.loadAccounts();
            }
            if (e.key === 'tetrisCurrentUser') {
                console.log('🔄 Synchronisation détectée - Rechargement de l\'utilisateur');
                this.currentUser = this.loadCurrentSession();
            }
        });
    }

    // Sauvegarde automatique toutes les 5 secondes
    startAutoSave() {
        setInterval(() => {
            if (this.currentUser) {
                this.saveAccounts();
            }
        }, 5000);
    }

    createAccount(pseudo, code) {
        // Vérifier que le pseudo n'existe pas déjà
        if (this.accounts[pseudo]) {
            return { success: false, message: 'Pseudo déjà utilisé' };
        }

        // Créer le compte avec timestamp de création
        this.accounts[pseudo] = {
            pseudo: pseudo,
            code: code,
            xp: 0,
            level: 1,
            bestScore: 0,
            ownedItems: {
                skins: [0], // Index 0 est le skin par défaut
                musics: [0]
            },
            equippedSkin: 0,
            equippedMusic: 0,
            musicVolume: 100,
            effectsVolume: 100,
            controls: {
                left: 'a',
                right: 'd',
                rotate: 'w',
                down: 's',
                hardDrop: ' '
            },
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
        };

        this.saveAccounts();
        
        // Vérifier que le compte a bien été créé
        if (this.accounts[pseudo]) {
            console.log(`✅ Compte "${pseudo}" créé et sauvegardé`);
            return { success: true, message: 'Compte créé avec succès' };
        } else {
            console.error(`❌ Erreur: Le compte n'a pas pu être sauvegardé!`);
            return { success: false, message: 'Erreur lors de la création du compte' };
        }
    }

    login(pseudo, code) {
        const account = this.accounts[pseudo];
        
        if (!account) {
            return { success: false, message: 'Pseudo non trouvé' };
        }

        if (account.code !== code) {
            return { success: false, message: 'Code incorrect' };
        }

        this.currentUser = pseudo;
        account.lastLogin = new Date().toISOString();
        
        // Recalculer le niveau en fonction de l'XP et du nouveau système de progression
        if (window.XpSystem) {
            account.level = window.XpSystem.getLevelFromXP(account.xp);
        }
        
        this.saveAccounts();
        this.saveCurrentSession();
        console.log(`✅ Connexion réussie: ${pseudo}`);
        return { success: true, message: 'Connexion réussie' };
    }

    logout() {
        this.currentUser = null;
        this.saveCurrentSession();
        this.saveAccounts();
        console.log('✅ Déconnexion réussie');
    }

    getCurrentUser() {
        if (!this.currentUser) return null;
        return this.accounts[this.currentUser];
    }

    updateUser(updates) {
        if (!this.currentUser) return;
        
        Object.assign(this.accounts[this.currentUser], updates);
        this.saveAccounts(); // Sauvegarde IMMÉDIATE
    }

    addXP(amount) {
        if (!this.currentUser) return;
        
        const user = this.accounts[this.currentUser];
        user.xp += amount;
        
        // Recalculer le niveau
        const XpSystem = window.XpSystem;
        if (XpSystem) {
            user.level = XpSystem.getLevelFromXP(user.xp);
        }
        
        this.saveAccounts(); // Sauvegarde IMMÉDIATE
    }

    updateBestScore(score) {
        if (!this.currentUser) return;
        
        const user = this.accounts[this.currentUser];
        if (score > user.bestScore) {
            user.bestScore = score;
            this.saveAccounts(); // Sauvegarde IMMÉDIATE
            return true;
        }
        return false;
    }

    getAllAccounts() {
        return Object.values(this.accounts);
    }

    getTopScores(limit = 3) {
        return Object.values(this.accounts)
            .sort((a, b) => b.bestScore - a.bestScore)
            .slice(0, limit)
            .map(user => ({ pseudo: user.pseudo, score: user.bestScore }));
    }

    buyItem(itemType, itemIndex) {
        if (!this.currentUser) return { success: false, message: 'Utilisateur non connecté' };
        
        const user = this.accounts[this.currentUser];
        const ownedList = user.ownedItems[itemType];
        
        if (ownedList.includes(itemIndex)) {
            return { success: false, message: 'Objet déjà acheté' };
        }

        ownedList.push(itemIndex);
        this.saveAccounts();
        return { success: true, message: 'Achat réussi' };
    }

    isItemOwned(itemType, itemIndex) {
        if (!this.currentUser) return false;
        
        const user = this.accounts[this.currentUser];
        return user.ownedItems[itemType].includes(itemIndex);
    }

    equipItem(itemType, itemIndex) {
        if (!this.currentUser) return;
        
        const user = this.accounts[this.currentUser];
        
        if (itemType === 'skins') {
            user.equippedSkin = itemIndex;
        } else if (itemType === 'musics') {
            user.equippedMusic = itemIndex;
        }
        
        this.saveAccounts();
    }

    updateControls(controls) {
        if (!this.currentUser) return;
        
        this.accounts[this.currentUser].controls = controls;
        this.saveAccounts();
    }

    updateVolume(type, value) {
        if (!this.currentUser) return;
        
        if (type === 'music') {
            this.accounts[this.currentUser].musicVolume = value;
        } else if (type === 'effects') {
            this.accounts[this.currentUser].effectsVolume = value;
        }
        
        this.saveAccounts();
    }

    // ============ SYSTÈME DE SAUVEGARDE/RESTAURATION ============
    
    // Récupérer les données depuis le backup si le principal est corrompu
    recoverFromBackup() {
        const backup = localStorage.getItem('tetrisAccountsBackup');
        if (!backup) {
            console.error('❌ Aucun backup trouvé');
            return false;
        }
        
        try {
            this.accounts = JSON.parse(backup);
            localStorage.setItem('tetrisAccounts', backup);
            console.log('✅ Récupération depuis le backup réussie');
            return true;
        } catch (error) {
            console.error('❌ Erreur lors de la récupération du backup:', error);
            return false;
        }
    }
    
    // Exporter tous les comptes en fichier JSON
    exportAccounts() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `tetris-accounts-backup-${timestamp}.json`;
        const data = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            accounts: this.accounts,
            totalAccounts: Object.keys(this.accounts).length
        };
        
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        
        URL.revokeObjectURL(url);
        
        console.log(`✅ Sauvegarde exportée: ${filename}`);
        return { success: true, message: `Sauvegarde téléchargée: ${filename}` };
    }
    
    // Importer les comptes depuis un fichier JSON
    importAccounts(jsonData) {
        try {
            const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
            
            // Vérifier la structure du fichier
            if (!data.accounts || typeof data.accounts !== 'object') {
                return { success: false, message: 'Format de fichier invalide' };
            }
            
            // Fusionner ou remplacer les comptes
            const confirmMerge = confirm(
                `${Object.keys(data.accounts).length} compte(s) trouvé(s).\n\n` +
                'Fusionner avec les comptes existants? (Oui: fusion, Non: remplacer tous)'
            );
            
            if (confirmMerge) {
                // Fusionner: garder les comptes existants et ajouter les nouveaux
                this.accounts = { ...this.accounts, ...data.accounts };
            } else {
                // Remplacer: effacer tous les anciens comptes
                this.accounts = data.accounts;
            }
            
            this.saveAccounts();
            return { 
                success: true, 
                message: `Import réussi: ${Object.keys(data.accounts).length} compte(s) restauré(s)`,
                accountCount: Object.keys(data.accounts).length
            };
        } catch (error) {
            return { success: false, message: `Erreur lors de l'import: ${error.message}` };
        }
    }
    
    // Créer une sauvegarde automatique dans localStorage (backup additionnel)
    createAutoBackup() {
        const backup = {
            timestamp: new Date().toISOString(),
            accounts: this.accounts
        };
        localStorage.setItem('tetrisAutoBackup', JSON.stringify(backup));
        console.log('Sauvegarde automatique créée');
    }
    
    // Restaurer depuis la sauvegarde automatique
    restoreFromAutoBackup() {
        const backup = localStorage.getItem('tetrisAutoBackup');
        if (!backup) {
            return { success: false, message: 'Aucune sauvegarde automatique trouvée' };
        }
        
        const data = JSON.parse(backup);
        const confirmRestore = confirm(
            `Restaurer la sauvegarde du ${new Date(data.timestamp).toLocaleString()}?\n\n` +
            `${Object.keys(data.accounts).length} compte(s) seront restaurés.`
        );
        
        if (confirmRestore) {
            this.accounts = data.accounts;
            this.saveAccounts();
            return { success: true, message: 'Sauvegarde automatique restaurée' };
        }
        return { success: false, message: 'Restauration annulée' };
    }
    
    // Supprimer définitivement un compte
    deleteAccount(pseudo) {
        if (!this.accounts[pseudo]) {
            return { success: false, message: 'Compte non trouvé' };
        }
        
        const confirmDelete = confirm(
            `Êtes-vous sûr de vouloir supprimer le compte "${pseudo}"?\n\nCette action est irréversible!`
        );
        
        if (confirmDelete) {
            delete this.accounts[pseudo];
            this.saveAccounts();
            
            // Si c'est l'utilisateur connecté, le déconnecter
            if (this.currentUser === pseudo) {
                this.logout();
            }
            
            return { success: true, message: `Compte "${pseudo}" supprimé` };
        }
        return { success: false, message: 'Suppression annulée' };
    }
    
    // Obtenir des informations sur la sauvegarde
    getBackupInfo() {
        return {
            totalAccounts: Object.keys(this.accounts).length,
            accounts: Object.keys(this.accounts),
            lastSave: localStorage.getItem('tetrisLastSave') || 'Jamais',
            storageUsage: new Blob([JSON.stringify(this.accounts)]).size + ' bytes'
        };
    }
}

// Instance globale
const accountSystem = new AccountSystem();
