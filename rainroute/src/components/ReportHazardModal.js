import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';

export const HAZARD_TYPES = [
  { id: 'waterlogging', label: 'Waterlogging', icon: 'water', color: '#2563eb' },
  { id: 'pothole', label: 'Pothole / Manhole', icon: 'crane', color: '#d97706' },
  { id: 'construction', label: 'Construction', icon: 'traffic-cone', color: '#ea580c' },
  { id: 'obstacle', label: 'Road Obstacle', icon: 'alert-octagon', color: '#dc2626' },
  { id: 'accident', label: 'Accident', icon: 'car-emergency', color: '#9333ea' },
  { id: 'other', label: 'Other Hazard', icon: 'alert-circle', color: '#475569' },
];

export const SEVERITY_LEVELS = [
  { id: 'low', label: 'Low', color: '#10b981' },
  { id: 'medium', label: 'Moderate', color: '#f59e0b' },
  { id: 'high', label: 'Severe', color: '#ef4444' },
];

export default function ReportHazardModal({
  visible,
  onClose,
  onSubmit,
  loading,
  imageUri,
  onRetakePhoto,
  coords,
}) {
  const [selectedType, setSelectedType] = useState('waterlogging');
  const [selectedSeverity, setSelectedSeverity] = useState('medium');
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    onSubmit({
      hazardType: selectedType,
      severity: selectedSeverity,
      description: description.trim(),
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Report Road Hazard</Text>
              <Text style={styles.subtitle}>Help fellow commuters steer clear</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Image Preview & Retake Option */}
            {imageUri ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: imageUri }} style={styles.previewImage} />
                <TouchableOpacity style={styles.retakeBtn} onPress={onRetakePhoto}>
                  <Feather name="camera" size={14} color="#ffffff" />
                  <Text style={styles.retakeText}>Retake</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* GPS Tag Bar */}
            {coords && (
              <View style={styles.gpsBar}>
                <Ionicons name="location-sharp" size={16} color="#2563eb" />
                <Text style={styles.gpsText}>
                  GPS Locked: {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}
                </Text>
              </View>
            )}

            {/* Hazard Category Grid */}
            <Text style={styles.sectionLabel}>Hazard Category</Text>
            <View style={styles.categoryGrid}>
              {HAZARD_TYPES.map((type) => {
                const isSelected = selectedType === type.id;
                return (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.categoryCard,
                      isSelected && { borderColor: type.color, backgroundColor: `${type.color}14` },
                    ]}
                    onPress={() => setSelectedType(type.id)}
                    activeOpacity={0.75}
                  >
                    <MaterialCommunityIcons
                      name={type.icon}
                      size={24}
                      color={isSelected ? type.color : '#64748b'}
                    />
                    <Text
                      style={[
                        styles.categoryCardText,
                        isSelected && { color: type.color, fontWeight: '700' },
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Severity Level */}
            <Text style={styles.sectionLabel}>Severity Level</Text>
            <View style={styles.severityRow}>
              {SEVERITY_LEVELS.map((sev) => {
                const isSelected = selectedSeverity === sev.id;
                return (
                  <TouchableOpacity
                    key={sev.id}
                    style={[
                      styles.severityChip,
                      isSelected && { backgroundColor: sev.color, borderColor: sev.color },
                    ]}
                    onPress={() => setSelectedSeverity(sev.id)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.severityText,
                        isSelected && { color: '#ffffff', fontWeight: '700' },
                      ]}
                    >
                      {sev.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Description Input */}
            <Text style={styles.sectionLabel}>Description (Optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="E.g., Deep waterlogging under flyover, two-wheelers slipping..."
              placeholderTextColor="#94a3b8"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              maxLength={200}
            />
            <Text style={styles.charCount}>{description.length}/200</Text>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={styles.submitBtnText}>Broadcasting Hazard...</Text>
                </View>
              ) : (
                <Text style={styles.submitBtnText}>Publish Live Hazard</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  imagePreviewContainer: {
    position: 'relative',
    height: 150,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 14,
    backgroundColor: '#0f172a',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  retakeBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  retakeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  gpsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 16,
  },
  gpsText: {
    fontSize: 12,
    color: '#1e40af',
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
    marginTop: 4,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryCard: {
    width: '31%',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  categoryCardText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
    textAlign: 'center',
  },
  severityRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  severityChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  severityText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: '#0f172a',
    textAlignVertical: 'top',
    height: 75,
  },
  charCount: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 16,
  },
  submitBtn: {
    backgroundColor: '#dc2626',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
