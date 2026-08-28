/**
 * orderAlarm.ts  v3 — DEFINITIVO
 * ────────────────────────────────────────────────────────────────
 * Motor de alarma 100% local basado en Web Audio API.
 * Sin archivos externos. Sin dependencia de red.
 *
 * REGLA CLAVE DEL NAVEGADOR:
 * AudioContext SIEMPRE requiere un gesto del usuario para crearse
 * en cada carga de página. Por eso armAlarm() debe llamarse desde
 * un click real del usuario en CADA sesión (no persiste entre recargas).
 * ────────────────────────────────────────────────────────────────
 */

let audioCtx: AudioContext | null = null;
let alarmInterval: ReturnType<typeof setInterval> | null = null;
let isPlaying = false;

// ─────────────────────────────────────────────────────────────
// ARMAR — llamar SIEMPRE desde un click real del usuario
// ─────────────────────────────────────────────────────────────
export async function armAlarm(): Promise<void> {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }
}

// ─────────────────────────────────────────────────────────────
// BEEP — genera un tono puro de duración fija (auto-destruye sus nodos)
// ─────────────────────────────────────────────────────────────
function beep(freq: number, dur: number, vol = 1.0) {
  if (!audioCtx || audioCtx.state !== 'running') return;
  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = 'square';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(vol, audioCtx.currentTime + 0.01);
  gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + dur);
  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + dur + 0.01);
}

// ─────────────────────────────────────────────────────────────
// CICLO DE SIRENA — patrón 7 tonos ~1.3 s
// ─────────────────────────────────────────────────────────────
function sirenCycle() {
  beep(1320, 0.13);
  setTimeout(() => beep(950,  0.13), 145);
  setTimeout(() => beep(1320, 0.13), 290);
  setTimeout(() => beep(950,  0.13), 435);
  setTimeout(() => beep(680,  0.22), 670);
  setTimeout(() => beep(920,  0.22), 940);
  setTimeout(() => beep(680,  0.22), 1190);
}

// ─────────────────────────────────────────────────────────────
// INICIAR — reanuda el contexto si fue suspendido, luego suena
// ─────────────────────────────────────────────────────────────
export async function startAlarm(): Promise<void> {
  if (isPlaying) return;
  if (!audioCtx) return; // No armado aún — no hacer nada
  if (audioCtx.state === 'suspended') {
    try { await audioCtx.resume(); } catch { return; }
  }
  if (audioCtx.state !== 'running') return;

  isPlaying = true;
  sirenCycle();
  alarmInterval = setInterval(sirenCycle, 1800);
}

// ─────────────────────────────────────────────────────────────
// DETENER — cancela el intervalo. NO suspende el contexto.
// ─────────────────────────────────────────────────────────────
export function stopAlarm(): void {
  isPlaying = false;
  if (alarmInterval !== null) {
    clearInterval(alarmInterval);
    alarmInterval = null;
  }
  // ⚠️ NO llamamos a audioCtx.suspend() — hacerlo impediría sonar en el siguiente pedido.
}

// Para saber si hay un AudioContext activo en esta sesión
export function isArmed(): boolean {
  return !!(audioCtx && audioCtx.state !== 'closed');
}
