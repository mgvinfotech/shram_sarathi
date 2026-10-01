<?php

namespace App\Services;

use Aws\Polly\PollyClient;
use Illuminate\Support\Facades\Log;

class PollyService
{
    private PollyClient $polly;

    public function __construct()
    {
        $this->polly = new PollyClient([
            'version'     => 'latest',
            'region'      => env('AWS_DEFAULT_REGION', 'ap-south-1'),
            'credentials' => [
                'key'    => env('AWS_ACCESS_KEY_ID', ''),
                'secret' => env('AWS_SECRET_ACCESS_KEY', ''),
            ],
        ]);
    }

    /**
     * Generate MP3 audio from text using AWS Polly (Hindi voice: Aditi).
     *
     * @return string Raw MP3 bytes
     * @throws \RuntimeException on failure
     */
    public function generateAudio(string $text): string
    {
        try {
            $result = $this->polly->synthesizeSpeech([
                'Text'         => $text,
                'OutputFormat' => 'mp3',
                'VoiceId'      => 'Aditi',
                'LanguageCode' => 'hi-IN',
                'Engine'       => 'standard',
            ]);

            return $result['AudioStream']->getContents();
        } catch (\Exception $e) {
            Log::error("AWS Polly TTS failed: {$e->getMessage()}");
            throw new \RuntimeException('Audio generation failed: ' . $e->getMessage());
        }
    }
}
