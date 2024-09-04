import { db } from './firebase.js';
import { countryTimeZones } from '../utils/countries.js';

export const createRoutineForUser = async (phone_number, routine) => {
  try {
    // Consulta para encontrar el usuario por su número de teléfono
    const querySnapshot = await db
      .collection('users')
      .where('phone_number', '==', phone_number)
      .get();

    if (querySnapshot.empty) {
      throw new Error('No user found with the given phone number.');
    }

    // Toma el primer documento encontrado
    const userDoc = querySnapshot.docs[0];

    // Agrega un nuevo documento a la subcolección `rutinas_recomendadas`
    await userDoc.ref.collection('rutinas_recomendadas').add(routine);

    console.log('Routine added successfully.');
  } catch (error) {
    console.error('Error adding routine to user:', error);
    throw new Error('Error adding routine to user');
  }
};

export const getUsers = async phone => {
  const querySnapshot = await db
    .collection('users')
    .where('phone_number', '==', phone)
    .get();
  const docs = querySnapshot.docs.map(doc => ({
    ...doc.data(),
  }));
  const hasData = docs.length > 0;
  return { hasData, data: docs };
};

export const createUser = async (phone_number, display_name, thread_id) => {
  await db.collection('users').add({
    phone_number,
    display_name,
    thread_id,
  });
};

export const updateUser = async (phone, thread_id) => {
  const querySnapshot = await db
    .collection('users')
    .where('phone_number', '==', phone)
    .get();

  if (querySnapshot.empty) {
    throw new Error('No user found with the given phone number.');
  }

  const userDoc = querySnapshot.docs[0];
  await userDoc.ref.update({
    thread_id,
  });
};

export const getDataUsersWithTraining = async phone => {
  try {
    // Consulta a la colección 'users' donde el campo 'phone' es igual a phone
    const querySnapshot = await db
      .collection('users')
      .where('phone_number', '==', phone)
      .get();

    if (querySnapshot.empty) {
      return { hasData: false, data: null };
    }

    // Toma el primer documento encontrado
    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();

    // Consulta a la subcolección 'entrenamiento' dentro del documento de usuario encontrado
    const trainingSnapshot = await userDoc.ref
      .collection('entrenamiento')
      .get();
    const trainingData = trainingSnapshot.docs.map(trainingDoc => ({
      id: trainingDoc.id,
      ...trainingDoc.data(),
    }));

    // Consulta a la subcolección 'nutricion' dentro del documento de usuario encontrado
    const nutritionSnapshot = await userDoc.ref.collection('nutricion').get();
    const nutritionData = nutritionSnapshot.docs.map(nutritionDoc => ({
      id: nutritionDoc.id,
      ...nutritionDoc.data(),
    }));

    // Construye la estructura de datos
    const result = {
      ...userData,
      entrenamiento: trainingData,
      nutricion: nutritionData,
    };

    // Retorna la estructura deseada
    return { hasData: true, data: result };
  } catch (error) {
    console.error('Error fetching user training and nutrition data:', error);
    throw new Error('Error fetching user training and nutrition data');
  }
};

export const getRecommendedRoutinesForUser = async phone_number => {
  try {
    // Consulta para encontrar el usuario por su número de teléfono
    const querySnapshot = await db
      .collection('users')
      .where('phone_number', '==', phone_number)
      .get();

    if (querySnapshot.empty) {
      throw new Error('No user found with the given phone number.');
    }

    // Toma el primer documento encontrado
    const userDoc = querySnapshot.docs[0];

    // Consulta para obtener todos los documentos de la subcolección `rutinas_recomendadas`
    const routinesSnapshot = await userDoc.ref
      .collection('rutinas_recomendadas')
      .get();

    // Mapea los datos de las rutinas
    const routines = routinesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return routines;
  } catch (error) {
    console.error('Error fetching routines for user:', error);
    throw new Error('Error fetching routines for user');
  }
};

export const updateRoutineForUser = async (
  phone_number,
  routineName,
  updatedRoutine,
) => {
  try {
    // Consulta para encontrar el usuario por su número de teléfono
    const querySnapshot = await db
      .collection('users')
      .where('phone_number', '==', phone_number)
      .get();

    if (querySnapshot.empty) {
      throw new Error('No user found with the given phone number.');
    }

    // Toma el primer documento encontrado
    const userDoc = querySnapshot.docs[0];

    // Consulta para encontrar la rutina por su nombre
    const routineSnapshot = await userDoc.ref
      .collection('rutinas_recomendadas')
      .where('nombre', '==', routineName)
      .get();

    if (routineSnapshot.empty) {
      throw new Error('No routine found with the given name.');
    }

    // Toma el primer documento de la rutina encontrada
    const routineDoc = routineSnapshot.docs[0];

    // Filtra los valores undefined de la rutina actualizada
    const filteredUpdatedRoutine = Object.fromEntries(
      Object.entries(updatedRoutine).filter(
        ([key, value]) => value !== undefined,
      ),
    );

    // Actualiza el documento de la rutina
    await routineDoc.ref.update(filteredUpdatedRoutine);

    console.log('Routine updated successfully.');
    return 'Routine updated successfully.';
  } catch (error) {
    console.error('Error updating routine for user:', error);
    throw new Error('Error updating routine for user');
  }
};

export const updateUserData = async (phone_number, userData) => {
  try {
    const querySnapshot = await db
      .collection('users')
      .where('phone_number', '==', phone_number)
      .get();

    if (querySnapshot.empty) {
      throw new Error('No user found with the given phone number.');
    }

    const userDoc = querySnapshot.docs[0];
    const updateData = {};

    if (userData.edad !== undefined) {
      updateData.edad = userData.edad;
    }
    if (userData.meta !== undefined) {
      updateData.meta = userData.meta;
    }
    if (userData.pais !== undefined) {
      updateData.pais = userData.pais;
    }
    if (userData.peso !== undefined) {
      updateData.peso = userData.peso;
    }
    if (userData.altura !== undefined) {
      updateData.altura = userData.altura;
    }
    if (userData.nivel_actividad_fisica !== undefined) {
      updateData.nivel_actividad_fisica = userData.nivel_actividad_fisica;
    }

    await userDoc.ref.update(updateData);

    console.log('User data updated successfully.');
    return 'User data updated successfully.';
  } catch (error) {
    console.error('Error updating user data:', error);
    throw new Error('Error updating user data');
  }
};

export const getUserCountry = async phone => {
  try {
    console.log('Fetching user country for phone number:', phone);

    const querySnapshot = await db
      .collection('users')
      .where('phone_number', '==', phone)
      .get();

    if (querySnapshot.empty) {
      throw new Error('No user found with the given phone number.');
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();

    console.log('User data:', userData);

    return userData.pais; // Cambiado de country a pais
  } catch (error) {
    console.error('Error fetching user country:', error);
    throw new Error('Error fetching user country');
  }
};

// Función para obtener la hora local basada en el país del usuario
export const getCurrentTimeByCountry = async phone => {
  try {
    const country = await getUserCountry(phone);

    if (!country) {
      throw new Error(
        'Country not found for user. Please update your profile with a valid country.',
      );
    }

    console.log('Country found:', country);

    const timeZone = countryTimeZones[country];

    if (!timeZone) {
      throw new Error(
        `Time zone not found for country: ${country}. Please update your profile with a valid country.`,
      );
    }

    console.log('Time zone found:', timeZone);

    const localTime = new Date().toLocaleString('en-US', { timeZone });
    return localTime;
  } catch (error) {
    console.error('Error getting current time by country:', error);
    throw new Error(error.message);
  }
};
