import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export const DATE_RANGE_STORAGE_KEY = 'global_date_range';

export type GlobalDateRange = {
  startDate: string;
  endDate: string;
};

type DateRangeContextValue = {
  range: GlobalDateRange;
  rangeKey: string;
  setRange: (next: GlobalDateRange) => Promise<void>;
  resetToToday: () => Promise<void>;
};

const getTodayIso = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const toValidIso = (value: unknown) => {
  const text = String(value || '');
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
};

const getDefaultRange = (): GlobalDateRange => {
  const today = getTodayIso();
  return {
    startDate: today,
    endDate: today,
  };
};

const DateRangeContext = createContext<DateRangeContextValue | null>(null);

export function DateRangeProvider({ children }: { children: ReactNode }) {
  const [range, setRangeState] = useState<GlobalDateRange>(getDefaultRange());

  useEffect(() => {
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(DATE_RANGE_STORAGE_KEY);

        if (!raw) {
          return;
        }

        const parsed = JSON.parse(raw);
        const startDate = toValidIso(parsed?.startDate);
        const endDate = toValidIso(parsed?.endDate);

        if (!startDate || !endDate) {
          return;
        }

        setRangeState(
          startDate <= endDate
            ? { startDate, endDate }
            : { startDate: endDate, endDate: startDate }
        );
      } catch {
        // ignore and keep default
      }
    };

    load();
  }, []);

  const setRange = useCallback(async (next: GlobalDateRange) => {
    const start = toValidIso(next.startDate);
    const end = toValidIso(next.endDate);

    if (!start || !end) {
      return;
    }

    const normalized =
      start <= end
        ? { startDate: start, endDate: end }
        : { startDate: end, endDate: start };

    setRangeState(normalized);

    try {
      await AsyncStorage.setItem(
        DATE_RANGE_STORAGE_KEY,
        JSON.stringify(normalized)
      );
    } catch {
      // ignore persistence failure
    }
  }, []);

  const resetToToday = useCallback(async () => {
    const today = getTodayIso();
    await setRange({ startDate: today, endDate: today });
  }, [setRange]);

  const value = useMemo(
    () => ({
      range,
      rangeKey: `${range.startDate}_${range.endDate}`,
      setRange,
      resetToToday,
    }),
    [range, setRange, resetToToday]
  );

  return (
    <DateRangeContext.Provider value={value}>{children}</DateRangeContext.Provider>
  );
}

export function useDateRange() {
  const context = useContext(DateRangeContext);

  if (!context) {
    throw new Error('useDateRange must be used inside DateRangeProvider');
  }

  return context;
}
