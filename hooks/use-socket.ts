// hooks/use-socket.ts
"use client";

import { useSocket as useSocketFromClient } from "@/lib/socket-client";

class SoundPlayer {
  private audioContext: AudioContext | null = null;
  private initialized = false;
  private buffer: AudioBuffer | null = null;

  async init() {
    if (this.initialized || typeof window === "undefined") return;
    try {
      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const response = await fetch("/mixkit-correct-answer-tone-2870.wav");
      const arrayBuffer = await response.arrayBuffer();
      this.buffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.initialized = true;
    } catch (e) {
      console.error("Error initializing audio:", e);
    }
  }

  async play() {
    if (!this.initialized) await this.init();
    if (!this.audioContext || !this.buffer) return;
    const source = this.audioContext.createBufferSource();
    source.buffer = this.buffer;
    source.connect(this.audioContext.destination);
    source.start(0);
  }
}

export const soundPlayer = new SoundPlayer();
export const useSocket = useSocketFromClient;
export default useSocketFromClient;
