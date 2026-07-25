import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AUTH_USER_KEY } from '../../constants/auth';
import { DS, TYPO, RADIUS, PALETTE, WEIGHT } from '../../constants/designSystem';
import { useDateRange } from '../../context/DateRangeContext';

const WebDateInput: any = 'input';

export default function AppHeader() {
  const { range, setRange, resetToToday } = useDateRange();

  const [userName, setUserName] = useState('');

  useEffect(() => {
    const loadUserName = async () => {
      try {
        const raw = await AsyncStorage.getItem(AUTH_USER_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        const name = typeof parsed?.name === 'string' ? parsed.name.trim() : '';
        setUserName(name);
      } catch {
        setUserName('');
      }
    };

    loadUserName();
  }, []);

  const [modalVisible, setModalVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'start' | 'end'>('start');
  const [draftStart, setDraftStart] = useState(new Date(`${range.startDate}T00:00:00`));
  const [draftEnd, setDraftEnd] = useState(new Date(`${range.endDate}T00:00:00`));

  const formatHeaderDate = useMemo(() => {
    const start = new Date(`${range.startDate}T00:00:00`).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const end = new Date(`${range.endDate}T00:00:00`).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    return range.startDate === range.endDate ? start : `${start} - ${end}`;
  }, [range]);

  const openPicker = (target: 'start' | 'end') => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: target === 'start' ? draftStart : draftEnd,
        mode: 'date',
        display: 'default',
        onValueChange: (_event, selectedDate) => {
          if (!selectedDate) return;

          if (target === 'start') {
            setDraftStart(selectedDate);
          } else {
            setDraftEnd(selectedDate);
          }
        },
      });

      return;
    }

    setPickerTarget(target);
  };

  const toIsoDate = (value: Date) => {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const applyRange = async () => {
    await setRange({
      startDate: toIsoDate(draftStart),
      endDate: toIsoDate(draftEnd),
    });
    setModalVisible(false);
  };

  const openModal = () => {
    setPickerTarget('start');
    setDraftStart(new Date(`${range.startDate}T00:00:00`));
    setDraftEnd(new Date(`${range.endDate}T00:00:00`));
    setModalVisible(true);
  };

  const formatDraftDate = (value: Date) =>
    value.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const pickerValue = pickerTarget === 'start' ? draftStart : draftEnd;

  const isStartActive = pickerTarget === 'start';

  const webInputStyle =
    Platform.OS === 'web'
      ? [
          styles.webInput,
          {
            WebkitTextFillColor: DS.textPrimary,
            outlineStyle: 'none',
          } as any,
        ]
      : styles.webInput;

  const renderWebDateField = (
    label: string,
    value: Date,
    onChangeValue: (nextValue: string) => void
  ) => (
    <View style={styles.webFieldWrap}>
      <Text style={styles.webFieldLabel}>{label}</Text>
      <WebDateInput
        type="date"
        value={toIsoDate(value)}
        onChange={(event: any) => onChangeValue(String(event?.target?.value || ''))}
        style={webInputStyle as any}
      />
    </View>
  );

  const applyWebDateValue = (
    rawValue: string,
    setter: (nextDate: Date) => void
  ) => {
    if (!rawValue) {
      return;
    }

    const nextDate = new Date(`${rawValue}T00:00:00`);

    if (Number.isNaN(nextDate.getTime())) {
      return;
    }

    setter(nextDate);
  };

  return (
    <>
    <View style={styles.container}>
      <View>
        <Text style={styles.name}>{userName || 'User'}</Text>
        <TouchableOpacity style={styles.datePress} onPress={openModal}>
          <Ionicons name="calendar-outline" size={14} color={PALETTE.primary100} />
          <Text style={styles.date}>{formatHeaderDate}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.iconRow}>
        {/* <Feather name="search" size={20} color={DS.white} /> */}
        {/* <Feather name="maximize" size={20} color={DS.white} /> */}
        <Ionicons name="notifications-outline" size={20} color={DS.white} />
      </View>
    </View>

    <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Select Date Range</Text>

          {Platform.OS === 'web' && (
            <View style={styles.webFieldsRow}>
              {renderWebDateField('Start Date', draftStart, (rawValue) => {
                applyWebDateValue(rawValue, setDraftStart);
              })}

              {renderWebDateField('End Date', draftEnd, (rawValue) => {
                applyWebDateValue(rawValue, setDraftEnd);
              })}
            </View>
          )}

          {Platform.OS !== 'web' && (
            <>
              <TouchableOpacity
                style={[styles.dateButton, isStartActive && styles.activeDateButton]}
                onPress={() => openPicker('start')}
              >
                <Text style={styles.dateButtonLabel}>Start Date</Text>
                <Text style={styles.dateButtonValue}>{formatDraftDate(draftStart)}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dateButton, !isStartActive && styles.activeDateButton]}
                onPress={() => openPicker('end')}
              >
                <Text style={styles.dateButtonLabel}>End Date</Text>
                <Text style={styles.dateButtonValue}>{formatDraftDate(draftEnd)}</Text>
              </TouchableOpacity>
            </>
          )}

          {Platform.OS === 'ios' && (
            <View style={styles.pickerWrap}>
              <DateTimePicker
                value={pickerValue}
                mode="date"
                display="inline"
                themeVariant="light"
                accentColor={DS.primary}
                onValueChange={(_event, selectedDate) => {
                  if (pickerTarget === 'start') {
                    setDraftStart(selectedDate);
                  } else {
                    setDraftEnd(selectedDate);
                  }
                }}
              />
            </View>
          )}

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.resetButton} onPress={async () => {
              await resetToToday();
              setModalVisible(false);
            }}>
              <Text style={styles.resetButtonText}>Today</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.applyButton} onPress={applyRange}>
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: DS.primary,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    ...TYPO.h5,
    color: DS.white,
  },
  date: {
    ...TYPO.c1,
    color: PALETTE.primary100,
  },
  datePress: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: DS.card,
    borderRadius: RADIUS.lg,
    padding: 16,
  },
  pickerWrap: {
    marginTop: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: DS.border,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    backgroundColor: DS.card,
    minHeight: 320,
  },
  modalTitle: {
    ...TYPO.s1,
    color: DS.textPrimary,
    marginBottom: 12,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: DS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    backgroundColor: DS.card,
  },
  activeDateButton: {
    borderColor: DS.primary,
    backgroundColor: DS.primarySoft,
  },
  dateButtonLabel: {
    ...TYPO.c2,
    color: DS.textSecondary,
  },
  dateButtonValue: {
    ...TYPO.b4,
    color: DS.textPrimary,
    marginTop: 2,
  },
  webFieldsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  webFieldWrap: {
    flex: 1,
  },
  webFieldLabel: {
    ...TYPO.c2,
    color: DS.textSecondary,
    marginBottom: 6,
  },
  webInput: {
    width: '100%',
    minHeight: 46,
    borderWidth: 1,
    borderColor: DS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    backgroundColor: DS.card,
    color: DS.textPrimary,
    fontSize: 15,
    fontWeight: WEIGHT.semibold,
    opacity: 1,
  },
  modalActions: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  resetButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: DS.border,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    paddingVertical: 12,
  },
  resetButtonText: {
    ...TYPO.b4,
    color: DS.textPrimary,
  },
  applyButton: {
    flex: 1,
    backgroundColor: DS.primary,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    paddingVertical: 12,
  },
  applyButtonText: {
    ...TYPO.b4,
    color: DS.white,
  },
});