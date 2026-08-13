import { useEffect, useRef } from 'react';

// Global stack to keep track of open modals
const modalStack: string[] = [];

// Map to hold stable references to onClose functions
const closeHandlers: Record<string, () => void> = {};

// Listen to popstate globally ONCE
let isInitialized = false;

function initGlobalListener() {
  if (isInitialized) return;
  isInitialized = true;
  
  window.addEventListener('popstate', () => {
    // If the user pressed back, pop the top modal
    if (modalStack.length > 0) {
      const topId = modalStack.pop();
      if (topId && closeHandlers[topId]) {
        closeHandlers[topId]();
        delete closeHandlers[topId];
      }
      
      // If there are still modals open, push the hash back so the next back button press works
      if (modalStack.length > 0) {
        window.history.pushState({ modalOpen: true }, '', '#modal');
      }
    }
  });
}

export function useHardwareBack(isOpen: boolean, onClose: () => void) {
  const idRef = useRef(`modal-${Math.random().toString(36).substr(2, 9)}`);
  const onCloseRef = useRef(onClose);

  // Keep onClose reference up to date without triggering re-renders of the main effect
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    initGlobalListener();
    
    if (!isOpen) return;

    const id = idRef.current;
    modalStack.push(id);
    closeHandlers[id] = () => onCloseRef.current();
    
    // If this is the first modal and we don't already have the hash, push state.
    if (modalStack.length === 1 && window.location.hash !== '#modal') {
      window.history.pushState({ modalOpen: true }, '', '#modal');
    }

    return () => {
      // Remove from stack if unmounted via UI
      const index = modalStack.indexOf(id);
      if (index !== -1) {
        modalStack.splice(index, 1);
        delete closeHandlers[id];
        
        // If we removed the last modal, and the hash is still #modal, pop it.
        // We use setTimeout to prevent race conditions when one modal closes and another opens instantly.
        if (modalStack.length === 0 && window.location.hash === '#modal') {
          setTimeout(() => {
            if (modalStack.length === 0 && window.location.hash === '#modal') {
              window.history.back();
            }
          }, 50);
        }
      }
    };
  }, [isOpen]);
}
