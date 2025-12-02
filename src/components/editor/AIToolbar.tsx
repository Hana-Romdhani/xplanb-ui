import { useState, useRef, useEffect } from 'react';
import { Mic, Check, Volume2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { toast } from 'sonner';

interface VoiceToolbarProps {
  onVoiceText: (text: string) => void;
  selectedText: string;
}

export default function VoiceToolbar({ onVoiceText, selectedText }: VoiceToolbarProps) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    // Check if browser supports Web Speech API
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported in this browser');
      return;
    }

    // Initialize speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      toast.success('Voice input started. Speak now...');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        }
      }

      if (finalTranscript.trim()) {
        onVoiceText(finalTranscript.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error === 'no-speech') {
        toast.error('No speech detected. Please try again.');
      } else if (event.error === 'audio-capture') {
        toast.error('No microphone found. Please check your microphone settings.');
      } else if (event.error === 'not-allowed') {
        toast.error('Microphone access denied. Please allow microphone access.');
      } else {
        toast.error('Voice recognition error: ' + event.error);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onVoiceText]);

  const handleVoiceInput = () => {
    if (!recognitionRef.current) {
      toast.error('Speech recognition not supported in this browser');
      return;
    }

    if (!isListening) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Failed to start recognition:', error);
        toast.error('Failed to start voice input');
      }
    } else {
      recognitionRef.current.stop();
      toast.info('Voice input stopped');
    }
  };

  const handleReadAloud = () => {
    if (!selectedText) {
      toast.error('Please select text to read');
      return;
    }

    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(selectedText);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 1;

      speechSynthesis.speak(utterance);
      toast.success('Reading selected text...');
    } else {
      toast.error('Text-to-speech not supported in this browser');
    }
  };

  return (
    <Card className="p-3 rounded-xl border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Voice Input */}
        <Button
          variant="outline"
          size="sm"
          className={`rounded-xl ${isListening
              ? 'bg-red-100 dark:bg-red-900/20 border-red-500 text-red-700 dark:text-red-400'
              : 'bg-white dark:bg-card'
            }`}
          onClick={handleVoiceInput}
        >
          <Mic className={`w-4 h-4 mr-2 ${isListening ? 'animate-pulse' : ''}`} />
          {isListening ? 'Listening...' : 'Voice Input'}
        </Button>

        {/* Text to Speech */}
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl bg-white dark:bg-card"
          onClick={handleReadAloud}
        >
          <Volume2 className="w-4 h-4 mr-2" />
          Read Aloud
        </Button>
      </div>
    </Card>
  );
}

// Add TypeScript declarations for Web Speech API
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}
