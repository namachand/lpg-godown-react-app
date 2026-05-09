import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { DeviceEventEmitter, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import AppHeader from '../../components/common/AppHeader';
import ScreenContainer from '../../components/common/ScreenContainer';
import { APP_ROLE_KEY, APP_ROLES } from '../../constants/appRole';
import { COLORS } from '../../constants/colors';

const activities = [
  {
    title: '50 Domestic cylinders received from HP Gas Depot',
    time: 'Today, 9:30 AM',
    icon: 'arrow-down-circle-outline',
    color: COLORS.green,
    bg: COLORS.greenSoft,
  },
  {
    title: '15 Domestic cylinders allocated to Ravi Kumar',
    time: 'Today, 10:15 AM',
    icon: 'arrow-up-circle-outline',
    color: COLORS.primary,
    bg: COLORS.blueSoft,
  },
  {
    title: '12 empty cylinders returned by Suresh Yadav',
    time: 'Today, 11:00 AM',
    icon: 'refresh-outline',
    color: COLORS.orange,
    bg: COLORS.orangeSoft,
  },
  {
    title: '20 Commercial cylinders allocated to Amit Singh',
    time: 'Today, 12:00 PM',
    icon: 'arrow-up-circle-outline',
    color: COLORS.primary,
    bg: COLORS.blueSoft,
  },
];

export default function GodownProfileScreen() {
  const switchToDriver = async () => {
    await AsyncStorage.setItem(APP_ROLE_KEY, APP_ROLES.DRIVER);
    DeviceEventEmitter.emit('APP_ROLE_CHANGED', APP_ROLES.DRIVER);
    router.replace('/');
  };

  return (
    <ScreenContainer>
      <AppHeader />

      <View style={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.userRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>RK</Text>
            </View>

            <View>
              <Text style={styles.name}>Ravi Kumar</Text>
              <View style={styles.phoneRow}>
                <Ionicons name="call-outline" size={14} color={COLORS.textSecondary} />
                <Text style={styles.phone}>+91 9876543210</Text>
              </View>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoBox}>
              <Ionicons name="shield-outline" size={16} color={COLORS.primary} />
              <View>
                <Text style={styles.infoLabel}>ROLE</Text>
                <Text style={styles.infoValue}>Manager</Text>
              </View>
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="business-outline" size={16} color={COLORS.green} />
              <View>
                <Text style={styles.infoLabel}>AGENCY</Text>
                <Text style={styles.infoValue}>Sri Gas</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={switchToDriver}>
            <Ionicons name="log-out-outline" size={18} color="#EF4444" />
            <Text style={styles.logoutText}>Switch to Driver</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Activity History</Text>

        <View style={styles.filterRow}>
          <TouchableOpacity style={[styles.filterButton, styles.filterActive]}>
            <Text style={[styles.filterText, styles.filterTextActive]}>Today</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.filterButton}>
            <Text style={styles.filterText}>This Week</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.filterButton}>
            <Text style={styles.filterText}>This Month</Text>
          </TouchableOpacity>
        </View>

        {activities.map((item, index) => (
          <View key={index} style={styles.activityCard}>
            <View style={[styles.activityIcon, { backgroundColor: item.bg }]}>
              <Ionicons name={item.icon as any} size={20} color={item.color} />
            </View>

            <View style={styles.activityTextBox}>
              <Text style={styles.activityTitle}>{item.title}</Text>
              <Text style={styles.activityTime}>{item.time}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
  },
  profileCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: COLORS.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 18,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primary,
  },
  name: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  phone: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  infoBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  logoutButton: {
    height: 52,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#FEF2F2',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#EF4444',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  filterActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  filterTextActive: {
    color: COLORS.white,
  },
  activityCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityTextBox: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    lineHeight: 19,
  },
  activityTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 5,
  },
});