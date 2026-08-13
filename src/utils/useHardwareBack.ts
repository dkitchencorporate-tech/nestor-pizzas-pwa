import { useEffect } from 'react';

// Global stack to keep track of open modals
const modalStack: (() => void)[] = [];

// Listen to popstate globally ONCE
let isInitialized = false;

function initGlobalListener() {
  if (isInitialized) return;
  isInitialized = true;
  
  window.addEventListener('popstate', () => {
    // If the user pressed back, pop the top modal
    if (modalStack.length > 0) {
      const topClose = modalStack.pop();
      if (topClose) topClose();
      
      // If there are still modals open, push the hash back so the next back button press works
      if (modalStack.length > 0) {
        window.history.pushState({ modalOpen: true }, '', '#modal');
      }
    }
  });
}

export function useHardwareBack(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    initGlobalListener();
    
    if (!isOpen) return;

    modalStack.push(onClose);
    
    // If this is the first modal, push state.
    if (modalStack.length === 1) {
      window.history.pushState({ modalOpen: true }, '', '#modal');
    }

    return () => {
      // Remove from stack if unmounted via UI
      const index = modalStack.indexOf(onClose);
      if (index !== -1) {
        modalStack.splice(index, 1);
        
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
  }, [isOpen, onClose]);
}
