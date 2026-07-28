import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { DS, TYPO } from '../../constants/designSystem';

type Props = {
  title: string;
};

export default function SectionTitle({ title }: Props) {
  return <Text style={styles.title}>{title}</Text>;
}

const styles = StyleSheet.create({
  title: {
    ...TYPO.h5,
    color: DS.textPrimary,
    marginBottom: 14,
  },
});