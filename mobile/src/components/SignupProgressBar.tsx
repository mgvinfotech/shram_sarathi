import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  currentStep: number; // 1-based
  totalSteps?: number;
  labels?: string[];
}

const defaultLabels = ['रोल', 'मोबाइल', 'प्रोफाइल', 'लोकेशन', 'KYC', 'पूर्ण'];

export default function SignupProgressBar({
  currentStep,
  totalSteps = 6,
  labels = defaultLabels,
}: Props) {
  return (
    <View style={styles.wrapper}>
      {/* Connecting line behind dots */}
      <View style={styles.lineContainer}>
        <View style={styles.lineBase} />
        <View
          style={[
            styles.lineProgress,
            { width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` },
          ]}
        />
      </View>

      {/* Step dots */}
      <View style={styles.dotsRow}>
        {Array.from({ length: totalSteps }).map((_, i) => {
          const step = i + 1;
          const done = step < currentStep;
          const active = step === currentStep;
          return (
            <View key={step} style={styles.stepItem}>
              <View
                style={[
                  styles.dot,
                  done && styles.dotDone,
                  active && styles.dotActive,
                ]}
              >
                {done ? (
                  <Text style={styles.dotCheck}>✓</Text>
                ) : (
                  <Text style={[styles.dotNum, active && styles.dotNumActive]}>
                    {step}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.label,
                  active && styles.labelActive,
                  done && styles.labelDone,
                ]}
                numberOfLines={1}
              >
                {labels[i] || step}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const PRIMARY = '#FF6B00';
const DONE_COLOR = '#4CAF50';

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  lineContainer: {
    position: 'absolute',
    top: 30,
    left: 30,
    right: 30,
    height: 3,
  },
  lineBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
  },
  lineProgress: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: PRIMARY,
    borderRadius: 2,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  stepItem: {
    alignItems: 'center',
    width: 48,
  },
  dot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    zIndex: 1,
  },
  dotActive: {
    backgroundColor: PRIMARY,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  dotDone: {
    backgroundColor: DONE_COLOR,
  },
  dotNum: {
    fontSize: 12,
    fontWeight: '700',
    color: '#999',
  },
  dotNumActive: {
    color: '#fff',
  },
  dotCheck: {
    fontSize: 13,
    fontWeight: '900',
    color: '#fff',
  },
  label: {
    fontSize: 9,
    color: '#aaa',
    textAlign: 'center',
    fontWeight: '500',
  },
  labelActive: {
    color: PRIMARY,
    fontWeight: '700',
  },
  labelDone: {
    color: DONE_COLOR,
    fontWeight: '600',
  },
});
