const db = require('../database'); // connexion MySQL

exports.showDashboard = (req, res) => {
  const { role, userId, name, email } = req.session;
    

  if (role === 'etudiant') {
    const querySlots = `
      SELECT s.*, u.name AS teacher_name, b.id AS booking_id, b.student_id
      FROM slots s
      LEFT JOIN bookings b ON s.id = b.slot_id
      JOIN users u ON u.id = s.teacher_id
    `;

    const queryMessages = `
      SELECT m.*, u.name AS sender_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.receiver_id = ?
    `;

    db.query(querySlots, (err, slots) => {
      if (err) {
        console.error("Erreur SQL (étudiant) :", err);
        return res.render('error', { message: "Erreur lors du chargement du tableau de bord étudiant.", title: "Erreur" });
      }

      db.query(queryMessages, [userId], (err2, messages) => {
        if (err2) {
          console.error("Erreur chargement messages :", err2);
          return res.render('error', { message: "Erreur chargement messages", title: "Erreur" });
        }

        const unreadCount = messages.filter(m => m.lu === 0).length;

        res.render('dashboard_student', {
          user: { name, email },
          session: req.session,
          slots,
          messages,
          unreadCount,
          title: "Dashboard Étudiant"
        });
      });
    });

  } else if (role === 'enseignant') {
  const querySlots = `
    SELECT s.*, u.name AS teacher_name, b.id AS booking_id, b.student_id, stu.name AS student_name
    FROM slots s
    LEFT JOIN bookings b ON s.id = b.slot_id
    LEFT JOIN users stu ON b.student_id = stu.id
    JOIN users u ON u.id = s.teacher_id
    WHERE s.teacher_id = ?
  `;

  const queryMessages = `
    SELECT m.*, u.name AS sender_name
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.receiver_id = ?
  `;

  db.query(querySlots, [userId], (err, slots) => {
    if (err) {
      console.error("Erreur SQL (enseignant) :", err);
      return res.render('error', {
        message: "Erreur lors du chargement du tableau de bord enseignant.",
        title: "Erreur"
      });
    }

    db.query(queryMessages, [userId], (err2, messages) => {
      if (err2) {
        console.error("Erreur chargement messages :", err2);
        return res.render('error', {
          message: "Erreur chargement messages",
          title: "Erreur"
        });
      }

      const unreadCount = messages.filter(m => m.lu === 0).length;

      // ✅ Calcul du total d'heures réservées (chaque créneau réservé = 1h)
      const totalHours = slots.filter(s => s.booking_id).length;

      res.render('dashboard_teacher', {
        user: { name, email },
        session: req.session,
        slots,
        messages,
        unreadCount,
        totalHours, // ✅ On envoie totalHours à la vue
        title: "Dashboard Enseignant"
      });
    });
  });
}

};
