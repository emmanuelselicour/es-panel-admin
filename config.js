// config.js - Configuration pour ES_COMPANY
const ESCOMPANY_CONFIG = {
    // Admin credentials
    admin: {
        username: "admin_escompany",
        password: "admin123"
    },
    
    // Load comments from storage
    loadComments: function() {
        try {
            const comments = localStorage.getItem('escompany_comments');
            return comments ? JSON.parse(comments) : [];
        } catch (error) {
            console.error('Error loading comments:', error);
            return [];
        }
    },
    
    // Save comments to storage
    saveComments: function(comments) {
        try {
            localStorage.setItem('escompany_comments', JSON.stringify(comments));
            return true;
        } catch (error) {
            console.error('Error saving comments:', error);
            return false;
        }
    },
    
    // Initialize sample data if empty
    initializeSampleData: function() {
        const existingComments = this.loadComments();
        
        if (existingComments.length === 0) {
            const sampleComments = [
                {
                    id: 1,
                    fullName: "Jean Dupont",
                    phone: "+509 48 12 34 56",
                    email: "jean.dupont@example.com",
                    subject: "Diamants FreeFire",
                    message: "Bonjour, j'ai commandé 500 diamants FreeFire il y a 2 heures mais je ne les ai pas encore reçus. Pouvez-vous vérifier?",
                    date: "2023-10-15 14:30",
                    status: "new",
                    read: false
                },
                {
                    id: 2,
                    fullName: "Marie Laurent",
                    phone: "+509 48 98 76 54",
                    email: "marie.laurent@example.com",
                    subject: "Abonnement Netflix",
                    message: "Je souhaite souscrire à un abonnement Netflix Premium pour 6 mois. Quels sont les tarifs et modalités?",
                    date: "2023-10-14 10:15",
                    status: "pending",
                    read: true
                },
                {
                    id: 3,
                    fullName: "Pierre Martin",
                    phone: "+1 510-281 7365",
                    email: "pierre.martin@example.com",
                    subject: "Création compte PayPal",
                    message: "J'ai besoin d'un compte PayPal vérifié pour mes transactions en ligne. Combien de temps prend le processus?",
                    date: "2023-10-13 16:45",
                    status: "responded",
                    read: true
                }
            ];
            
            this.saveComments(sampleComments);
            console.log('Sample data initialized');
        }
    }
};

// Initialize sample data on page load
document.addEventListener('DOMContentLoaded', function() {
    ESCOMPANY_CONFIG.initializeSampleData();
});
