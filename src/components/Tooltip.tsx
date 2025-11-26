import React, { useState, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Key } from '@/components/Key';

interface TooltipProps {
  content: string;
  shortcut?: string[]; // Array of keys, e.g. ["Shift", "R"]
  children: React.ReactElement;
  side?: 'top' | 'bottom';
  offset?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({ 
  content, 
  shortcut, 
  children, 
  side = 'top',
  offset = 8 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties>({ opacity: 0, top: 0, left: 0 });
  const triggerRef = useRef<HTMLElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const calculatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const padding = 8; // Viewport padding

    // Initial Preferred Position (Centered X)
    let left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
    let top = side === 'top' 
        ? triggerRect.top - tooltipRect.height - offset 
        : triggerRect.bottom + offset;

    // Horizontal Clamping
    if (left < padding) {
        left = padding;
    } else if (left + tooltipRect.width > window.innerWidth - padding) {
        left = window.innerWidth - padding - tooltipRect.width;
    }

    // Vertical Flipping
    // If we want 'top' but it doesn't fit, try 'bottom'
    if (side === 'top' && top < padding) {
         const alternativeTop = triggerRect.bottom + offset;
         // Check if bottom fits better or at least is inside
         if (alternativeTop + tooltipRect.height <= window.innerHeight - padding) {
             top = alternativeTop;
         }
    }
    // If we want 'bottom' but it doesn't fit, try 'top'
    else if (side === 'bottom' && top + tooltipRect.height > window.innerHeight - padding) {
         const alternativeTop = triggerRect.top - tooltipRect.height - offset;
         if (alternativeTop >= padding) {
             top = alternativeTop;
         }
    }

    // Vertical Clamping (Fallback if flip didn't help or wasn't needed)
    if (top < padding) top = padding;
    if (top + tooltipRect.height > window.innerHeight - padding) {
        top = window.innerHeight - padding - tooltipRect.height;
    }

    setStyle({
        top,
        left,
        opacity: 1
    });
  };

  const show = () => setIsVisible(true);
  const hide = () => {
      setIsVisible(false);
      setStyle(prev => ({ ...prev, opacity: 0 }));
  };

  useLayoutEffect(() => {
    if (isVisible) {
      calculatePosition();
      window.addEventListener('scroll', calculatePosition);
      window.addEventListener('resize', calculatePosition);
      return () => {
        window.removeEventListener('scroll', calculatePosition);
        window.removeEventListener('resize', calculatePosition);
      };
    }
  }, [isVisible, content, side, offset]);

  // Clone child to attach refs and events without adding a wrapper div that breaks flex layouts
  const trigger = React.cloneElement(children, {
    // @ts-ignore
    ref: (node: HTMLElement) => {
        triggerRef.current = node;
        // Handle existing refs on children if they exist
        const { ref } = children as any;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
    },
    onMouseEnter: (e: React.MouseEvent) => {
        show();
        (children.props as any).onMouseEnter?.(e);
    },
    onMouseLeave: (e: React.MouseEvent) => {
        hide();
        (children.props as any).onMouseLeave?.(e);
    },
    onFocus: (e: React.FocusEvent) => {
        show();
        (children.props as any).onFocus?.(e);
    },
    onBlur: (e: React.FocusEvent) => {
        hide();
        (children.props as any).onBlur?.(e);
    },
    title: undefined 
  });

  return (
    <>
      {trigger}
      {isVisible && createPortal(
        <div 
            ref={tooltipRef}
            className="fixed z-[100] pointer-events-none transition-opacity duration-100 ease-out"
            style={style}
        >
          <div className="bg-gray-900 border border-gray-700 text-sm font-medium py-2 px-3 rounded-lg shadow-xl whitespace-nowrap flex items-center gap-2">
            <span>{content}</span>
            {shortcut && (
                <div className="flex items-center ml-2 gap-1">
                    {shortcut.map((k, i) => (
                        <Key key={i}>{k}</Key>
                    ))}
                </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};