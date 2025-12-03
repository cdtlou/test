// ============ JEU TETRIS COMPLET ============
class TetrisGame {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        // Paramètres du jeu
        // Déterminer une taille de bloc adaptée (plus grande sur mobile pour le toucher)
        // Increase block sizes by ~20% from previous baseline
        const DEFAULT_BLOCK = 40;
        const TOUCH_BLOCK = 60; // larger for fingers on small screens
        this.BLOCK_SIZE = window.innerWidth < 768 ? TOUCH_BLOCK : DEFAULT_BLOCK;

        // Forcer la résolution du canvas pour correspondre à une grille 10x20
        // Cela garantit que les blocs sont bien proportionnés et plus faciles à tapoter
        this.canvas.width = this.BLOCK_SIZE * 10;
        this.canvas.height = this.BLOCK_SIZE * 20;

        this.COLS = Math.floor(this.canvas.width / this.BLOCK_SIZE);
        this.ROWS = Math.floor(this.canvas.height / this.BLOCK_SIZE);
        
        // Initialiser la grille
        this.board = Array(this.ROWS).fill().map(() => Array(this.COLS).fill(0));
        
        // État du jeu
        this.currentPiece = null;
        this.nextPiece = null;
        this.ghostPiece = null;
        this.score = 0; // Score = nombre de pièces posées
        this.piecesPlaced = 0; // Compteur de pièces
        this.linesCleared = 0;
        this.isPaused = false;
        this.gameOver = false;
        this.isRunning = false;
        this.xpGainedThisGame = 0;
        this.xpPopups = []; // Pour afficher les XP flottants
        
        // Timing
        this.dropInterval = 1000; // Intervalle de chute en ms
        this.dropCounter = 0;
        this.lastDropTime = Date.now();
        this.isSoftDropping = false; // Pour le soft drop (descente rapide)
        
        // Touches
        this.keys = {};
        this.setupControls();
        
        // Pièces Tetris
        this.setupPieces();
    }

    setupPieces() {
        this.pieces = [
            // I
            { shape: [[1, 1, 1, 1]], color: '#00f0f0' },
            // O
            { shape: [[1, 1], [1, 1]], color: '#f0f000' },
            // T
            { shape: [[0, 1, 0], [1, 1, 1]], color: '#a000f0' },
            // S
            { shape: [[0, 1, 1], [1, 1, 0]], color: '#00f000' },
            // Z
            { shape: [[1, 1, 0], [0, 1, 1]], color: '#f00000' },
            // J
            { shape: [[1, 0, 0], [1, 1, 1]], color: '#0000f0' },
            // L
            { shape: [[0, 0, 1], [1, 1, 1]], color: '#f0a000' }
        ];
    }

    setupControls() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            this.handleKeyPress(e.key.toLowerCase());
        });
        
        document.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            this.keys[key] = false;
            // Si on relâche la touche de descente rapide, rétablir l'intervalle de chute
            const user = accountSystem.getCurrentUser();
            if (user && user.controls && user.controls.down === key) {
                this.dropInterval = 1000;
            }
        });

        // Contrôles mobiles
        document.getElementById('btnLeft')?.addEventListener('click', () => this.moveLeft());
        document.getElementById('btnRight')?.addEventListener('click', () => this.moveRight());
        document.getElementById('btnRotate')?.addEventListener('click', () => this.rotate());
        
        // Bouton descente rapide (soft drop) - avec touch/mouse down/up
        const btnDown = document.getElementById('btnDown');
        if (btnDown) {
            btnDown.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.isSoftDropping = true;
                this.dropInterval = 50;
            });
            btnDown.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.isSoftDropping = false;
                this.dropInterval = 1000;
            });
            btnDown.addEventListener('mousedown', () => {
                this.isSoftDropping = true;
                this.dropInterval = 50;
            });
            btnDown.addEventListener('mouseup', () => {
                this.isSoftDropping = false;
                this.dropInterval = 1000;
            });
            btnDown.addEventListener('mouseleave', () => {
                this.isSoftDropping = false;
                this.dropInterval = 1000;
            });
        }
        
        document.getElementById('btnHardDrop')?.addEventListener('click', () => this.hardDrop());
    }

    handleKeyPress(key) {
        if (!this.isRunning || this.isPaused) return;

        const user = accountSystem.getCurrentUser();
        if (!user) return;

        const controls = user.controls;

        if (key === controls.left) this.moveLeft();
        if (key === controls.right) this.moveRight();
        if (key === controls.rotate) this.rotate();
        if (key === controls.down) this.accelerateDrop();
        if (key === controls.hardDrop || key === ' ') this.hardDrop();
    }

    start() {
        this.board = Array(this.ROWS).fill().map(() => Array(this.COLS).fill(0));
        this.score = 0;
        this.piecesPlaced = 0;
        this.linesCleared = 0;
        this.gameOver = false;
        this.isRunning = true;
        this.isPaused = false;
        this.xpGainedThisGame = 0;
        this.xpPopups = [];
        
        this.currentPiece = this.getRandomPiece();
        this.currentPiece.x = Math.floor(this.COLS / 2) - 1;
        this.currentPiece.y = 0;
        
        this.nextPiece = this.getRandomPiece();
        
        // Mettre à jour la ghost piece
        this.updateGhostPiece();
        
        // Démarrer la musique
        const user = accountSystem.getCurrentUser();
        if (user && window.audioSystem) {
            try {
                const trackId = user.equippedMusic;
                let url = null;
                if (window.ShopSystem && Array.isArray(window.ShopSystem.musics)) {
                    const item = window.ShopSystem.musics.find(m => m.id === trackId);
                    url = item && item.url ? item.url : null;
                }
                console.log('🔊 Lancement musique équipée - trackId:', trackId, ' url:', url);
                audioSystem.playMusic(trackId);
            } catch (e) {
                console.error('Erreur lancement musique équipée:', e);
                audioSystem.playMusic(0);
            }
        }
        
        // Afficher les contrôles mobiles si petit écran
        if (window.innerWidth < 768) {
            document.querySelector('.mobile-controls')?.classList.add('active');
        }
        
        this.gameLoop();
    }

    stop() {
        this.isRunning = false;
        // Arrêter la musique à la fin du jeu
        if (window.audioSystem) {
            audioSystem.stopMusic();
        }
        document.querySelector('.mobile-controls')?.classList.remove('active');
    }

    togglePause() {
        if (!this.isRunning) return;
        this.isPaused = !this.isPaused;
        
        // Gérer la musique lors de la pause
        if (window.audioSystem) {
            if (this.isPaused) {
                audioSystem.pauseMusic();
            } else {
                audioSystem.resumeMusic();
            }
        }
        
        // Mettre à jour les deux boutons pause (mobile et desktop)
        document.getElementById('pauseBtn').textContent = this.isPaused ? 'Reprendre' : 'Pause';
        const pauseBtnDesktop = document.getElementById('pauseBtn-desktop');
        if (pauseBtnDesktop) pauseBtnDesktop.textContent = this.isPaused ? 'Reprendre' : 'Pause';
    }

    getRandomPiece() {
        const piece = JSON.parse(JSON.stringify(this.pieces[Math.floor(Math.random() * this.pieces.length)]));
        const user = accountSystem.getCurrentUser();
        
        // Par défaut: gris
        piece.color = '#888888';
        piece.originalColor = '#888888';
        
        // Appliquer la couleur du skin équipé si déverrouillé
        if (user) {
            // Vérifier si le skin actuel est déverrouillé avec couleur custom
            const equippedSkinId = user.equippedSkin;
            const isOwned = accountSystem.isItemOwned('skins', equippedSkinId);
            
            if (isOwned && equippedSkinId !== 0) {
                // Utiliser la couleur custom du skin
                piece.color = ShopSystem.getSkinColor(equippedSkinId);
                piece.originalColor = ShopSystem.getSkinColor(equippedSkinId);
            }
        }
        
        return piece;
    }

    moveLeft() {
        if (this.currentPiece) {
            this.currentPiece.x--;
            if (this.collides()) {
                this.currentPiece.x++;
            }
            this.updateGhostPiece();
        }
    }

    moveRight() {
        if (this.currentPiece) {
            this.currentPiece.x++;
            if (this.collides()) {
                this.currentPiece.x--;
            }
            this.updateGhostPiece();
        }
    }

    rotate() {
        if (!this.currentPiece) return;

        const original = JSON.parse(JSON.stringify(this.currentPiece.shape));
        
        // Rotation 90°
        const rotated = this.currentPiece.shape[0].map((_, i) =>
            this.currentPiece.shape.map(row => row[i]).reverse()
        );
        
        this.currentPiece.shape = rotated;
        
        if (this.collides()) {
            this.currentPiece.shape = original;
        }
        this.updateGhostPiece();
    }

    accelerateDrop() {
        this.dropInterval = 100;
        this.updateGhostPiece();
    }

    hardDrop() {
        while (!this.collides() && this.currentPiece.y < this.ROWS) {
            this.currentPiece.y++;
        }
        this.currentPiece.y--;
        this.placePiece();
    }

    updateGhostPiece() {
        if (!this.currentPiece) return;

        // Créer une copie de la pièce actuelle
        this.ghostPiece = JSON.parse(JSON.stringify(this.currentPiece));
        this.ghostPiece.color = 'rgba(136, 136, 136, 0.3)'; // Gris semi-transparent

        // Descendre jusqu'au sol
        while (!this.checkCollisionForGhost(this.ghostPiece)) {
            this.ghostPiece.y++;
        }
        this.ghostPiece.y--; // Reculer d'une position
    }

    collides() {
        const shape = this.currentPiece.shape;
        const x = this.currentPiece.x;
        const y = this.currentPiece.y;

        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    const boardX = x + col;
                    const boardY = y + row;

                    if (boardX < 0 || boardX >= this.COLS || boardY >= this.ROWS) {
                        return true;
                    }

                    if (boardY >= 0 && this.board[boardY][boardX]) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    checkCollisionForGhost(piece) {
        const shape = piece.shape;
        const x = piece.x;
        const y = piece.y;

        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    const boardX = x + col;
                    const boardY = y + row;

                    if (boardX < 0 || boardX >= this.COLS || boardY >= this.ROWS) {
                        return true;
                    }

                    if (boardY >= 0 && this.board[boardY][boardX]) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    placePiece() {
        const shape = this.currentPiece.shape;
        const x = this.currentPiece.x;
        const y = this.currentPiece.y;
        const color = this.currentPiece.originalColor || this.currentPiece.color;

        // Ajouter la pièce à la grille
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    const boardX = x + col;
                    const boardY = y + row;
                    
                    if (boardY >= 0 && boardY < this.ROWS && boardX >= 0 && boardX < this.COLS) {
                        this.board[boardY][boardX] = color;
                    }
                }
            }
        }

        // Augmenter le score (1 point par pièce posée)
        this.piecesPlaced++;
        this.score = this.piecesPlaced;

        // Gagner XP pour cette pièce
        const xpGain = XpSystem.getRandomXpGain();
        this.xpGainedThisGame += xpGain;
        
        // Ajouter un popup XP flottant
        this.xpPopups.push({
            x: this.currentPiece.x,
            y: this.currentPiece.y,
            xp: xpGain,
            opacity: 1,
            age: 0
        });
        
        accountSystem.addXP(xpGain);
        
        // Vérifier les lignes complètes
        this.checkLines();

        // Nouvelle pièce
        this.currentPiece = this.nextPiece;
        this.currentPiece.x = Math.floor(this.COLS / 2) - 1;
        this.currentPiece.y = 0;
        this.nextPiece = this.getRandomPiece();
        
        // Mettre à jour la ghost piece
        this.updateGhostPiece();

        // Vérifier la fin du jeu
        if (this.collides()) {
            this.endGame();
        }

        // Réinitialiser l'intervalle de chute
        this.dropInterval = 1000;
    }

    checkLines() {
        let linesToClear = [];

        for (let row = 0; row < this.ROWS; row++) {
            if (this.board[row].every(cell => cell)) {
                linesToClear.push(row);
            }
        }

        if (linesToClear.length > 0) {
            this.linesCleared += linesToClear.length;

            // Supprimer les lignes
            for (let row of linesToClear.reverse()) {
                this.board.splice(row, 1);
                this.board.unshift(Array(this.COLS).fill(0));
            }
        }
    }

    endGame() {
        this.gameOver = true;
        this.isRunning = false;

        // Mettre à jour le meilleur score
        const user = accountSystem.getCurrentUser();
        accountSystem.updateBestScore(this.score);

        alert(`Partie terminée!\nScore: ${this.score}`);
        
        // Retour au lobby
        uiManager.exitGame();
    }

    gameLoop() {
        if (!this.isRunning) return;

        const now = Date.now();
        const deltaTime = now - this.lastDropTime;

        if (!this.isPaused) {
            if (deltaTime > this.dropInterval) {
                this.currentPiece.y++;
                
                if (this.collides()) {
                    this.currentPiece.y--;
                    this.placePiece();
                }
                
                this.lastDropTime = now;
            }

            // Afficher le score et l'XP gagné
            uiManager.updateGameDisplay(this.score, this.xpGainedThisGame);
        }

        // Mettre à jour les popups XP
        this.xpPopups = this.xpPopups.filter(popup => {
            popup.age++;
            popup.opacity = Math.max(0, 1 - popup.age / 60);
            return popup.opacity > 0;
        });

        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }

    draw() {
        // Effacer le canvas
        this.ctx.fillStyle = '#0a0e27';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Grille
        this.ctx.strokeStyle = 'rgba(102, 126, 234, 0.1)';
        this.ctx.lineWidth = 1;
        for (let i = 0; i <= this.COLS; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(i * this.BLOCK_SIZE, 0);
            this.ctx.lineTo(i * this.BLOCK_SIZE, this.canvas.height);
            this.ctx.stroke();
        }
        for (let i = 0; i <= this.ROWS; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, i * this.BLOCK_SIZE);
            this.ctx.lineTo(this.canvas.width, i * this.BLOCK_SIZE);
            this.ctx.stroke();
        }

        // Dessiner les blocs placés
        for (let row = 0; row < this.ROWS; row++) {
            for (let col = 0; col < this.COLS; col++) {
                if (this.board[row][col]) {
                    this.drawBlock(col, row, this.board[row][col]);
                }
            }
        }

        // Dessiner la ghost piece
        if (this.ghostPiece && !this.isPaused) {
            const shape = this.ghostPiece.shape;
            const x = this.ghostPiece.x;
            const y = this.ghostPiece.y;

            for (let row = 0; row < shape.length; row++) {
                for (let col = 0; col < shape[row].length; col++) {
                    if (shape[row][col]) {
                        this.drawGhostBlock(x + col, y + row);
                    }
                }
            }
        }

        // Dessiner la pièce actuelle
        if (this.currentPiece && !this.isPaused) {
            const shape = this.currentPiece.shape;
            const x = this.currentPiece.x;
            const y = this.currentPiece.y;

            for (let row = 0; row < shape.length; row++) {
                for (let col = 0; col < shape[row].length; col++) {
                    if (shape[row][col]) {
                        this.drawBlock(x + col, y + row, this.currentPiece.color);
                    }
                }
            }
        }

        // Dessiner les popups XP
        this.xpPopups.forEach(popup => {
            this.drawXPPopup(popup);
        });

        // Afficher "PAUSED" si en pause
        if (this.isPaused) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 40px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2);
        }
    }

    drawBlock(x, y, color) {
        const size = this.BLOCK_SIZE;
        
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
        
        // Bordure
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x * size + 1, y * size + 1, size - 2, size - 2);
    }

    drawGhostBlock(x, y) {
        const size = this.BLOCK_SIZE;
        
        // Remplissage gris semi-transparent
        this.ctx.fillStyle = 'rgba(136, 136, 136, 0.2)';
        this.ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
        
        // Bordure grise
        this.ctx.strokeStyle = 'rgba(136, 136, 136, 0.4)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x * size + 1, y * size + 1, size - 2, size - 2);
    }

    drawXPPopup(popup) {
        const size = this.BLOCK_SIZE;
        const x = popup.x * size + size / 2;
        const y = (popup.y - popup.age / 20) * size;

        this.ctx.fillStyle = `rgba(255, 215, 0, ${popup.opacity})`;
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(`+${popup.xp} XP`, x, y);
    }
}

// Instance globale
window.tetrisGame = new TetrisGame('gameCanvas');
