/**
 * orderAlarm.ts
 * Motor de alarma de pedidos basado en Web Audio API.
 * Sin archivos externos. Sin dependencia de red.
 * Genera una sirena pulsante bifrecuencia ultra-audible.
 *
 * BUG FIX: stopAlarm ya NO suspende el AudioContext.
 * Suspenderlo lo dejaba en estado 'suspended' y startAlarm()
 * abortaba silenciosamente al comprobar audioCtx.state !== 'running'.
 */

let audioCtx: AudioContext | null = null;
let alarmInterval: ReturnType<typeof setInterval> | null = null;
let isPlaying = false;

// ─────────────────────────────────────────────
// ARMAR (llamar desde un click de usuario)
// ─────────────────────────────────────────────
export function armAlarm(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      if (!audioCtx || audioCtx.state === 'closed') {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().then(resolve).catch(reject);
      } else {
        resolve();
      }
    } catch (e) {
      reject(e);
    }
  });
}

// ─────────────────────────────────────────────
// GENERAR UN BEEP CORTO (auto-destruye sus nodos)
// ─────────────────────────────────────────────
function playBeep(frequency: number, duration: number, volume: number = 1.0) {
  if (!audioCtx || audioCtx.state !== 'running') return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.type = 'square'; // Onda cuadrada: máxima penetración sonora
  osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);

  gain.gain.setValueAtTime(0, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(volume, audioCtx.currentTime + 0.01);
  gain.gain.linearRampToValueAtTime(volume * 0.85, audioCtx.currentTime + duration - 0.02);
  gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + duration);

  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + duration);
}

// ─────────────────────────────────────────────
// CICLO DE SIRENA bifrecuencia (7 tonos, ~1.3s)
// ─────────────────────────────────────────────
function sirenCycle() {
  // Grupo 1: cuatro pings agudos rápidos
  playBeep(1300, 0.12, 1.0);
  setTimeout(() => playBeep(950,  0.12, 1.0), 140);
  setTimeout(() => playBeep(1300, 0.12, 1.0), 280);
  setTimeout(() => playBeep(950,  0.12, 1.0), 420);

  // Grupo 2: tres pulsos de alerta más graves
  setTimeout(() => playBeep(680,  0.20, 0.95), 660);
  setTimeout(() => playBeep(900,  0.20, 0.95), 920);
  setTimeout(() => playBeep(680,  0.20, 0.95), 1150);
}

// ─────────────────────────────────────────────
// INICIAR ALARMA — intenta reanudar el contexto si está suspendido
// ─────────────────────────────────────────────
export async function startAlarm() {
  if (isPlaying) return;
  if (!audioCtx) return;

  // FIX CLAVE: si el contexto fue suspendido (p.ej. por política del navegador),
  // lo reanudamos antes de intentar reproducir.
  if (audioCtx.state === 'suspended') {
    try {
      await audioCtx.resume();
    } catch (_) {
      return; // Si no se puede reanudar (sin gesto), abortamos sin error
    }
  }

  if (audioCtx.state !== 'running') return;

  isPlaying = true;
  sirenCycle(); // Ciclo inmediato

  alarmInterval = setInterval(() => {
    sirenCycle();
  }, 1800); // Repite cada 1.8 s
}

// ─────────────────────────────────────────────
// DETENER ALARMA — solo cancela el intervalo.
// NO suspende el AudioContext (ese era el bug).
// ─────────────────────────────────────────────
export function stopAlarm() {
  isPlaying = false;
  if (alarmInterval !== null) {
    clearInterval(alarmInterval);
    alarmInterval = null;
  }
  // ✅ NO llamamos a audioCtx.suspend() aquí.
  // Suspenderlo impedía que startAlarm() sonara en el siguiente pedido.
}

export function isAlarmArmed(): boolean {
  return !!(audioCtx && audioCtx.state !== 'closed');
}
