const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'API ES_COMPANY Backend' });
});

// API pour les commentaires
app.post('/api/comments', (req, res) => {
  // Sauvegarder le commentaire
  res.json({ success: true, message: 'Commentaire reçu' });
});

app.get('/api/comments', (req, res) => {
  // Récupérer tous les commentaires
  res.json({ comments: [] });
});

// Route admin
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    res.json({ success: true, token: 'jwt_token_here' });
  } else {
    res.status(401).json({ success: false, message: 'Identifiants incorrects' });
  }
});

app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
