import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../constants/colors';

export default function AppHeader() {
  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.name}>Rajesh Kumar</Text>
        <Text style={styles.date}>Sat, 11 Apr, 2026</Text>
      </View>

      <View style={styles.iconRow}>
        {/* <Feather name="search" size={20} color={COLORS.white} /> */}
        {/* <Feather name="maximize" size={20} color={COLORS.white} /> */}
        <Ionicons name="notifications-outline" size={20} color={COLORS.white} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.white,
  },
  date: {
    fontSize: 12,
    color: '#DCE7FF',
    marginTop: 4,
  },
  iconRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
});