import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface TrustBadgeProps {
    title: string;
    verified?: boolean;
}

const TrustBadge: React.FC<TrustBadgeProps> = ({ title, verified = true }) => {
    return (
        <View style={[styles.container, verified ? styles.verifiedContainer : styles.unverifiedContainer]}>
            <Text style={[styles.icon, verified ? styles.verifiedIcon : styles.unverifiedIcon]}>
                {verified ? '✓' : '!'}
            </Text>
            <Text style={[styles.text, verified ? styles.verifiedText : styles.unverifiedText]}>
                {title}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        alignSelf: 'flex-start',
    },
    verifiedContainer: {
        backgroundColor: '#E8F5E9',
        borderColor: '#4CAF50',
    },
    unverifiedContainer: {
        backgroundColor: '#FFEBEE',
        borderColor: '#F44336',
    },
    icon: {
        fontSize: 12,
        fontWeight: 'bold',
        marginRight: 4,
    },
    verifiedIcon: {
        color: '#4CAF50',
    },
    unverifiedIcon: {
        color: '#F44336',
    },
    text: {
        fontSize: 12,
        fontWeight: '600',
    },
    verifiedText: {
        color: '#2E7D32',
    },
    unverifiedText: {
        color: '#C62828',
    }
});

export default TrustBadge;
