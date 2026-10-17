import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Linking,
  Share,
  Platform,
} from 'react-native';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

const EMERGENCY_CONTACTS = [
  { name: 'National Emergency Helpline', number: '112', icon: 'shield-alert', color: '#dc2626' },
  { name: 'Disaster Management & Flood Control', number: '1077', icon: 'water-alert', color: '#0284c7' },
  { name: 'Ambulance & Medical Emergency', number: '108', icon: 'medical-bag', color: '#16a34a' },
  { name: 'Fire & Rescue Service', number: '101', icon: 'fire-truck', color: '#ea580c' },
];

export default function SosModal({ visible, onClose, userCoords }) {
  const handleCall = (number) => {
    Linking.openURL(`tel:${number}`).catch(() => {
      Toast.show({
        type: 'error',
        text1: 'Call Failed',
        text2: `Could not trigger phone dialer for ${number}`,
      });
    });
  };

  const handleShareLocation = async () => {
    if (!userCoords) {
      Toast.show({
        type: 'info',
        text1: 'Acquiring GPS',
        text2: 'Locating current position for emergency share...',
      });
      return;
    }

    const mapUrl = `https://maps.google.com/?q=${userCoords.lat},${userCoords.lng}`;
    const message = `EMERGENCY ALERT: I am stranded in a waterlogged/flooded area. My live GPS coordinates are: ${userCoords.lat.toFixed(5)}, ${userCoords.lng.toFixed(5)}. Map link: ${mapUrl}`;

    try {
      await Share.share({
        message,
        title: 'Emergency RainRoute Location SOS',
      });
    } catch (e) {
      console.warn('Share error:', e);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.sosBadge}>
                <Text style={styles.sosBadgeText}>SOS</Text>
              </View>
              <View>
                <Text style={styles.title}>Emergency Assistance</Text>
                <Text style={styles.subtitle}>Direct hotlines & emergency broadcast</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Quick Share Live Location Card */}
            <TouchableOpacity style={styles.shareCard} onPress={handleShareLocation} activeOpacity={0.85}>
              <View style={styles.shareIconWrap}>
                <MaterialIcons name="share-location" size={24} color="#ffffff" />
              </View>
              <View style={styles.shareTextWrap}>
                <Text style={styles.shareTitle}>Broadcast My Location SOS</Text>
                <Text style={styles.shareSub}>
                  {userCoords
                    ? `Live: ${userCoords.lat.toFixed(4)}, ${userCoords.lng.toFixed(4)}`
                    : 'Share GPS coordinates & map link'}
                </Text>
              </View>
              <Feather name="send" size={18} color="#ffffff" />
            </TouchableOpacity>

            {/* Emergency Contacts List */}
            <Text style={styles.sectionHeader}>Emergency Helplines (Tap to Call)</Text>
            <View style={styles.contactsGrid}>
              {EMERGENCY_CONTACTS.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.contactCard}
                  onPress={() => handleCall(item.number)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.contactIconWrap, { backgroundColor: `${item.color}18` }]}>
                    <Ionicons name="call" size={20} color={item.color} />
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{item.name}</Text>
                    <Text style={[styles.contactNumber, { color: item.color }]}>Dial {item.number}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
                </TouchableOpacity>
              ))}
            </View>

            {/* Vital Safety Instructions */}
            <Text style={styles.sectionHeader}>Monsoon Safety Protocol</Text>
            <View style={styles.safetyCard}>
              <View style={styles.safetyRow}>
                <Text style={styles.safetyBullet}>🚫</Text>
                <Text style={styles.safetyText}>
                  <Text style={styles.bold}>Never drive through submerged underpasses:</Text> 6 inches of water stalls engines; 12-18 inches can float vehicles.
                </Text>
              </View>
              <View style={styles.safetyRow}>
                <Text style={styles.safetyBullet}>⚡</Text>
                <Text style={styles.safetyText}>
                  <Text style={styles.bold}>Watch for electrical hazards:</Text> Avoid fallen power cables, submerged transformer boxes, and electrified water poles.
                </Text>
              </View>
              <View style={styles.safetyRow}>
                <Text style={styles.safetyBullet}>🕳️</Text>
                <Text style={styles.safetyText}>
                  <Text style={styles.bold}>Open storm drains:</Text> Floods dislodge manhole covers. Stick to the crown/center of elevated roads.
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
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
    maxHeight: '88%',
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sosBadge: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sosBadgeText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
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
  shareCard: {
    backgroundColor: '#dc2626',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  shareIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareTextWrap: {
    flex: 1,
  },
  shareTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  shareSub: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 4,
  },
  contactsGrid: {
    gap: 10,
    marginBottom: 20,
  },
  contactCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  contactNumber: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  safetyCard: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fef3c7',
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  safetyRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  safetyBullet: {
    fontSize: 14,
    marginTop: 1,
  },
  safetyText: {
    flex: 1,
    fontSize: 12,
    color: '#92400e',
    lineHeight: 18,
  },
  bold: {
    fontWeight: '700',
    color: '#78350f',
  },
});
