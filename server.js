const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: [
    'https://e-s-company.netlify.app',
    'http://localhost:5500',
    'http://localhost:3000',
    'http://127.0.0.1:5500'
  ],
  credentials: true,
  optionsSuccessStatus: 200
}));

app.use(express.json());

// Stockage en mémoire (pour la version simple)
let comments = [];
let commentIdCounter = 1;

// Initialiser quelques données de test
function initializeSampleData() {
  if (comments.length === 0) {
    comments = [
      {
        id: commentIdCounter++,
        fullName: "Jean Dupont",
        phone: "+509 48 12 34 56",
        email: "jean.dupont@example.com",
        subject: "Diamants FreeFire",
        subjectCode: "freefire",
        message: "Bonjour, j'ai commandé 500 diamants FreeFire il y a 2 heures mais je ne les ai pas encore reçus. Pouvez-vous vérifier?",
        date: new Date().toISOString(),
        status: "new",
        read: false,
        source: "website_form"
      },
      {
        id: commentIdCounter++,
        fullName: "Marie Laurent",
        phone: "+509 48 98 76 54",
        email: "marie.laurent@example.com",
        subject: "Abonnement Netflix",
        subjectCode: "netflix",
        message: "Je souhaite souscrire à un abonnement Netflix Premium pour 6 mois. Quels sont les tarifs et modalités?",
        date: new Date(Date.now() - 86400000).toISOString(),
        status: "pending",
        read: true,
        source: "website_form"
      },
      {
        id: commentIdCounter++,
        fullName: "Pierre Martin",
        phone: "+1 510-281 7365",
        email: "pierre.martin@example.com",
        subject: "Création compte PayPal",
        subjectCode: "paypal",
        message: "J'ai besoin d'un compte PayPal vérifié pour mes transactions en ligne. Combien de temps prend le processus?",
        date: new Date(Date.now() - 172800000).toISOString(),
        status: "responded",
        read: true,
        source: "website_form"
      }
    ];
  }
}

// Middleware pour vérifier l'authentification admin
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      error: 'Token d\'authentification requis' 
    });
  }
  
  const token = authHeader.split(' ')[1];
  const adminToken = process.env.ADMIN_TOKEN || 'escompany_admin_token_secure_123';
  
  if (token !== adminToken) {
    return res.status(403).json({ 
      success: false, 
      error: 'Token d\'authentification invalide' 
    });
  }
  
  next();
};

// Middleware de log des requêtes
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Route de santé
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true,
    status: 'healthy', 
    service: 'ES_COMPANY API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    commentsCount: comments.length
  });
});

// Route racine
app.get('/', (req, res) => {
  res.json({ 
    success: true,
    message: 'Bienvenue sur l\'API ES_COMPANY',
    service: 'Gestion des commentaires et contact',
    version: '1.0.0',
    documentation: {
      endpoints: {
        health: 'GET /api/health',
        submitComment: 'POST /api/comments',
        getComments: 'GET /api/comments (admin only)',
        adminLogin: 'POST /api/admin/login'
      }
    }
  });
});

// GET tous les commentaires (Admin seulement)
app.get('/api/comments', authenticateAdmin, (req, res) => {
  try {
    // Options de filtrage
    const { status, limit, sort = 'desc' } = req.query;
    
    let filteredComments = [...comments];
    
    // Filtrer par statut si spécifié
    if (status && ['new', 'pending', 'responded'].includes(status)) {
      filteredComments = filteredComments.filter(comment => comment.status === status);
    }
    
    // Trier par date
    filteredComments.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return sort === 'asc' ? dateA - dateB : dateB - dateA;
    });
    
    // Limiter les résultats si spécifié
    if (limit && !isNaN(limit)) {
      filteredComments = filteredComments.slice(0, parseInt(limit));
    }
    
    // Calculer les statistiques
    const stats = {
      total: comments.length,
      new: comments.filter(c => c.status === 'new').length,
      pending: comments.filter(c => c.status === 'pending').length,
      responded: comments.filter(c => c.status === 'responded').length
    };
    
    res.json({
      success: true,
      count: filteredComments.length,
      total: comments.length,
      stats: stats,
      comments: filteredComments
    });
    
  } catch (error) {
    console.error('Erreur GET /api/comments:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur lors de la récupération des commentaires' 
    });
  }
});

// POST un nouveau commentaire
app.post('/api/comments', (req, res) => {
  try {
    const { fullName, phone, email, subject, subjectCode, message } = req.body;
    
    // Validation
    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Le nom complet est requis' 
      });
    }
    
    if (!email || !email.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: 'L\'email est requis' 
      });
    }
    
    if (!message || !message.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Le message est requis' 
      });
    }
    
    // Vérifier format email basique
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Format d\'email invalide' 
      });
    }
    
    // Créer le nouveau commentaire
    const newComment = {
      id: commentIdCounter++,
      fullName: fullName.trim(),
      phone: phone ? phone.trim() : '',
      email: email.trim(),
      subject: subject || 'Autre',
      subjectCode: subjectCode || 'other',
      message: message.trim(),
      date: new Date().toISOString(),
      status: 'new',
      read: false,
      source: req.headers.origin || 'website_form',
      ip: req.ip || req.headers['x-forwarded-for'] || 'unknown'
    };
    
    // Ajouter au tableau
    comments.push(newComment);
    
    console.log('✅ Nouveau commentaire reçu:', {
      id: newComment.id,
      name: newComment.fullName,
      email: newComment.email,
      subject: newComment.subject,
      date: new Date(newComment.date).toLocaleString('fr-FR')
    });
    
    // Réponse de succès
    res.status(201).json({
      success: true,
      message: 'Votre message a été envoyé avec succès',
      comment: {
        id: newComment.id,
        fullName: newComment.fullName,
        email: newComment.email,
        subject: newComment.subject,
        date: new Date(newComment.date).toLocaleString('fr-FR')
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erreur POST /api/comments:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur interne du serveur lors de l\'enregistrement du commentaire' 
    });
  }
});

// PUT mettre à jour un commentaire (Admin seulement)
app.put('/api/comments/:id', authenticateAdmin, (req, res) => {
  try {
    const commentId = parseInt(req.params.id);
    const { status, read } = req.body;
    
    const commentIndex = comments.findIndex(c => c.id === commentId);
    
    if (commentIndex === -1) {
      return res.status(404).json({ 
        success: false, 
        error: 'Commentaire non trouvé' 
      });
    }
    
    // Mettre à jour les champs
    if (status && ['new', 'pending', 'responded'].includes(status)) {
      comments[commentIndex].status = status;
    }
    
    if (read !== undefined) {
      comments[commentIndex].read = Boolean(read);
    }
    
    res.json({
      success: true,
      message: 'Commentaire mis à jour avec succès',
      comment: comments[commentIndex]
    });
    
  } catch (error) {
    console.error('Erreur PUT /api/comments/:id:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur lors de la mise à jour du commentaire' 
    });
  }
});

// DELETE un commentaire (Admin seulement)
app.delete('/api/comments/:id', authenticateAdmin, (req, res) => {
  try {
    const commentId = parseInt(req.params.id);
    const initialLength = comments.length;
    
    comments = comments.filter(c => c.id !== commentId);
    
    if (comments.length === initialLength) {
      return res.status(404).json({ 
        success: false, 
        error: 'Commentaire non trouvé' 
      });
    }
    
    res.json({
      success: true,
      message: 'Commentaire supprimé avec succès',
      deletedId: commentId,
      remainingCount: comments.length
    });
    
  } catch (error) {
    console.error('Erreur DELETE /api/comments/:id:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur lors de la suppression du commentaire' 
    });
  }
});

// Login admin
app.post('/api/admin/login', (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Nom d\'utilisateur et mot de passe requis' 
      });
    }
    
    const adminUsername = process.env.ADMIN_USERNAME || 'admin_escompany';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminToken = process.env.ADMIN_TOKEN || 'escompany_admin_token_secure_123';
    
    // Vérifier les identifiants
    if (username === adminUsername && password === adminPassword) {
      res.json({ 
        success: true, 
        message: 'Connexion réussie',
        token: adminToken,
        user: {
          username,
          role: 'admin',
          permissions: ['read_comments', 'update_comments', 'delete_comments']
        },
        expiresIn: '7d'
      });
      
      console.log(`🔐 Admin connecté: ${username}`);
      
    } else {
      console.log(`❌ Tentative de connexion échouée pour: ${username}`);
      res.status(401).json({ 
        success: false, 
        error: 'Identifiants incorrects' 
      });
    }
    
  } catch (error) {
    console.error('Erreur POST /api/admin/login:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur lors de la connexion' 
    });
  }
});

// Middleware pour les routes non trouvées
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Route non trouvée',
    path: req.url,
    method: req.method
  });
});

// Middleware pour les erreurs globales
app.use((err, req, res, next) => {
  console.error('🔥 Erreur globale:', err);
  res.status(500).json({ 
    success: false, 
    error: 'Erreur interne du serveur',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Une erreur est survenue'
  });
});

// Initialiser les données et démarrer le serveur
function startServer() {
  initializeSampleData();
  
  app.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log(`🚀 Serveur ES_COMPANY API démarré`);
    console.log(`📡 Port: ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🕐 Date: ${new Date().toLocaleString('fr-FR')}`);
    console.log('='.repeat(50));
    console.log(`🔗 URL: http://localhost:${PORT}`);
    console.log(`🩺 Health: http://localhost:${PORT}/api/health`);
    console.log(`💾 Commentaires initiaux: ${comments.length}`);
    console.log('='.repeat(50));
  });
}

// Démarrer le serveur
startServer();
