import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';

interface ImageUploadCardProps {
    title: string;
    subtitle?: string;
    onUpload: (uri: string) => void;
}

const ImageUploadCard: React.FC<ImageUploadCardProps> = ({ title, subtitle, onUpload }) => {
    const [imageUri, setImageUri] = useState<string | null>(null);

    const handleUpload = () => {
        // Trigger Image Picker here
        // Simulating upload with dummy URI
        const dummyUri = 'https://via.placeholder.com/150';
        setImageUri(dummyUri);
        onUpload(dummyUri);
    };

    return (
        <View style={styles.container}>
            <View style={styles.textContainer}>
                <Text style={styles.title}>{title}</Text>
                {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
            <TouchableOpacity style={styles.uploadArea} onPress={handleUpload}>
                {imageUri ? (
                    <Image source={{ uri: imageUri }} style={styles.image} />
                ) : (
                    <View style={styles.placeholderContainer}>
                        <Text style={styles.icon}>📷</Text>
                        <Text style={styles.uploadText}>Upload</Text>
                    </View>
                )}
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginVertical: 8,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    textContainer: {
        flex: 1,
        paddingRight: 16,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 12,
        color: '#666',
    },
    uploadArea: {
        width: 80,
        height: 80,
        borderRadius: 8,
        backgroundColor: '#F5F5F5',
        borderWidth: 1,
        borderColor: '#D0D0D0',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    placeholderContainer: {
        alignItems: 'center',
    },
    icon: {
        fontSize: 24,
        marginBottom: 4,
    },
    uploadText: {
        fontSize: 10,
        color: '#666',
        fontWeight: '500',
    },
    image: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    }
});

export default ImageUploadCard;
