import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text } from 'react-native';

interface VoiceTextInputProps {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
    label?: string;
}

const VoiceTextInput: React.FC<VoiceTextInputProps> = ({ 
    value, 
    onChangeText, 
    placeholder, 
    keyboardType = 'default',
    label 
}) => {
    const [isListening, setIsListening] = useState(false);

    const toggleListening = () => {
        // In a real implementation, this would trigger react-native-voice
        setIsListening(!isListening);
    };

    return (
        <View style={styles.container}>
            {label && <Text style={styles.label}>{label}</Text>}
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor="#999"
                    keyboardType={keyboardType}
                />
                <TouchableOpacity onPress={toggleListening} style={styles.micButton}>
                    {/* Placeholder for Mic Icon, typically you'd use react-native-vector-icons */}
                    <Text style={{ color: isListening ? '#F26333' : '#666', fontSize: 18 }}>
                        {isListening ? '🎙️' : '🎤'}
                    </Text>
                </TouchableOpacity>
            </View>
            {isListening && <Text style={styles.listeningText}>Listening...</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 6,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        backgroundColor: '#FAFAFA',
    },
    input: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        fontSize: 16,
        color: '#333',
    },
    micButton: {
        padding: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listeningText: {
        fontSize: 12,
        color: '#F26333',
        marginTop: 4,
        fontStyle: 'italic',
    }
});

export default VoiceTextInput;
