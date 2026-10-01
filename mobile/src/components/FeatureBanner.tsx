import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const FeatureBanner = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>विशेषताएं (Features)</Text>
            
            <View style={styles.grid}>
                <View style={styles.featureItem}>
                    <Text style={styles.icon}>🎙️</Text>
                    <Text style={styles.featureText}>हर फ़ील्ड के साथ माइक सपोर्ट</Text>
                </View>
                
                <View style={styles.featureItem}>
                    <Text style={styles.icon}>🔊</Text>
                    <Text style={styles.featureText}>AI वॉइस गाइडेंस (स्थानीय भाषा समर्थन)</Text>
                </View>
                
                <View style={styles.featureItem}>
                    <Text style={styles.icon}>📍</Text>
                    <Text style={styles.featureText}>ऑटो GPS लोकेशन और पता फ़ेच</Text>
                </View>
                
                <View style={styles.featureItem}>
                    <Text style={styles.icon}>✅</Text>
                    <Text style={styles.featureText}>100% सुरक्षित और प्रमाणित</Text>
                </View>

                <View style={[styles.featureItem, styles.bonusItem]}>
                    <Text style={styles.icon}>₹</Text>
                    <Text style={styles.bonusText}>एजेंट कोड पर ₹10 बोनस</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFFDE7', // Light yellow background based on PDF Page 1
        borderRadius: 12,
        padding: 16,
        marginVertical: 20,
        borderWidth: 1,
        borderColor: '#FFF59D',
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    featureItem: {
        width: '48%',
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    icon: {
        fontSize: 20,
        marginRight: 8,
    },
    featureText: {
        fontSize: 12,
        color: '#555',
        flex: 1,
        lineHeight: 16,
    },
    bonusItem: {
        backgroundColor: '#E8F5E9',
        padding: 8,
        borderRadius: 8,
        width: '100%',
        justifyContent: 'center',
    },
    bonusText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#2E7D32',
    }
});

export default FeatureBanner;
