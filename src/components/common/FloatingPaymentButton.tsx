import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DollarSign, GripVertical, Sparkles } from 'lucide-react';

interface Props {
  onOpenPaymentSearch: () => void;
}

export const FloatingPaymentButton: React.FC<Props> = ({ onOpenPaymentSearch }) => {
  const buttonRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({
    pointerId: -1,
    startX: 0,
    startY: 0,
    posX: 0,
    posY: 0,
    startTime: 0,
    hasMoved: false,
  });

  // Track position in state for persistence
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem('financiera_fab_position_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    const initialX = typeof window !== 'undefined' ? Math.max(16, window.innerWidth - 128) : 220;
    const initialY = typeof window !== 'undefined' ? Math.max(80, window.innerHeight - 150) : 520;
    return { x: initialX, y: initialY };
  });

  const [isPressing, setIsPressing] = useState(false);
  const [isSnapping, setIsSnapping] = useState(false);

  // Keep button within screen bounds on window resize
  useEffect(() => {
    const handleResize = () => {
      const el = buttonRef.current;
      if (!el) return;
      const width = el.offsetWidth || 120;
      const height = el.offsetHeight || 50;
      const maxX = Math.max(12, window.innerWidth - width - 12);
      const maxY = Math.max(60, window.innerHeight - height - 80);

      setCurrentPos(prev => {
        const clampedX = Math.min(Math.max(12, prev.x), maxX);
        const clampedY = Math.min(Math.max(60, prev.y), maxY);
        return { x: clampedX, y: clampedY };
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update physical element transform directly for GPU acceleration
  const updateTransform = (x: number, y: number, animate = false) => {
    if (!buttonRef.current) return;
    if (animate) {
      buttonRef.current.style.transition = 'transform 0.35s cubic-bezier(0.18, 0.89, 0.32, 1.25)';
    } else {
      buttonRef.current.style.transition = 'none';
    }
    buttonRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  };

  // Sync initial and state position to element transform
  useEffect(() => {
    updateTransform(currentPos.x, currentPos.y, false);
  }, [currentPos]);

  // Pointer Down (Mouse or Touch)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only primary button
    if (e.button !== 0) return;

    const el = buttonRef.current;
    if (!el) return;

    el.setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    setIsPressing(true);
    setIsSnapping(false);

    dragStartRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      posX: currentPos.x,
      posY: currentPos.y,
      startTime: Date.now(),
      hasMoved: false,
    };
  };

  // Pointer Move (Zero-reflow direct transform with requestAnimationFrame)
  const rafId = useRef<number | null>(null);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || e.pointerId !== dragStartRef.current.pointerId) return;

    const deltaX = e.clientX - dragStartRef.current.startX;
    const deltaY = e.clientY - dragStartRef.current.startY;

    if (!dragStartRef.current.hasMoved && Math.hypot(deltaX, deltaY) > 5) {
      dragStartRef.current.hasMoved = true;
    }

    if (!dragStartRef.current.hasMoved) return;

    const el = buttonRef.current;
    const width = el?.offsetWidth || 120;
    const height = el?.offsetHeight || 50;

    const maxX = Math.max(10, window.innerWidth - width - 10);
    const maxY = Math.max(60, window.innerHeight - height - 70);

    const nextX = Math.min(Math.max(10, dragStartRef.current.posX + deltaX), maxX);
    const nextY = Math.min(Math.max(60, dragStartRef.current.posY + deltaY), maxY);

    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      updateTransform(nextX, nextY, false);
      dragStartRef.current.posX = nextX;
      dragStartRef.current.posY = nextY;
      dragStartRef.current.startX = e.clientX;
      dragStartRef.current.startY = e.clientY;
    });
  };

  // Pointer Up / End
  const handlePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || e.pointerId !== dragStartRef.current.pointerId) return;

    isDraggingRef.current = false;
    setIsPressing(false);

    const el = buttonRef.current;
    if (el && el.hasPointerCapture(e.pointerId)) {
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
    }

    const duration = Date.now() - dragStartRef.current.startTime;

    // Check if it was a quick tap or genuine drag
    if (!dragStartRef.current.hasMoved && duration < 350) {
      // Direct click / tap! Open payment modal immediately
      onOpenPaymentSearch();
      return;
    }

    // It was a drag: Snap gracefully to the closest side (Left or Right)
    const elWidth = el?.offsetWidth || 120;
    const screenWidth = window.innerWidth;
    const currentX = dragStartRef.current.posX;
    const currentY = dragStartRef.current.posY;

    // Snap to left or right margin (16px)
    const snapToLeft = currentX + elWidth / 2 < screenWidth / 2;
    const targetX = snapToLeft ? 16 : Math.max(16, screenWidth - elWidth - 16);
    const targetY = Math.min(Math.max(65, currentY), window.innerHeight - 130);

    setIsSnapping(true);
    updateTransform(targetX, targetY, true);

    const newPos = { x: targetX, y: targetY };
    setCurrentPos(newPos);

    try {
      localStorage.setItem('financiera_fab_position_v2', JSON.stringify(newPos));
    } catch {
      // Ignore localStorage errors
    }
  };

  return (
    <div
      ref={buttonRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      style={{
        transform: `translate3d(${currentPos.x}px, ${currentPos.y}px, 0)`,
        touchAction: 'none',
        willChange: 'transform',
      }}
      className={`fixed top-0 left-0 z-45 select-none no-print ${
        isSnapping ? 'transition-transform duration-350 ease-out' : ''
      }`}
    >
      <button
        type="button"
        className={`flex items-center gap-2 px-4 py-2.5 sm:px-5 sm:py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-sm rounded-full border-2 border-emerald-300/40 shadow-2xl backdrop-blur-md cursor-pointer transition-all duration-150 active:scale-95 group ring-2 ring-emerald-500/20 hover:ring-emerald-400/50 hover:shadow-emerald-500/30 ${
          isPressing ? 'scale-105 shadow-emerald-500/50 ring-4 ring-emerald-400/70' : ''
        }`}
        title="Botón Pagar Fluido: Arrastra a cualquier orilla o tócalo para registrar un pago rápido"
      >
        {/* Grip indicator */}
        <GripVertical className="w-3.5 h-3.5 text-emerald-200/80 group-hover:text-white transition-colors opacity-70 group-hover:opacity-100" />

        {/* Action Icon Badge */}
        <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center font-black shadow-inner group-hover:bg-white/30 transition-colors">
          <DollarSign className="w-4 h-4 text-white animate-pulse" />
        </div>

        {/* Action Label */}
        <span className="tracking-wide text-xs sm:text-sm font-extrabold pr-0.5 drop-shadow-xs">
          Pagar
        </span>

        {/* Live Pulse Beacon */}
        <span className="relative flex h-2.5 w-2.5 ml-0.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-200 opacity-80"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-100 shadow-xs"></span>
        </span>
      </button>
    </div>
  );
};
