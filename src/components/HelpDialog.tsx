import React, { useEffect, useRef } from 'react';
import { X, Hand, CircleAlert, ZoomIn, Crosshair, Trash2, PlusCircle, ArrowLeft, ArrowRight, ArrowLeftToLine, ArrowRightToLine, Play, ChevronsUpDown, ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react';
import { PiMouseLeftClickFill, PiMouseScroll } from 'react-icons/pi';
import { Key } from '@/components/Key';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpDialog: React.FC<Props> = ({ isOpen, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Focus Management
  useEffect(() => {
    if (isOpen) {
      const previouslyFocused = document.activeElement as HTMLElement;
      requestAnimationFrame(() => {
        containerRef.current?.focus();
      });
      return () => {
        previouslyFocused?.focus();
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      ref={containerRef}
      tabIndex={-1} 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm outline-none" 
      onClick={onClose}
    >
      <div className="bg-gray-900 border border-gray-750 rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        {/* Header (Lighter - 850) */}
        <div className="flex justify-between items-center p-6 border-b border-gray-800 bg-gray-850">
          <h2 className="text-2xl font-bold text-white tracking-tight">Keyboard Shortcuts</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white transition p-1.5 rounded-lg border border-transparent focus-visible:border-active outline-none"
          >
            <X size={24} />
          </button>
        </div>
        
        {/* Body (Main - 900) */}
        <div className="p-8 overflow-y-auto custom-scrollbar bg-gray-900">
          <div className="grid grid-cols-2 gap-16">
            
            {/* Left Column */}
            <div className="space-y-12">
              
              {/* Playback & View */}
              <section>
                <h3 className="text-active font-bold mb-6 uppercase tracking-wider text-sm border-b border-gray-800 pb-2">Playback & View</h3>
                <dl className="grid grid-cols-[min-content_1fr] gap-x-6 gap-y-5 items-baseline">
                  
                  <dt className="flex justify-end whitespace-nowrap"><Key>Space</Key></dt>
                  <dd className="text-gray-300 text-base">
                    <div className="flex items-center gap-3">
                      <span>Start playback (auto-pauses)</span>
                      <Play size={20} className="text-active" />
                    </div>
                    <div className="flex gap-2 items-center text-gray-500">
                      <span>or hold to play continuously</span>
                    </div>
                  </dd>
                  
                  <dt className="flex justify-end items-center gap-2 whitespace-nowrap">
                     <Key>Scroll</Key>
                     <PiMouseScroll size={20} className="text-gray-300" />
                  </dt>
                  <dd className="text-gray-300 text-base flex items-center gap-3">
                     <span>Zoom in/out</span>
                     <ZoomIn size={20} className="text-active" />
                  </dd>
                  
                  <dt className="flex justify-end items-center gap-2 whitespace-nowrap">
                     <Key>Drag</Key>
                     <PiMouseLeftClickFill size={20} className="text-gray-300" />
                  </dt>
                  <dd className="text-gray-300 text-base flex items-center gap-3">
                     <span>Pan view</span>
                     <Hand size={20} className="text-active" />
                  </dd>

                  <dt className="flex justify-end whitespace-nowrap items-center">
                    <Key>Ctrl</Key><Key>+</Key> <span className="text-gray-500 text-sm mx-1">/</span> <Key>-</Key>
                  </dt>
                  <dd className="text-gray-300 text-base flex items-center gap-3">
                    <span>Adjust trail length</span>
                    <ChevronsUpDown size={20} className="text-active" />
                  </dd>

                  <dt className="flex justify-end whitespace-nowrap"><Key>Esc</Key></dt>
                  <dd className="text-gray-300 text-base flex items-center gap-3">
                    <span>Show/hide this help</span>
                    <HelpCircle size={20} className="text-active" />
                  </dd>
                </dl>
              </section>

              {/* Tracking */}
              <section>
                <h3 className="text-active font-bold mb-6 uppercase tracking-wider text-sm border-b border-gray-800 pb-2">Tracking</h3>
                <dl className="grid grid-cols-[min-content_1fr] gap-x-6 gap-y-5 items-baseline">
                  
                  <dt className="flex justify-end whitespace-nowrap items-center gap-1.5">
                      <Key>Ctrl</Key> 
                      <PiMouseLeftClickFill size={20} className="text-gray-300" />
                  </dt>
                  <dd className="text-gray-300 text-base flex items-center gap-3">
                      <span>Log location for active object</span>
                      <Crosshair size={20} className="text-active" />
                  </dd>
                  
                  <dt className="flex justify-end whitespace-nowrap items-center">
                     <Key>Tab</Key> <span className="text-gray-500 text-sm mx-1">/</span> <Key>Shift</Key><Key>Tab</Key>
                  </dt>
                  <dd className="text-gray-300 text-base flex items-center gap-3">
                    <span>Cycle next / previous object</span>
                    <div className="flex items-center text-active">
                      <ChevronLeft size={20} />
                      <ChevronRight size={20} />
                    </div>
                  </dd>
                  
                  <dt className="flex justify-end whitespace-nowrap"><Key>N</Key></dt>
                  <dd className="text-gray-300 text-base flex items-center gap-3">
                      <span>Add new object track</span>
                      <PlusCircle size={20} className="text-active" />
                  </dd>
                  
                  <dt className="flex justify-end whitespace-nowrap"><Key>X</Key></dt>
                  <dd className="text-gray-300 text-base flex items-center gap-3">
                      <span>Delete current record</span>
                      <Trash2 size={20} className="text-active" />
                  </dd>
                </dl>
              </section>
            </div>

            {/* Right Column */}
            <div className="space-y-12">
              {/* Navigation */}
              <section>
                <h3 className="text-active font-bold mb-6 uppercase tracking-wider text-sm border-b border-gray-800 pb-2">Navigation</h3>
                
                <dl className="grid grid-cols-[min-content_1fr] gap-x-6 gap-y-8 items-baseline">
                  
                  <dt className="flex justify-end whitespace-nowrap"><Key>R</Key></dt>
                  <dd className="text-gray-300 text-base">
                    <div className="flex items-center gap-3">
                        <span>Rewind to previous record</span>
                        <ArrowLeft size={20} className="text-active" />
                    </div>
                    <div className="flex gap-2 items-center text-gray-500">
                      <span>or rewind by one sampling interval</span>
                      <CircleAlert size={16}/>
                    </div>
                  </dd>
                  
                  <dt className="flex justify-end whitespace-nowrap"><Key>Shift</Key><Key>R</Key></dt>
                  <dd className="text-gray-300 text-base">
                     <div className="flex items-center gap-3">
                        <span>Rewind to first record</span>
                        <ArrowLeftToLine size={20} className="text-active" />
                     </div>
                     <div className="flex gap-2 items-center text-gray-500">
                      <span>or rewind to first frame</span>
                      <CircleAlert size={16}/>
                    </div>
                  </dd>
                  
                  <dt className="flex justify-end whitespace-nowrap"><Key>F</Key></dt>
                  <dd className="text-gray-300 text-base">
                    <div className="flex items-center gap-3">
                        <span>Forward to next record</span>
                        <ArrowRight size={20} className="text-active" />
                    </div>
                    <div className="flex gap-2 items-center text-gray-500">
                      <span>or forward by one sampling interval</span>
                      <CircleAlert size={16}/>
                    </div>
                  </dd>
                  
                  <dt className="flex justify-end whitespace-nowrap"><Key>Shift</Key><Key>F</Key></dt>
                  <dd className="text-gray-300 text-base flex items-center gap-3">
                      <span>Forward to final record</span>
                      <ArrowRightToLine size={20} className="text-active" />
                  </dd>
                </dl>
                <div className="mt-8 flex gap-2 items-start text-gray-500">
                  <CircleAlert size={16} className="mt-0.5 shrink-0" />
                  <span>Alternative action if the active track has no previous or future records</span>
                </div>
              </section>
            </div>

          </div>
        </div>
        
        {/* Footer (Lighter - 850) */}
        <div className="p-5 border-t border-gray-800 bg-gray-850 text-center text-sm text-gray-500">
          Click outside or press Esc to close
        </div>
      </div>
    </div>
  );
};