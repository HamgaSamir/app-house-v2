const express = require('express');
const router = express.Router();
const db = require('../database');
const { requireLogin } = require('../middlewares/auth');

// Liste des messages reçus
router.get('/', requireLogin, (req, res) => {
  const userId = req.session.userId;

  const sql = `
    SELECT m.*, u.name AS sender_name
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.receiver_id = ?
    
  `;

  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error("Erreur récupération messages :", err);
      return res.render('error', { message: "Erreur chargement messages", title: "Erreur" });
    }

    res.render('messages', {
      session: req.session,
      messages: results,
      title: "Messages reçus"
    });
  });
});

// Formulaire pour envoyer un message
router.get('/send', requireLogin, (req, res) => {
  const sql = 'SELECT id, name FROM users WHERE id != ?';

  db.query(sql, [req.session.userId], (err, results) => {
    if (err) {
      console.error("Erreur récupération utilisateurs :", err);
      return res.render('error', { message: "Erreur chargement utilisateurs", title: "Erreur" });
    }

    res.render('send_message', {
      session: req.session,
      users: results,
      title: "Envoyer un message",
      error: null
    });
  });
});

// Traitement de l’envoi du message
router.post('/send', requireLogin, (req, res) => {
  const sender_id = req.session.userId;
  const { receiver_id, content } = req.body;

  if (!receiver_id || !content) {
    return res.render('send_message', {
      session: req.session,
      users: [], // tu peux aussi refaire un `db.query()` ici si besoin
      title: "Envoyer un message",
      error: "Veuillez remplir tous les champs."
    });
  }

  const sql = `
    INSERT INTO messages (sender_id, receiver_id, content, lu)
    VALUES (?, ?, ?, 0)
  `;

  db.query(sql, [sender_id, receiver_id, content], (err) => {
    if (err) {
      console.error("Erreur insertion message :", err);
      return res.render('send_message', {
        session: req.session,
        users: [],
        title: "Envoyer un message",
        error: "Erreur lors de l'envoi du message."
      });
    }

    res.redirect('/messages');
  });
});

// Voir un message en détail
router.get('/:id', requireLogin, (req, res) => {
  const messageId = req.params.id;
  const userId = req.session.userId;

  const sql = `
    SELECT m.*, us.name AS sender_name, ur.name AS receiver_name
    FROM messages m
    JOIN users us ON m.sender_id = us.id
    JOIN users ur ON m.receiver_id = ur.id
    WHERE m.id = ? AND (m.sender_id = ? OR m.receiver_id = ?)
  `;

  db.query(sql, [messageId, userId, userId], (err, results) => {
    if (err || results.length === 0) {
      console.error("Erreur message détail :", err);
      return res.render('error', { message: "Message introuvable", title: "Erreur" });
    }

    const message = results[0];

    // Marquer comme lu si nécessaire
    if (message.receiver_id === userId && message.lu === 0) {
      db.query('UPDATE messages SET lu = 1 WHERE id = ?', [messageId]);
    }

    res.render('message_detail', {
      session: req.session,
      message,
      title: "Détail du message"
    });
  });
});

// Afficher le formulaire de réponse
router.get('/reply/:id', requireLogin, (req, res) => {
  const receiverId = req.params.id;
  const userId = req.session.userId;

  // Récupérer le nom du destinataire pour affichage
  const sql = 'SELECT name FROM users WHERE id = ?';

  db.query(sql, [receiverId], (err, results) => {
    if (err || results.length === 0) {
      return res.render('error', { title: "Erreur", message: "Utilisateur introuvable." });
    }

    const receiverName = results[0].name;

    res.render('send_message', {
      session: req.session,
      users: [], // on n'a pas besoin de la liste ici
      title: "Répondre à un message",
      error: null,
      receiverId,
      receiverName
    });
  });
});


module.exports = router;
