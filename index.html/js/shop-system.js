// ============ SYSTÈME BOUTIQUE ============
const ShopSystem = {
    // Définition des skins
    skins: [
        { id: 0, name: 'Classic', level: 1, color: '#888888' }, // Gris par défaut
        { id: 1, name: 'Vert', level: 5, color: '#00FF00' },    // Vert
        { id: 2, name: 'Bleu', level: 10, color: '#0099FF' },   // Bleu
        { id: 3, name: 'Rouge', level: 15, color: '#FF3333' },  // Rouge
        { id: 4, name: 'Violet', level: 20, color: '#DD00FF' }  // Violet
    ],

    // Définition des musiques
    musics: [
        { id: 0, name: 'Tetris Original', level: 1, url: 'assets/musique/tetris_original_meloboom.mp3', emoji: '🎵' },
        { id: 1, name: 'Tetris Cheerful', level: 5, url: 'assets/musique/tetris_cheerful_meloboom.mp3', emoji: '🎶' },
        { id: 2, name: 'Tetris — Thème 1', level: 10, url: 'assets/musique/tetris_theme1.mp3', emoji: '🎵' },
        { id: 3, name: 'Tetris — Thème 2', level: 15, url: 'assets/musique/tetris_theme2.mp3', emoji: '🎶' },
        { id: 4, name: 'T E T R I S', level: 20, url: 'assets/musique/tetris_t_e_t_r_i_s.mp3', emoji: '🎵' }
    ],

    isItemUnlocked: function(itemType, itemId, playerLevel) {
        const items = itemType === 'skins' ? this.skins : this.musics;
        const item = items.find(i => i.id === itemId);
        
        if (!item) return false;
        return playerLevel >= item.level;
    },

    getItemsByType: function(type) {
        return type === 'skins' ? this.skins : this.musics;
    },

    getSkinColor: function(skinId) {
        const skin = this.skins.find(s => s.id === skinId);
        return skin ? skin.color : '#888888';
    }
};

// Exporter pour utilisation globale
window.ShopSystem = ShopSystem;
