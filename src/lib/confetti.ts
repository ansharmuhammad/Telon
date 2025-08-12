import confetti from 'canvas-confetti';

/**
 * Fires confetti from the center of a given HTML element.
 * @param element The HTML element to use as the origin for the confetti.
 */
export const fireConfettiFromElement = (element: HTMLElement) => {
  const rect = element.getBoundingClientRect();
  const origin = {
    x: (rect.left + rect.width / 2) / window.innerWidth,
    y: (rect.top + rect.height / 2) / window.innerHeight,
  };

  // Fire a burst of confetti
  confetti({
    particleCount: 100,
    spread: 70,
    origin,
    startVelocity: 30,
    gravity: 1.2,
  });
};