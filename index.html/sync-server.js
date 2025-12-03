// ============ SERVEUR DE SYNCHRONISATION SIMPLE ============
// À exécuter avec: node sync-server.js
// Cela crée un serveur qui synchronise les comptes entre appareils

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const ACCOUNTS_FILE = path.join(__dirname, 'accounts-data.json');

// Charger les comptes du fichier
function loadAccounts() {
    try {
        if (fs.existsSync(ACCOUNTS_FILE)) {
            const data = fs.readFileSync(ACCOUNTS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Erreur lecture des comptes:', error);
    }
    return {};
}

// Sauvegarder les comptes dans le fichier
function saveAccounts(accounts) {
    try {
        fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), 'utf8');
        console.log('✅ Comptes sauvegardés');
    } catch (error) {
        console.error('❌ Erreur sauvegarde:', error);
    }
}

const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // GET /api/accounts - Récupérer tous les comptes
    if (req.method === 'GET' && req.url === '/api/accounts') {
        const accounts = loadAccounts();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, accounts }));
        console.log('📤 Envoi des comptes au client');
        return;
    }

    // POST /api/accounts - Sauvegarder/synchroniser les comptes
    if (req.method === 'POST' && req.url === '/api/accounts') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const accounts = loadAccounts();
                
                // Fusionner ou remplacer
                if (data.merge) {
                    // Fusionner: les nouveaux comptes écrasent les anciens
                    Object.assign(accounts, data.accounts);
                } else {
                    // Remplacer complet
                    for (const pseudo in data.accounts) {
                        accounts[pseudo] = data.accounts[pseudo];
                    }
                }
                
                saveAccounts(accounts);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: true, 
                    message: 'Comptes synchronisés',
                    totalAccounts: Object.keys(accounts).length
                }));
                console.log('📥 Réception de comptes du client');
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: error.message }));
            }
        });
        return;
    }

    // GET /api/accounts/:pseudo - Récupérer un compte spécifique
    if (req.method === 'GET' && req.url.startsWith('/api/accounts/')) {
        const pseudo = decodeURIComponent(req.url.split('/')[3]);
        const accounts = loadAccounts();
        const account = accounts[pseudo];
        
        if (account) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, account }));
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: 'Compte non trouvé' }));
        }
        return;
    }

    // POST /api/accounts/:pseudo - Créer/Mettre à jour un compte
    if (req.method === 'POST' && req.url.startsWith('/api/accounts/')) {
        const pseudo = decodeURIComponent(req.url.split('/')[3]);
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const accountData = JSON.parse(body);
                const accounts = loadAccounts();
                accounts[pseudo] = accountData;
                saveAccounts(accounts);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: 'Compte créé/mis à jour' }));
                console.log(`✅ Compte ${pseudo} sauvegardé`);
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: error.message }));
            }
        });
        return;
    }

    // DELETE /api/accounts/:pseudo - Supprimer un compte
    if (req.method === 'DELETE' && req.url.startsWith('/api/accounts/')) {
        const pseudo = decodeURIComponent(req.url.split('/')[3]);
        const accounts = loadAccounts();
        
        if (accounts[pseudo]) {
            delete accounts[pseudo];
            saveAccounts(accounts);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'Compte supprimé' }));
            console.log(`✅ Compte ${pseudo} supprimé`);
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: 'Compte non trouvé' }));
        }
        return;
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, message: 'Endpoint non trouvé' }));
});

server.listen(PORT, () => {
    console.log(`🚀 Serveur de synchronisation lancé sur http://localhost:${PORT}`);
    console.log(`📊 Les comptes sont sauvegardés dans: ${ACCOUNTS_FILE}`);
});
