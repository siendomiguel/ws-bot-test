import { db } from '../database/firebase.js';
import cron from 'node-cron';

const messageDaily = [
  '¡Hola! ¿Listo para tu rutina de hoy?',
  '¡Buenas! No te olvides de entrenar hoy.',
  '¡Saludos! Es hora de moverse. ¿Cómo va tu día?',
  '¡Hey! Un nuevo día para alcanzar tus metas.',
  '¡Qué tal! ¿Cómo va tu entrenamiento hoy?',
  '¡Saludos! Un nuevo día, ¡es hora de tu rutina!',
  '¡Hola! Cada día cuenta para alcanzar tus objetivos.',
  '¡Hola! Asegúrate de hacer tu rutina de hoy.',
  '¡Qué onda! Tu entrenamiento de hoy te está esperando.',
  '¡Hola! Es hora de dedicar tiempo a tu rutina.',
  '¡Buenas! Hoy es un gran día para ponerte en movimiento.',
  '¡Hola! Sigue adelante con tu rutina.',
  '¡Hola! No olvides dedicar tiempo para tu entrenamiento hoy.',
  '¡Hola! La rutina de hoy es importante, ¡hazlo por ti!',
  '¡Saludos! Mantén el ritmo con tu rutina diaria.',
  '¡Qué tal! No te saltes tu rutina hoy, tu futuro yo te lo agradecerá.',
  '¡Hola! Recuerda, cada repetición te acerca a tus metas.',
  '¡Hola! Un día más para hacer que cuente.',
  '¡Hey! La constancia es la clave. ¡Vamos por más hoy!',
  '¡Buenas! Dedica un momento a tu rutina, te sentirás genial después.',
  '¡Hola! Tu esfuerzo diario te llevará lejos. ¡Sigue así!',
  '¡Qué onda! Hoy es otro paso hacia tus objetivos. ¡Hazlo con energía!',
  '¡Saludos! Haz de hoy un día productivo para tu entrenamiento.',
  '¡Hola! No pierdas el impulso, ¡tu rutina de hoy te espera!',
  '¡Hey! Cada día es una nueva oportunidad para mejorar.',
  '¡Qué tal! Vamos, es el momento perfecto para tu entrenamiento.',
];

export const sendDailyNotifications = async () => {
  try {
    // Obtener todos los usuarios
    const usersSnapshot = await db.collection('users').get();
    const usersNotificationsList = [];

    // Iterar sobre los usuarios y verificar la subcolección de notifications
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const notificationsRef = db
        .collection('users')
        .doc(userDoc.id)
        .collection('notifications');

      const querySnapshot = await notificationsRef
        .where('routine_active', '==', true)
        .get();
      if (!querySnapshot.empty) {
        usersNotificationsList.push(userData.phone_number);
      }
    }

    // Enviar notificaciones
    const message =
      messageDaily[Math.floor(Math.random() * messageDaily.length)];
    const url = process.env.SEND_MESSAGE;

    for (const number of usersNotificationsList) {
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          number,
          message,
        }),
      });
    }

    console.log('Daily notifications sent successfully.');
  } catch (error) {
    console.error('Error sending daily notifications:', error);
  }
};

// Programar la tarea diaria a las 8 am hora de Colombia
cron.schedule(
  '0 8 * * *',
  () => {
    console.log('Running daily notifications task');
    sendDailyNotifications();
  },
  {
    scheduled: true,
    timezone: 'America/Bogota',
  },
);
