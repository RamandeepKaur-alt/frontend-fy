"use client";

import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";

interface VoiceSearchButtonProps {
  onTranscript: (text: string) => void;
  onError?: (error: string) => void;
}

export default function VoiceSearchButton({ onTranscript, onError }: VoiceSearchButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check if browser supports Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setIsSupported(true);
      const Recognition = SpeechRecognition;
      recognitionRef.current = new Recognition();
      
      const recognition = recognitionRef.current;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        setIsProcessing(false);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setIsProcessing(true);
        onTranscript(transcript);
        
        // Stop listening after getting result
        setTimeout(() => {
          stopListening();
        }, 100);
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        setIsProcessing(false);
        
        let errorMessage = "Voice recognition error";
        if (event.error === "no-speech") {
          errorMessage = "No speech detected. Please try again.";
        } else if (event.error === "audio-capture") {
          errorMessage = "Microphone not found. Please check your microphone.";
        } else if (event.error === "not-allowed") {
          errorMessage = "Microphone permission denied. Please allow microphone access.";
        }
        
        if (onError) {
          onError(errorMessage);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setIsProcessing(false);
      };
    } else {
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onTranscript, onError]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        // Check if recognition is already running
        if (recognitionRef.current.state === 'running' || recognitionRef.current.state === 'starting') {
          return;
        }
        recognitionRef.current.start();
      } catch (error: any) {
        // Handle the "already started" error gracefully
        if (error.name === 'InvalidStateError' || error.message?.includes('already started')) {
          // Recognition is already running, just update the state
          setIsListening(true);
          return;
        }
        console.error("Error starting recognition:", error);
        if (onError) {
          onError("Failed to start voice recognition. Please try again.");
        }
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setIsProcessing(false);
    }
  };

  const handleClick = () => {
    if (!isSupported) {
      if (onError) {
        onError("Voice search is not supported on this browser.");
      }
      return;
    }

    if (isListening) {
      stopListening();
    } else {
      // Ensure recognition is stopped before starting
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors when stopping
        }
      }
      // Small delay to ensure recognition is fully stopped
      setTimeout(() => {
        startListening();
      }, 100);
    }
  };

  if (!isSupported) {
    return (
      <button
        onClick={handleClick}
        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
        title="Voice search is not supported on this browser"
      >
        <MicOff className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        className={`p-2 rounded-lg transition-all ${
          isListening
            ? "bg-red-100 text-red-600 animate-pulse"
            : isProcessing
            ? "bg-green-100 text-green-600"
            : "text-gray-600 hover:bg-gray-100"
        }`}
        title={isListening ? "Listening... Click to stop" : "Click to start voice search"}
      >
        {isProcessing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Mic className={`w-4 h-4 ${isListening ? "animate-pulse" : ""}`} />
        )}
      </button>
      
      {isListening && (
        <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap z-50">
          Listening...
          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
        </div>
      )}
    </div>
  );
}


