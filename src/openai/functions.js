import {
  getDataUsersWithTraining,
  getUsers,
  createRoutineForUser,
  updateUserData,
  getCurrentTimeByCountry,
  getRecommendedRoutinesForUser,
  updateRoutineForUser,
} from '../database/getData.js';

export const getConsulta = async phone => {
  try {
    const result = await getDataUsersWithTraining(phone);
    if (result.hasData) {
      return JSON.stringify(result.data, null, 2);
    } else {
      return 'No user found with the given phone number.';
    }
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
};

export const getUser = async phone => {
  try {
    const result = await getUsers(phone);
    if (result.hasData) {
      return JSON.stringify(result.data, null, 2);
    } else {
      return 'No user found with the given phone number.';
    }
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
};

export const addRoutineForUser = async (phone, routine) => {
  try {
    await createRoutineForUser(phone, routine);
    return 'Routine added successfully.';
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
};

export const updateUserPersonalData = async (phone, data) => {
  try {
    await updateUserData(phone, data);
    return 'User data updated successfully.';
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
};

export const getLocalTimeForUser = async phone => {
  try {
    const localTime = await getCurrentTimeByCountry(phone);
    return `The current local time for the user in their country is: ${localTime}`;
  } catch (error) {
    console.error('Error getting local time for user:', error.message);
    throw error;
  }
};

export const getUserRoutines = async phone => {
  try {
    const routines = await getRecommendedRoutinesForUser(phone);
    return JSON.stringify(routines, null, 2);
  } catch (error) {
    console.error('Error getting user routines:', error.message);
    throw error;
  }
};

export const updateUserRoutine = async (phone, routineName, updatedRoutine) => {
  try {
    await updateRoutineForUser(phone, routineName, updatedRoutine);
    return 'Routine updated successfully.';
  } catch (error) {
    console.error('Error updating routine:', error.message);
    throw error;
  }
};
