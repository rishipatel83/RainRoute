import * as Location from 'expo-location';
import { Alert } from 'react-native';

// For fast initial startup location fetch
export const getFastLocation = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    // First try cached last-known position (instant)
    let location = await Location.getLastKnownPositionAsync({
      maxAge: 60000, // up to 1 min old
    });
    if (location && location.coords) {
      return location.coords;
    }

    // Otherwise quick balanced fetch with low latency
    location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return location ? location.coords : null;
  } catch (err) {
    console.warn('⚠️ Fast location fetch failed:', err.message);
    return null;
  }
};

// For the high-accuracy "My Location" button & report pinning
export const getAccurateLocation = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Location Permission Needed',
        'RainRoute needs location permission to show your position and detect nearby waterlogged routes.'
      );
      return null;
    }

    // Try high accuracy first
    try {
      const location = await Location.getCurrentPositionAsync({ 
        accuracy: Location.Accuracy.High,
      });
      return location.coords;
    } catch (e) {
      // Fallback to balanced accuracy if GPS satellite lock fails (e.g. indoors)
      const fallbackLoc = await Location.getCurrentPositionAsync({ 
        accuracy: Location.Accuracy.Balanced,
      });
      return fallbackLoc.coords;
    }
  } catch (error) {
    console.warn('⚠️ Accurate GPS lock failed:', error);
    Alert.alert('GPS Signal Low', 'Could not get high-accuracy lock. Using approximate location.');
    return null;
  }
};