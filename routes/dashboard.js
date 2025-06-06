const express = require('express');
const router = express.Router();
const db = require('../database');
const { requireLogin } = require('../middlewares/auth');
const dashboardController = require('../controllers/dashboardController');

router.get('/', requireLogin, dashboardController.showDashboard, (req, res) => {
  const role = req.session.role;
  const userId = req.session.userId;

  db.query('SELECT * FROM users WHERE id = ?', [userId], (err, results) => {
    if (err || results.length === 0) {
      console.error("Erreur récupération user :", err);
      return res.render('error', { message: "Utilisateur introuvable", title: "Erreur" });
    }

    const user = results[0];

    const sqlMessages = `
      SELECT m.*, u.name AS sender_name
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.receiver_id = ?
    `;

    const sqlUnread = `
      SELECT COUNT(*) AS unreadCount 
      FROM messages 
      WHERE receiver_id = ? AND lu = 0
    `;

    if (role === 'enseignant') {
      const sqlSlots = `
        SELECT s.*, b.id AS booking_id, b.student_id, u.name AS student_name
        FROM slots s
        LEFT JOIN bookings b ON s.id = b.slot_id
        LEFT JOIN users u ON b.student_id = u.id
        WHERE s.teacher_id = ?
      `;

      db.query(sqlSlots, [userId], (err, slots) => {
        if (err) {
          console.error("Erreur récupération des créneaux :", err);
          return res.render('error', { message: "Erreur chargement créneaux", title: "Erreur" });
        }

        db.query(sqlMessages, [userId], (err, messages) => {
          if (err) {
            console.error("Erreur récupération messages :", err);
            return res.render('error', { message: "Erreur chargement messages", title: "Erreur" });
          }

          db.query(sqlUnread, [userId], (err, unreadRows) => {
            if (err) {
              console.error("Erreur récupération non lus :", err);
              return res.render('error', { message: "Erreur chargement compte messages", title: "Erreur" });
            }

            const unreadCount = unreadRows[0]?.unreadCount || 0;
            const totalHours = slots.filter(s => s.booking_id).length;

            res.render('dashboard_teacher', {
              session: req.session,
              user,
              slots,
              messages,
              unreadCount,
              totalHours,
              title: 'Dashboard Enseignant'
            });
          });
        });
      });

    } else {
      const sqlSlotsEtudiant = `
        SELECT s.*, u.name AS teacher_name, b.id AS booking_id, b.student_id
        FROM slots s
        JOIN users u ON s.teacher_id = u.id
        LEFT JOIN bookings b ON s.id = b.slot_id AND b.student_id = ?
      `;

      db.query(sqlSlotsEtudiant, [userId], (err, slots) => {
        if (err) {
          console.error("Erreur récupération créneaux étudiant :", err);
          return res.render('error', { message: "Erreur chargement créneaux", title: "Erreur" });
        }

        db.query(sqlMessages, [userId], (err, messages) => {
          if (err) {
            console.error("Erreur récupération messages étudiant :", err);
            return res.render('error', { message: "Erreur messages", title: "Erreur" });
          }

          db.query(sqlUnread, [userId], (err, unreadRows) => {
            if (err) {
              console.error("Erreur récupération messages non lus étudiant :", err);
              return res.render('error', { message: "Erreur comptage messages", title: "Erreur" });
            }

            const unreadCount = unreadRows[0]?.unreadCount || 0;

            res.render('dashboard_student', {
              session: req.session,
              user,
              slots,
              messages,
              unreadCount,
              title: 'Dashboard Étudiant'
            });
          });
        });
      });
    }
  });
});

module.exports = router;
