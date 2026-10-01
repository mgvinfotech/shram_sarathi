import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image } from 'react-native';
import AIVoiceWidget from '../../components/AIVoiceWidget';

const services = [
    { id: 'LABOUR', title: 'मजदूर', desc: 'बुकिंग फीस ₹20', icon: '👷' },
    { id: 'KARIGAR', title: 'कारीगर / मिस्त्री', desc: 'बुकिंग फीस ₹20', icon: '🔧' },
    { id: 'DRIVER', title: 'ड्राइवर', desc: 'बुकिंग फीस ₹20', icon: '🚗' },
    { id: 'CONTRACTOR', title: 'ठेकेदार', desc: '100% निःशुल्क बुकिंग', icon: '🏗️' },
    { id: 'TRANSPORT', title: 'ट्रांसपोर्ट (माल ढुलाई)', desc: 'पिकअप, छोटा हाथी, ट्रक, लोडर', icon: '🚛' },
];

const CustomerHomeScreen = ({ navigation }: any) => {
    const handleServiceSelect = (serviceId: string) => {
        if (serviceId === 'LABOUR') {
            navigation.navigate('LabourRequest');
        } else if (serviceId === 'KARIGAR') {
            navigation.navigate('KarigarBooking');
        } else if (serviceId === 'DRIVER') {
            navigation.navigate('DriverBooking');
        } else if (serviceId === 'CONTRACTOR') {
            navigation.navigate('ContractProposalCreate');
        } else if (serviceId === 'TRANSPORT') {
            navigation.navigate('TransportBooking');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.locationContainer}>
                    <Text style={styles.locationLabel}>आपकी लोकेशन</Text>
                    <Text style={styles.locationText}>📍 Sector 62, Noida 🔽</Text>
                </View>
                <TouchableOpacity style={styles.profilePic}>
                    <Text>👤</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
                <AIVoiceWidget 
                    promptText="नमस्ते! आज आपको कौन सी सेवा चाहिए? आप माइक बटन दबाकर बोल भी सकते हैं।"
                />

                <View style={styles.banner}>
                    <Text style={styles.bannerTitle}>विश्वसनीय कामगार,</Text>
                    <Text style={styles.bannerSubtitle}>अब आपके आस-पास</Text>
                </View>

                <Text style={styles.sectionTitle}>हमारी सेवाएं (Our Services)</Text>

                <View style={styles.servicesGrid}>
                    {services.map(service => (
                        <TouchableOpacity 
                            key={service.id} 
                            style={styles.serviceCard}
                            onPress={() => handleServiceSelect(service.id)}
                        >
                            <View style={styles.iconContainer}>
                                <Text style={styles.serviceIcon}>{service.icon}</Text>
                            </View>
                            <Text style={styles.serviceTitle}>{service.title}</Text>
                            <Text style={styles.serviceDesc}>{service.desc}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.recentBookings}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>आपकी हालिया बुकिंग</Text>
                        <Text style={styles.seeAll}>सभी देखें</Text>
                    </View>
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>अभी तक कोई बुकिंग नहीं की गई है।</Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F7FA',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#FFFFFF',
    },
    locationContainer: {
        flex: 1,
    },
    locationLabel: {
        fontSize: 12,
        color: '#666',
    },
    locationText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 2,
    },
    profilePic: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#E0E0E0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    banner: {
        backgroundColor: '#F26333',
        borderRadius: 12,
        padding: 20,
        marginVertical: 16,
    },
    bannerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    bannerSubtitle: {
        fontSize: 16,
        color: '#FFFFFF',
        marginTop: 4,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    servicesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    serviceCard: {
        backgroundColor: '#FFFFFF',
        width: '48%',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#F5F7FA',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    serviceIcon: {
        fontSize: 28,
    },
    serviceTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
    },
    serviceDesc: {
        fontSize: 12,
        color: '#4CAF50',
        textAlign: 'center',
        marginTop: 4,
    },
    recentBookings: {
        marginTop: 8,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    seeAll: {
        fontSize: 14,
        color: '#F26333',
        fontWeight: '500',
    },
    emptyState: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
    },
    emptyStateText: {
        color: '#999',
        fontSize: 14,
    }
});

export default CustomerHomeScreen;
