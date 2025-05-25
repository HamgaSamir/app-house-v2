const express = require('express');
const session = require('express-session');
const path = require('path');
const bodyParser = require('body-parser');
const engine = require('ejs-mate');
const expressLayouts = require('express-ejs-layouts');

const { requireLogin } = require('./middlewares/auth');
const PORT = process.env.PORT || 3000;

const app = express();

// 🧠 Moteur de templates
app.engine('ejs', engine);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layout'); // layout par défaut
app.use(expressLayouts);

// 🔐 Session
app.use(session({
  secret: 'rayane2009+',
  resave: false,
  saveUninitialized: false
}));

// 📦 Middlewares globaux
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// 🌍 Expose session dans les vues
app.use((req, res, next) => {
  res.locals.session = req.session || null;
  next();
});

// 📁 Routes
app.use('/', require('./routes/auth'));
app.use('/dashboard', require('./routes/dashboard'));
app.use('/slots', require('./routes/slots'));
app.use('/', require('./routes/bookings'));
app.use('/messages', require('./routes/messages'));
app.use('/api', require('./routes/api')); // seulement si tu as des routes API

// 🏠 Route d'accueil
app.get('/', (req, res) => {
  res.redirect('/login');
});

// ❌ Gestion des erreurs serveur
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { message: "Une erreur interne est survenue." });
});

// 🚀 Lancement du serveur
app.listen(PORT, () => {console.log(`Serveur démarré sur le port ${PORT}`);});
