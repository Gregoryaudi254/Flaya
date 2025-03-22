import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToast } from 'react-native-toast-notifications';




// Function to store data in AsyncStorage
export const storeData = async (key, value) => {
  try {
    const jsonValue = JSON.stringify(value); // Convert object to string
    await AsyncStorage.setItem(key, jsonValue); // Store it using the key
    console.log('Data saved');
  } catch (e) {
    console.error('Failed to save data', e);
  }
};

// Function to store data in AsyncStorage
export const deleteData = async (key) => {
  try {

    await AsyncStorage.removeItem(key); // Store it using the key
    console.log('Data deleted');
  } catch (e) {
    console.error('Failed to save data', e);
  }
};

// Function to retrieve data from AsyncStorage
export const getData = async (key) => {
  try {
    const jsonValue = await AsyncStorage.getItem(key); // Retrieve it using the key
    return jsonValue != null ? JSON.parse(jsonValue) : null; // Convert back to object
  } catch (e) {
    console.error('Failed to fetch data', e);
  }
};




