import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Speech from 'expo-speech';

interface AIVoiceWidgetProps {
    promptText: string;
    onAudioPlay?: () => void;
    onAudioRecord?: () => void;
}

const AIVoiceWidget: React.FC<AIVoiceWidgetProps> = ({ promptText, onAudioPlay, onAudioRecord }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isRecording, setIsRecording] = useState(false);

    const handlePlay = () => {
        if (isPlaying) {
            Speech.stop();
            setIsPlaying(false);
        } else {
            setIsPlaying(true);
            Speech.speak(promptText, {
                language: 'hi-IN', // Hinting Hindi
                onDone: () => setIsPlaying(false),
                onStopped: () => setIsPlaying(false),
                onError: () => setIsPlaying(false),
            });
            if (onAudioPlay) onAudioPlay();
        }
    };

    const handleRecord = () => {
        setIsRecording(!isRecording);
        if (onAudioRecord) onAudioRecord();
    };

    return (
        <View style={styles.container}>
            <View style={styles.textContainer}>
                <Text style={styles.prompt}>{promptText}</Text>
            </View>
            <View style={styles.actions}>
                <TouchableOpacity style={styles.actionButton} onPress={handlePlay}>
                    <Text style={{ fontSize: 24 }}>{isPlaying ? '⏸️' : '▶️'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={handleRecord}>
                    <Text style={{ fontSize: 24, color: isRecording ? 'red' : 'black' }}>
                        {isRecording ? '⏹️' : '🎤'}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#E6F0FA', // Light blue background as mentioned in PDF
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 10,
        borderWidth: 1,
        borderColor: '#B3D4F0',
    },
    textContainer: {
        flex: 1,
        paddingRight: 10,
    },
    prompt: {
        fontSize: 14,
        color: '#003366',
        fontWeight: '500',
        lineHeight: 20,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    }
});

export default AIVoiceWidget;
