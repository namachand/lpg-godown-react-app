import React from 'react';
import { ScrollView, ScrollViewProps, StyleSheet, ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DS } from '../../constants/designSystem';

type Props = ViewProps & {
  children: React.ReactNode;
  refreshControl?: ScrollViewProps['refreshControl'];
};

export default function ScreenContainer({ children, refreshControl }: Props) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: DS.background,
  },
  scroll: {
    flex: 1,
    backgroundColor: DS.background,
  },
  content: {
    paddingBottom: 24,
  },
});