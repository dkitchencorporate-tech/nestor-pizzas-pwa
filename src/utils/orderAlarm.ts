/**
 * orderAlarm.ts
 * Motor de alarma de pedidos basado en Web Audio API.
 * Sin archivos externos. Sin dependencia de red.
 * Genera una sirena pulsante bifrecuencia ultra-audible.
 */

let audioCtx: AudioContext | null = null;
let gainNode: GainNode | null = null;
let oscillator1: OscillatorNode | null = null;
let oscillator2: OscillatorNode | null = null;
let alarmInterval: ReturnType<typeof setInterval> | null = null;
let isPlaying = false;

/**
 * Crea el contexto de audio y arma el sistema.
 * DEBE llamarse desde un evento de click del usuario (política del navegador).
 */
export function armAlarm(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      if (!audioCtx || audioCtx.state === 'closed') {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().then(() => resolve()).catch(reject);
      } else {
        resolve();
      }
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Genera un pulso de beep corto con la frecuencia indicada.
 * Crea y destruye sus propios nodos para que cada beep sea limpio.
 */
function playBeep(frequency: number, duration: number, volume: number = 1.0) {
  if (!audioCtx || audioCtx.state !== 'running') return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.type = 'square'; // Onda cuadrada → sonido más agudo, penetrante y molesto
  osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);

  // Volumen máximo con ataque y decay para sonar como alarma real
  gain.gain.setValueAtTime(0, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(volume, audioCtx.currentTime + 0.01);
  gain.gain.linearRampToValueAtTime(volume * 0.8, audioCtx.currentTime + duration - 0.02);
  gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + duration);

  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + duration);
}

/**
 * Patrón de sirena bifrecuencia: hace un ciclo completo (alto + bajo) → silencio → repite.
 * Esto es lo más alarmante posible para el encargado de la cocina.
 */
function sireneCycle() {
  // Beep agudo
  playBeep(1200, 0.12, 1.0);

  setTimeout(() => playBeep(900, 0.12, 1.0), 130);
  setTimeout(() => playBeep(1200, 0.12, 1.0), 260);
  setTimeout(() => playBeep(900, 0.12, 1.0), 390);

  // Segundo grupo con tono más grave (efecto bimodal)
  setTimeout(() => playBeep(660, 0.18, 0.9), 620);
  setTimeout(() => playBeep(880, 0.18, 0.9), 850);
  setTimeout(() => playBeep(660, 0.18, 0.9), 1080);
}

/**
 * Inicia la alarma en modo continuo hasta que se llame a stopAlarm().
 */
export function startAlarm() {
  if (isPlaying) return;
  if (!audioCtx || audioCtx.state !== 'running') return;

  isPlaying = true;
  sireneCycle(); // Primer ciclo inmediato

  alarmInterval = setInterval(() => {
    sireneCycle();
  }, 1800); // Repite cada 1.8 segundos
}

/**
 * Detiene completamente la alarma.
 */
export function stopAlarm() {
  isPlaying = false;
  if (alarmInterval !== null) {
    clearInterval(alarmInterval);
    alarmInterval = null;
  }
  // Silencio inmediato cerrando el contexto y reabriendo para futuros usos
  if (audioCtx && audioCtx.state === 'running') {
    audioCtx.suspend();
  }
}

/**
 * Reanuda el contexto (por si fue suspendido) y vuelve a sonar.
 */
export async function resumeAndStart() {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }
  startAlarm();
}

export function isAlarmArmed(): boolean {
  return !!(audioCtx && audioCtx.state !== 'closed');
}
