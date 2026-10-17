import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const FAQS = [
  {
    q: 'How does RainRoute warn me about waterlogging and road hazards?',
    a: 'When you search a destination or select a route, RainRoute computes the polyline path and evaluates its mathematical proximity against all live hazard points. If any point lies within a 75-meter hazard buffer, the app warns you immediately and suggests a safe detour.',
  },
  {
    q: 'Why do reports automatically expire after 6 hours?',
    a: 'Monsoon flash floods and localized rainwater naturally recede over time. To avoid cluttering the live navigation map with phantom hazards from hours ago, RainRoute uses native MongoDB TTL (Time-To-Live) indexes to automatically expire reports without manual admin intervention.',
  },
  {
    q: 'Do I need an account or login to report an incident?',
    a: 'No! RainRoute is built for zero-friction community collaboration. Anyone can tap "Report Hazard", snap a photo, pick a category, and broadcast the danger to fellow commuters in under 5 seconds.',
  },
  {
    q: 'What is the role of an Administrator?',
    a: 'Authorized municipal admins or moderators can log into the Admin Portal to verify reported hazards, update status to "Fixed / Resolved", or permanently remove resolved hazards once municipal teams clear the road.',
  },
  {
    q: 'How does the Detour Route engine work?',
    a: 'When an active hazard intersects your primary driving corridor, RainRoute dynamically calculates a perpendicular detour waypoint 500 meters around the flooded sector and generates a safe alternative path via OSRM.',
  },
  {
    q: 'Is my personal GPS location stored or tracked?',
    a: 'No. Your real-time location is only processed locally on your device to center the map and compute route geometry. GPS coordinates are only transmitted to our servers when you explicitly submit a hazard report.',
  },
];

export default function FaqModal({ visible, onClose }) {
  const [expandedIndex, setExpandedIndex] = useState(0);

  const toggleExpand = (idx) => {
    setExpandedIndex(expandedIndex === idx ? null : idx);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Frequently Asked Questions</Text>
              <Text style={styles.subtitle}>Everything you need to know about RainRoute</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {FAQS.map((item, index) => {
              const isExpanded = expandedIndex === index;
              return (
                <View key={index} style={styles.faqCard}>
                  <TouchableOpacity
                    style={styles.faqHeader}
                    onPress={() => toggleExpand(index)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.questionText}>{item.q}</Text>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color="#64748b"
                    />
                  </TouchableOpacity>
                  {isExpanded && (
                    <View style={styles.answerContainer}>
                      <Text style={styles.answerText}>{item.a}</Text>
                    </View>
                  )}
                </View>
              );
            })}
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
    maxHeight: '85%',
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
  title: {
    fontSize: 18,
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
    gap: 12,
  },
  faqCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    overflow: 'hidden',
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  questionText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    lineHeight: 18,
  },
  answerContainer: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
  },
  answerText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
});
