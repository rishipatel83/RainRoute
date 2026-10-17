import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Alert } from 'react-native';
import { CLOUDINARY_CONFIG } from '../config/cloudinary';

/**
 * Captures a photo and returns both preview URI and base64 string for upload
 */
export const captureHazardPhoto = async () => {
  try {
    const cameraPerm = await ImagePicker.requestCameraPermissionsAsync();
    if (!cameraPerm.granted) {
      Alert.alert('Permission Required', 'Camera access is needed to capture hazard evidence.');
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8, 
      allowsEditing: false,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const uri = result.assets[0].uri;
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 800 } }], 
      { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );

    return {
      uri: manipulatedImage.uri,
      base64: `data:image/jpeg;base64,${manipulatedImage.base64}`,
    };
  } catch (error) {
    console.warn('⚠️ Camera capture error:', error);
    return null;
  }
};

/**
 * Backward compatible single base64 capture
 */
export const openCameraAndGetBase64 = async () => {
  const photo = await captureHazardPhoto();
  return photo ? photo.base64 : null;
};

/**
 * Upload base64 encoded photo to Cloudinary CDN
 */
export const uploadToCloudinary = async (base64Img) => {
  try {
    const payload = { file: base64Img, upload_preset: CLOUDINARY_CONFIG.UPLOAD_PRESET };
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s image upload timeout

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.CLOUD_NAME}/image/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    
    const data = await res.json();
    return data.secure_url || null;
  } catch (error) {
    console.error("Cloudinary Error:", error.message || error);
    return null;
  }
};