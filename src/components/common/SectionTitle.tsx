import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { COLORS } from '../../constants/colors';

type Props = {
  title: string;
};

export default function SectionTitle({ title }: Props) {
  return <Text style={styles.title}>{title}</Text>;
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 14,
  },
});