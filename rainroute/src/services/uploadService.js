import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Alert } from 'react-native';
import { CLOUDINARY_CONFIG } from '../config/cloudinary';

export const openCameraAndGetBase64 = async () => {
  try {
    const cameraPerm = await ImagePicker.requestCameraPermissionsAsync();
    if (!cameraPerm.granted) {
      Alert.alert('Permission Required', 'Camera access is needed to capture flood evidence.');
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8, 
      allowsEditing: false,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const manipulatedImage = await ImageManipulator.manipulateAsync(
      result.assets[0].uri,
      [{ resize: { width: 800 } }], 
      { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );

    return `data:image/jpeg;base64,${manipulatedImage.base64}`;
  } catch (error) {
    console.warn('⚠️ Camera capture error:', error);
    return null;
  }
};

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