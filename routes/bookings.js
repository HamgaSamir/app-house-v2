const express = require('express');
const router = express.Router();
const db = require('../database');
const { requireRole } = require('../middlewares/auth');

// Étudiant : Annuler une réservation
router.post('/cancel-booking/:id', requireRole('etudiant'), (req, res) => {
  const bookingId = req.params.id;
  const userId = req.session.userId;

  const checkSql = 'SELECT * FROM bookings WHERE id = ? AND student_id = ?';
  db.query(checkSql, [bookingId, userId], (err, results) => {
    if (err) return res.status(500).send("Erreur serveur");
    if (results.length === 0) return res.status(403).send("Accès refusé ou réservation introuvable");

    const slotId = results[0].slot_id;

    const deleteSql = 'DELETE FROM bookings WHERE id = ?';
    db.query(deleteSql, [bookingId], (err2) => {
      if (err2) return res.status(500).send("Erreur lors de l'annulation");

      db.query('UPDATE slots SET available = 1 WHERE id = ?', [slotId], (err3) => {
        if (err3) console.error("Erreur mise à jour du créneau :", err3);
        res.redirect('/dashboard');
      });
    });
  });
});

// Enseignant : Rejeter une réservation (simple)
router.post('/cancel-booking/:id', requireRole('enseignant'), (req, res) => {
  const bookingId = req.params.id;
  const teacherId = req.session.userId;

  const checkSql = `
    SELECT b.*, s.teacher_id 
    FROM bookings b 
    JOIN slots s ON b.slot_id = s.id 
    WHERE b.id = ? AND s.teacher_id = ?
  `;
  db.query(checkSql, [bookingId, teacherId], (err, results) => {
    if (err) return res.status(500).send("Erreur serveur");
    if (results.length === 0) return res.status(403).send("Réservation introuvable ou accès refusé");

    const slotId = results[0].slot_id;

    const deleteSql = 'DELETE FROM bookings WHERE id = ?';
    db.query(deleteSql, [bookingId], (err2) => {
      if (err2) return res.status(500).send("Erreur lors du rejet");

      db.query('UPDATE slots SET available = 1 WHERE id = ?', [slotId], (err3) => {
        if (err3) console.error("Erreur mise à jour slot :", err3);
        res.redirect('/dashboard');
      });
    });
  });
});

// Étudiant : Afficher formulaire réservation
router.get('/book/:id', requireRole('etudiant'), (req, res) => {
  const slotId = req.params.id;

  // On récupère le slot pour affichage
  const sql = `
    SELECT s.*, u.name AS teacher_name 
    FROM slots s 
    JOIN users u ON s.teacher_id = u.id 
    WHERE s.id = ?
  `;
  db.query(sql, [slotId], (err, results) => {
    if (err || results.length === 0) {
      return res.render('error', { title: "Erreur", message: "Créneau introuvable." });
    }

    res.render('book_slot', {
      slotId,
      session: req.session,
      title: "Réserver un créneau"
    });
  });
});

// Étudiant : Réserver un créneau
router.post('/book/:id', requireRole('etudiant'), (req, res) => {
  const slotId = req.params.id;
  const studentId = req.session.userId;

  const checkSql = 'SELECT * FROM bookings WHERE slot_id = ?';
  db.query(checkSql, [slotId], (err, results) => {
    if (err) {
      console.error("Erreur SQL :", err);
      return res.render('error', { title: "Erreur", message: "Erreur lors de la réservation." });
    }

    if (results.length > 0) {
      return res.render('error', { title: "Erreur", message: "Ce créneau est déjà réservé." });
    }

    const insertSql = `
  INSERT INTO bookings (student_id, slot_id)
  VALUES (?, ? )
`;
    db.query(insertSql, [studentId, slotId], (err2) => {
      if (err2) {
        console.error("Erreur insertion :", err2);
        return res.render('error', { title: "Erreur", message: "Erreur lors de la réservation." });
      }

      db.query('UPDATE slots SET available = 0 WHERE id = ?', [slotId], (err3) => {
        if (err3) console.error("Erreur mise à jour du créneau :", err3);
        res.redirect('/dashboard');
      });
    });
  });
});

router.post('/accept-booking/:id', requireRole('enseignant'), (req, res) => {
  const bookingId = req.params.id;

  const sql = `UPDATE slots SET status = 'accepted' WHERE id = ?`;

  db.query(sql, [bookingId], (err) => {
    if (err) {
      console.error("Erreur d'acceptation :", err);
      return res.render('error', { message: "Erreur de confirmation", title: "Erreur" });
    }

    res.redirect('/dashboard');
  });
});


// Enseignant : Rejeter avec proposition d’un autre créneau
router.post('/reject-booking/:id/with-proposal', requireRole('enseignant'), (req, res) => {
  const bookingId = req.params.id;
  const proposedDate = req.body.proposed_date;
  const teacherId = req.session.userId;

  const getBookingSql = 'SELECT slot_id, student_id FROM bookings WHERE id = ?';
  db.query(getBookingSql, [bookingId], (err, results) => {
    if (err || results.length === 0) {
      return res.render('error', { title: "Erreur", message: "Réservation introuvable." });
    }

    const { slot_id, student_id } = results[0];

    db.query('DELETE FROM bookings WHERE id = ?', [bookingId], (err2) => {
      if (err2) {
        return res.render('error', { title: "Erreur", message: "Erreur lors du rejet." });
      }

      db.query('UPDATE slots SET available = 1 WHERE id = ?', [slot_id], (err3) => {
        if (err3) console.error("Erreur mise à jour slot :", err3);
      });

      db.query(
        'INSERT INTO slots (teacher_id, date, time, available) VALUES (?, ?, ?, 1)',
        [teacherId, proposedDate, '10:00'], // Adapter ici si nécessaire
        (err4, result) => {
          if (err4) {
            return res.render('error', { title: "Erreur", message: "Erreur lors de la création du nouveau créneau." });
          }

          const newSlotId = result.insertId;

          const message = `Votre réservation a été rejetée. Un nouveau créneau est disponible pour le ${proposedDate}.`;

          db.query(
            'INSERT INTO messages (sender_id, receiver_id, content, lu) VALUES (?, ?, ?, 0)',
            [teacherId, student_id, message],
            (err5) => {
              if (err5) console.error("Erreur message :", err5);
              res.redirect('/dashboard');
            }
          );
        }
      );
    });
  });
});

module.exports = router;
