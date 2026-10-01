import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StepIndicatorProps {
    currentStep: number;
    totalSteps: number;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, totalSteps }) => {
    return (
        <View style={styles.container}>
            <View style={styles.progressContainer}>
                {Array.from({ length: totalSteps }).map((_, index) => {
                    const stepNumber = index + 1;
                    const isActive = stepNumber <= currentStep;
                    
                    return (
                        <View key={index} style={styles.stepWrapper}>
                            <View style={[styles.dot, isActive ? styles.activeDot : styles.inactiveDot]} />
                            {index < totalSteps - 1 && (
                                <View style={[styles.line, isActive && stepNumber < currentStep ? styles.activeLine : styles.inactiveLine]} />
                            )}
                        </View>
                    );
                })}
            </View>
            <Text style={styles.text}>
                Step {currentStep} of {totalSteps}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingVertical: 15,
        alignItems: 'center',
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    stepWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    activeDot: {
        backgroundColor: '#F26333',
    },
    inactiveDot: {
        backgroundColor: '#E0E0E0',
    },
    line: {
        width: 30,
        height: 2,
        marginHorizontal: 4,
    },
    activeLine: {
        backgroundColor: '#F26333',
    },
    inactiveLine: {
        backgroundColor: '#E0E0E0',
    },
    text: {
        fontSize: 12,
        color: '#666',
        fontWeight: '500',
    },
});

export default StepIndicator;
