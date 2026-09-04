import { useStoreHoursStore } from '../store/storeHoursStore';

// Check if the store is currently open
export const isStoreOpen = (): boolean => {
  const now = new Date();
  const day = now.getDay();
  const hours = useStoreHoursStore.getState().hours[day];

  if (!hours) return false;

  const currentTime = now.getHours() * 60 + now.getMinutes();
  const [openHour, openMin] = hours.open.split(':').map(Number);
  const [closeHour, closeMin] = hours.close.split(':').map(Number);

  const openTime = openHour * 60 + openMin;
  const closeTime = closeHour * 60 + closeMin;

  return currentTime >= openTime && currentTime <= closeTime;
};

// Generate available time slots for scheduling today
// Returns an array of strings like ["20:30", "20:45", ...]
export const generateAvailableTimeSlots = (intervalMinutes: number = 15): string[] => {
  const now = new Date();
  const day = now.getDay();
  const hours = useStoreHoursStore.getState().hours[day];

  if (!hours) return [];

  const currentTime = now.getHours() * 60 + now.getMinutes();

  const [openHour, openMin] = hours.open.split(':').map(Number);
  const [closeHour, closeMin] = hours.close.split(':').map(Number);

  const openTime = openHour * 60 + openMin;
  const closeTime = closeHour * 60 + closeMin;

  // Start generating slots from the opening time, or from NOW + 30 mins (prep time) if we are already open
  const preparationBuffer = 30; // Minimum minutes ahead to schedule
  const startTime = Math.max(openTime, Math.ceil((currentTime + preparationBuffer) / intervalMinutes) * intervalMinutes);

  const slots: string[] = [];

  for (let t = startTime; t <= closeTime; t += intervalMinutes) {
    const h = Math.floor(t / 60);
    const m = t % 60;

    // Format to HH:MM
    const formattedHour = h.toString().padStart(2, '0');
    const formattedMin = m.toString().padStart(2, '0');

    // For 23:59 we don't want to show "23:59" as a slot, but we can stop before it
    if (formattedHour === '23' && formattedMin === '59') continue;
    if (h >= 24) continue; // Don't overflow to 24:00+

    slots.push(`${formattedHour}:${formattedMin}`);
  }

  return slots;
};
