



// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://your-username:your-password@cluster.mongodb.net/escompany', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Models
const AdminSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, default: 'Admin ES_COMPANY' },
    role: { type: String, default: 'admin' },
    createdAt: { type: Date, default: Date.now }
});

const CommentSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    subject: { type: String, default: 'Autre' },
    message: { type: String, required: true },
    status: { type: String, default: 'new' },
    read: { type: Boolean, default: false },
    date: { type: Date, default: Date.now }
});

const PayPalOrderSchema = new mongoose.Schema({
    orderNumber: { type: String, required: true, unique: true },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    customerPhone: { type: String, required: true },
    paypalEmail: { type: String, required: true },
    country: { type: String, required: true },
    notes: { type: String },
    price: { type: String, required: true },
    paymentMethod: { type: String, required: true },
    paymentNumber: { type: String, required: true },
    proofImage: { type: String },
    status: { type: String, default: 'pending' },
    processed: { type: Boolean, default: false },
    date: { type: Date, default: Date.now },
    type: { type: String, default: 'paypal' }
});

const NetflixOrderSchema = new mongoose.Schema({
    orderNumber: { type: String, required: true, unique: true },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    customerPhone: { type: String, required: true },
    plan: { type: String, required: true },
    price: { type: String, required: true },
    paymentMethod: { type: String, required: true },
    paymentNumber: { type: String, required: true },
    status: { type: String, default: 'pending' },
    date: { type: Date, default: Date.now },
    notes: { type: String }
});

const Admin = mongoose.model('Admin', AdminSchema);
const Comment = mongoose.model('Comment', CommentSchema);
const PayPalOrder = mongoose.model('PayPalOrder', PayPalOrderSchema);
const NetflixOrder = mongoose.model('NetflixOrder', NetflixOrderSchema);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Middleware pour vérifier le token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ success: false, error: 'Token manquant' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ success: false, error: 'Token invalide' });
        req.user = user;
        next();
    });
};

// Routes
app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'API ES_COMPANY en ligne', timestamp: new Date() });
});

// Admin Login
app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Pour la première fois, créer un admin par défaut
        const adminCount = await Admin.countDocuments();
        if (adminCount === 0) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await Admin.create({
                username: 'admin',
                password: hashedPassword,
                name: 'Admin ES_COMPANY',
                role: 'admin'
            });
        }

        const admin = await Admin.findOne({ username });
        if (!admin) {
            return res.status(401).json({ success: false, error: 'Identifiants incorrects' });
        }

        const validPassword = await bcrypt.compare(password, admin.password);
        if (!validPassword) {
            return res.status(401).json({ success: false, error: 'Identifiants incorrects' });
        }

        const token = jwt.sign(
            { id: admin._id, username: admin.username, role: admin.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: admin._id,
                username: admin.username,
                name: admin.name,
                role: admin.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
});

// Comments
app.get('/api/comments', authenticateToken, async (req, res) => {
    try {
        const comments = await Comment.find().sort({ date: -1 });
        res.json({ success: true, comments });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/comments', async (req, res) => {
    try {
        const comment = new Comment(req.body);
        await comment.save();
        res.json({ success: true, comment });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/comments/:id', authenticateToken, async (req, res) => {
    try {
        const comment = await Comment.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        res.json({ success: true, comment });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PayPal Orders
app.post('/api/orders/paypal', async (req, res) => {
    try {
        const orderData = req.body;
        
        // Vérifier si le numéro de commande existe déjà
        const existingOrder = await PayPalOrder.findOne({ orderNumber: orderData.orderNumber });
        if (existingOrder) {
            return res.status(400).json({ success: false, error: 'Numéro de commande déjà utilisé' });
        }

        const order = new PayPalOrder(orderData);
        await order.save();
        
        res.json({ 
            success: true, 
            message: 'Commande PayPal enregistrée avec succès',
            order 
        });
    } catch (error) {
        console.error('Erreur création commande PayPal:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/orders/paypal', authenticateToken, async (req, res) => {
    try {
        const { status, limit } = req.query;
        let query = {};
        
        if (status && status !== 'all') {
            query.status = status;
        }
        
        let orders = PayPalOrder.find(query).sort({ date: -1 });
        
        if (limit) {
            orders = orders.limit(parseInt(limit));
        }
        
        const result = await orders;
        res.json({ success: true, orders: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/orders/paypal/:id', authenticateToken, async (req, res) => {
    try {
        const order = await PayPalOrder.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, error: 'Commande non trouvée' });
        }
        res.json({ success: true, order });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/orders/paypal/:id', authenticateToken, async (req, res) => {
    try {
        const order = await PayPalOrder.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        res.json({ success: true, order });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Netflix Orders (pour compatibilité)
app.post('/api/orders', async (req, res) => {
    try {
        const orderData = req.body;
        
        if (orderData.type === 'paypal') {
            const order = new PayPalOrder(orderData);
            await order.save();
            res.json({ success: true, order });
        } else if (orderData.type === 'netflix') {
            const order = new NetflixOrder(orderData);
            await order.save();
            res.json({ success: true, order });
        } else {
            res.status(400).json({ success: false, error: 'Type de commande non supporté' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Dashboard Stats
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
    try {
        const [totalComments, newComments, pendingComments, respondedComments] = await Promise.all([
            Comment.countDocuments(),
            Comment.countDocuments({ status: 'new' }),
            Comment.countDocuments({ status: 'pending' }),
            Comment.countDocuments({ status: 'responded' })
        ]);

        const [totalPayPalOrders, pendingPayPalOrders] = await Promise.all([
            PayPalOrder.countDocuments(),
            PayPalOrder.countDocuments({ status: 'pending' })
        ]);

        const [totalNetflixOrders, pendingNetflixOrders] = await Promise.all([
            NetflixOrder.countDocuments(),
            NetflixOrder.countDocuments({ status: 'pending' })
        ]);

        res.json({
            success: true,
            stats: {
                comments: { total: totalComments, new: newComments, pending: pendingComments, responded: respondedComments },
                paypal: { total: totalPayPalOrders, pending: pendingPayPalOrders },
                netflix: { total: totalNetflixOrders, pending: pendingNetflixOrders }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Recent Activity
app.get('/api/dashboard/activity', authenticateToken, async (req, res) => {
    try {
        const [recentComments, recentPayPalOrders, recentNetflixOrders] = await Promise.all([
            Comment.find().sort({ date: -1 }).limit(5),
            PayPalOrder.find().sort({ date: -1 }).limit(5),
            NetflixOrder.find().sort({ date: -1 }).limit(5)
        ]);

        const activities = [];

        recentComments.forEach(comment => {
            activities.push({
                type: 'comment',
                id: comment._id,
                title: `${comment.fullName}`,
                description: `Nouveau commentaire: ${comment.subject || 'Sans sujet'}`,
                status: comment.status,
                date: comment.date,
                icon: 'fas fa-comments'
            });
        });

        recentPayPalOrders.forEach(order => {
            activities.push({
                type: 'paypal',
                id: order._id,
                title: `${order.customerName}`,
                description: `Nouvelle commande PayPal: ${order.orderNumber}`,
                status: order.status,
                date: order.date,
                icon: 'fab fa-paypal'
            });
        });

        recentNetflixOrders.forEach(order => {
            activities.push({
                type: 'netflix',
                id: order._id,
                title: `${order.customerName}`,
                description: `Nouvelle commande Netflix: ${order.plan}`,
                status: order.status,
                date: order.date,
                icon: 'fab fa-netflix'
            });
        });

        // Trier par date
        activities.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        res.json({ success: true, activities: activities.slice(0, 10) });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
