import React, { useState, useRef, useEffect } from 'react';
import type { Project, DetectedObject } from '../types';
import { useEditor } from '../hooks/useEditor';
import { useLanguage } from '../context/LanguageContext';
import { ArrowLeftIcon, SparklesIcon, MagicCropIcon, DownloadIcon, XIcon, HandIcon, ZoomInIcon, ZoomOutIcon, BotIcon, PenToolIcon, UndoIcon, RedoIcon, FitToScreenIcon, UpscaleIcon, MagicRatioIcon } from './icons';

interface EditorProps {
  project: Project;
  onBack: () => void;
  onSave: (projectId: string, newSrc: string) => void;
}

const ASPECT_RATIOS = ["1:1", "4:3", "3:2", "16:9", "9:16"];

export const Editor: React.FC<EditorProps> = ({ project, onBack, onSave }) => {
  const { t } = useLanguage();
  const [isUpscaleMenuOpen, setIsUpscaleMenuOpen] = useState(false);
  const [isRatioMenuOpen, setIsRatioMenuOpen] = useState(false);
  const upscaleButtonRef = useRef<HTMLDivElement>(null);
  const magicRatioButtonRef = useRef<HTMLDivElement>(null);
  
  const {
    prompt,
    setPrompt,
    error,
    cropRect,
    tool,
    isCropModeActive,
    isMagicRatioModeActive,
    magicRatioRect,
    isRatioChanged,
    isPanning,
    isSpacePanning,
    imageContainerRef,
    imageRef,
    transformWrapperRef,
    isAnyLoading,
    isDetecting,
    isIdentifying,
    isUpscaling,
    isExtending,
    displayedLoadingText,
    isExitingLoadingText,
    formattedTime,
    zoom,
    panOffset,
    detectedObjects,
    handlePanToggle,
    handleGenerate,
    handleGenerateMagicRatio,
    handleDownload,
    handleMouseDown,
    handleMouseMove,
    handleMouseUpOrLeave,
    handleClearSelection,
    handleMagicCropToggle,
    handleSelectAspectRatio,
    handleCancelMagicRatio,
    handleDrawManually,
    handleZoom,
    handleResetView,
    handleDetectObjects,
    handleSelectDetectedObject,
    canUndo,
    canRedo,
    handleUndo,
    handleRedo,
    placeholder,
    placeholderAnimationToggle,
    showPanWarning,
    triggerPanWarning,
    gestureZoomDirection,
    handleUpscale,
  } = useEditor({ project, onSave });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (upscaleButtonRef.current && !upscaleButtonRef.current.contains(event.target as Node)) {
            setIsUpscaleMenuOpen(false);
        }
        if (magicRatioButtonRef.current && !magicRatioButtonRef.current.contains(event.target as Node)) {
            setIsRatioMenuOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getCursor = () => {
    if (isPanning) return 'cursor-grabbing';
    if (tool === 'pan' || (tool === 'crop' && isSpacePanning) || isMagicRatioModeActive) return 'cursor-grab';
    if (tool === 'crop' && detectedObjects.length === 0) return 'cursor-crosshair';
    return 'cursor-default';
  };
  
  const isObjectSelected = (object: DetectedObject) => {
    if (!cropRect) return false;
    // A simple check is enough since the rect is set directly from the object
    return cropRect === object.box;
  };

  const HANDLES = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'top', 'bottom', 'left', 'right'];
  const getHandleCursor = (handle: string) => {
      switch (handle) {
          case 'top-left':
          case 'bottom-right':
              return 'cursor-nwse-resize';
          case 'top-right':
          case 'bottom-left':
              return 'cursor-nesw-resize';
          case 'top':
          case 'bottom':
              return 'cursor-ns-resize';
          case 'left':
          case 'right':
              return 'cursor-ew-resize';
          default:
              return '';
      }
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-gray-900 text-white">
      <header className="absolute top-0 left-0 right-0 z-20 p-4">
        <div className="relative flex h-10 items-center justify-between">
          <button 
            onClick={onBack} 
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-900/50 text-white transition-colors hover:bg-gray-800"
            aria-label={t('backToGallery')}
          >
            <ArrowLeftIcon />
          </button>

          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
            <h1 className="text-2xl font-extrabold uppercase tracking-wider text-white">MEMAI</h1>
            <p className="-mt-1 text-xs tracking-wide text-gray-400">{t('memaiBy')}</p>
          </div>

          <button 
            onClick={handleDownload}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-900/50 text-white transition-colors hover:bg-gray-800"
            aria-label={t('downloadImage')}
          >
            <DownloadIcon />
          </button>
        </div>
      </header>
      
      <div className="absolute top-1/2 -translate-y-1/2 left-4 z-20 flex flex-col items-center gap-1 rounded-full bg-gray-900/60 p-1 backdrop-blur-lg">
        <button 
          onClick={handleUndo} 
          disabled={!canUndo}
          className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-gray-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          aria-label={t('undo')}
        >
          <UndoIcon />
        </button>
        <button 
          onClick={handleRedo} 
          disabled={!canRedo}
          className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-gray-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          aria-label={t('redo')}
        >
          <RedoIcon />
        </button>
      </div>

      <main className="flex h-full w-full items-center justify-center p-4 sm:p-6 lg:p-8">
        <div
          ref={imageContainerRef}
          className={`relative h-full w-full flex items-center justify-center overflow-hidden ${getCursor()}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
        >
          {/* This wrapper contains all transformed content */}
          <div
            ref={transformWrapperRef} // Attach the ref here
            className="relative"
            style={{
              // Initial transform is set here, but subsequent updates will be direct
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
              lineHeight: 0,
            }}
          >
            <img
              ref={imageRef}
              src={project.currentSrc}
              alt={project.name}
              className={`select-none`}
              style={{ 
                maxWidth: 'none',
                maxHeight: 'none',
                display: 'block',
              }}
              draggable={false}
            />
            
            {[...detectedObjects]
              .sort((a, b) => (b.box.width * b.box.height) - (a.box.width * a.box.height))
              .map((object, index) => (
               <div
                  key={index}
                  className={`group absolute pointer-events-auto ${tool === 'crop' ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                  style={{
                    left: `${object.box.x * 100}%`,
                    top: `${object.box.y * 100}%`,
                    width: `${object.box.width * 100}%`,
                    height: `${object.box.height * 100}%`,
                  }}
                  onClick={() => {
                    if (tool === 'crop') {
                      handleSelectDetectedObject(object);
                    } else if (tool === 'pan' && isCropModeActive) {
                      triggerPanWarning();
                    }
                  }}
               >
                  <div className={`w-full h-full border-2 border-dashed transition-colors duration-200 ${isObjectSelected(object) ? 'border-indigo-400 bg-indigo-500/30' : 'border-white/50 group-hover:border-indigo-400'}`}></div>
                  <span className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-semibold rounded-md px-2 py-0.5 whitespace-nowrap transition-all duration-200 ${isObjectSelected(object) ? 'bg-indigo-500 text-white' : 'bg-black/60 text-gray-200 group-hover:bg-indigo-500 group-hover:text-white'}`}>
                    {object.label}
                  </span>
               </div>
            ))}

            {cropRect && detectedObjects.length === 0 && (
              <div
                className={`pointer-events-none absolute border-2 border-dashed border-indigo-400 bg-indigo-500/20 ${isIdentifying ? 'animate-pulse' : ''}`}
                style={{
                  left: `${cropRect.x * 100}%`,
                  top: `${cropRect.y * 100}%`,
                  width: `${cropRect.width * 100}%`,
                  height: `${cropRect.height * 100}%`,
                }}
              />
            )}

            {isMagicRatioModeActive && (
                <div
                    className="pointer-events-none absolute border-2 border-dashed border-cyan-400"
                    style={{
                        left: `${magicRatioRect.x * 100}%`,
                        top: `${magicRatioRect.y * 100}%`,
                        width: `${magicRatioRect.width * 100}%`,
                        height: `${magicRatioRect.height * 100}%`,
                    }}
                >
                    {HANDLES.map(handle => (
                         <div
                            key={handle}
                            data-handle={handle}
                            className={`absolute h-3 w-3 rounded-full bg-cyan-400 pointer-events-auto
                              ${(handle.includes('top')) ? '-top-1.5' : ''}
                              ${(handle.includes('bottom')) ? '-bottom-1.5' : ''}
                              ${(handle.includes('left')) ? '-left-1.5' : ''}
                              ${(handle.includes('right')) ? '-right-1.5' : ''}
                              ${(handle === 'top' || handle === 'bottom') ? 'left-1/2 -translate-x-1/2' : ''}
                              ${(handle === 'left' || handle === 'right') ? 'top-1/2 -translate-y-1/2' : ''}
                              ${getHandleCursor(handle)}
                            `}
                        />
                    ))}
                    <div 
                        className="absolute bg-black/30"
                        style={{
                            left: `${(-magicRatioRect.x / magicRatioRect.width) * 100}%`,
                            top: `${(-magicRatioRect.y / magicRatioRect.height) * 100}%`,
                            width: `${(1 / magicRatioRect.width) * 100}%`,
                            height: `${(1 / magicRatioRect.height) * 100}%`,
                        }}
                    ></div>
                </div>
            )}
          </div>
          
          {isAnyLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="h-16 w-16 animate-spin rounded-full border-4 border-gray-700 border-t-indigo-500"></div>
              {displayedLoadingText && (
                <p className={`mt-4 text-lg font-semibold text-white transition-all duration-300 ${isExitingLoadingText ? '-translate-y-4 opacity-0' : 'translate-y-0 opacity-100'}`}>
                  {displayedLoadingText}
                </p>
              )}
              {(isDetecting || isExtending) && (
                <div className="mt-2 text-sm text-gray-300 font-mono">
                  <span>{formattedTime.elapsed}</span> / <span>{t('eta', formattedTime.eta)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      
      {error && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 rounded-lg border border-red-700 bg-red-900/80 p-3 text-sm text-red-300 shadow-lg transition-opacity duration-300">
          {error}
        </div>
      )}

      <div className="absolute bottom-20 right-4 z-20 flex items-center gap-1 rounded-full bg-gray-900/60 p-1 backdrop-blur-lg">
        <button 
            onClick={() => handleZoom(1 / 1.2)} 
            className={`h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-700 transition-all duration-150 active:scale-95 ${gestureZoomDirection === 'out' ? 'bg-indigo-600 scale-110' : ''}`}
            aria-label={t('zoomOut')}
        >
            <ZoomOutIcon />
        </button>
        <button 
            onClick={handleResetView} 
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-700 transition-all active:scale-95"
            aria-label={t('fitToScreen')}
        >
            <FitToScreenIcon />
        </button>
        <div className="relative">
          <button 
              onClick={handlePanToggle} 
              className={`h-8 w-8 flex items-center justify-center rounded-full transition-colors active:scale-95 ${tool === 'pan' ? 'bg-indigo-600 text-white' : 'hover:bg-gray-700'} ${showPanWarning ? 'animate-shake' : ''}`}
              aria-label={t('pan')}
          >
              <HandIcon />
          </button>
          {showPanWarning && (
            <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3 w-max rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-lg whitespace-nowrap z-30">
              {t('panModeSelectionWarning')}
              <div className="absolute left-full top-1/2 -translate-y-1/2 h-0 w-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-l-4 border-l-indigo-600"></div>
            </div>
          )}
        </div>
        <button 
            onClick={() => handleZoom(1.2)} 
            className={`h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-700 transition-all duration-150 active:scale-95 ${gestureZoomDirection === 'in' ? 'bg-indigo-600 scale-110' : ''}`}
            aria-label={t('zoomIn')}
        >
            <ZoomInIcon />
        </button>
      </div>

      <div className={`
        fixed bottom-4 sm:bottom-6 left-1/2 z-20 flex w-[calc(100%-2rem)] sm:w-auto -translate-x-1/2 transform flex-col items-center gap-3
        transition-all duration-300 ease-in-out
      `}>
         {isCropModeActive && (
          <div className="flex items-center gap-2 rounded-full bg-gray-900/60 p-1.5 text-white shadow-2xl backdrop-blur-lg">
            <button
              onClick={handleDetectObjects}
              disabled={isAnyLoading}
              className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold bg-gray-700 hover:bg-gray-600 transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${isDetecting ? 'animate-shimmer' : ''}`}
            >
              <BotIcon /> {t('autoDetect')}
            </button>
            <div className="h-5 w-px bg-gray-600"></div>
            <button
              onClick={handleDrawManually}
              className="flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold bg-gray-700 hover:bg-gray-600 transition-colors active:scale-95"
            >
              <PenToolIcon /> {t('drawManually')}
            </button>
          </div>
        )}

        <div className="flex w-full max-w-md flex-col items-center gap-2 sm:max-w-none sm:flex-row">
            {/* Tool Selection */}
            <div className="flex w-full flex-shrink-0 items-center justify-center rounded-full bg-gray-900/60 p-2 text-white shadow-2xl backdrop-blur-lg sm:w-auto">
              <button
                onClick={handleMagicCropToggle}
                disabled={isMagicRatioModeActive || isAnyLoading}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ease-in-out active:scale-95 ${
                  isCropModeActive ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-gray-700 hover:bg-gray-600'
                } ${isMagicRatioModeActive ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <MagicCropIcon /> {t('magicCrop')}
              </button>
               <div className="h-6 w-px bg-gray-600 mx-2"></div>
               <div ref={magicRatioButtonRef} className="relative">
                  <button
                    onClick={() => {
                        if (isMagicRatioModeActive) {
                            handleCancelMagicRatio();
                        } else {
                            setIsRatioMenuOpen(prev => !prev);
                        }
                    }}
                    disabled={isCropModeActive || isAnyLoading}
                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ease-in-out active:scale-95 ${
                      isMagicRatioModeActive ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-gray-700 hover:bg-gray-600'
                    } ${isCropModeActive ? 'opacity-50 cursor-not-allowed' : ''} ${isExtending ? 'animate-shimmer' : ''}`}
                  >
                    <MagicRatioIcon /> {t('magicRatio')}
                  </button>
                   {isRatioMenuOpen && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max rounded-lg bg-gray-800/80 backdrop-blur-lg shadow-lg p-2 flex flex-col gap-1 transition-all duration-200 text-xs">
                        <span className="text-gray-400 font-bold px-2 pb-1 border-b border-gray-600 mb-1">{t('magicRatioMenuTitle')}</span>
                        {[...ASPECT_RATIOS, 'free'].map(ratio => (
                            <button
                                key={ratio}
                                onClick={() => {
                                    handleSelectAspectRatio(ratio);
                                    setIsRatioMenuOpen(false);
                                }}
                                className="w-full text-left px-3 py-1.5 rounded-md hover:bg-cyan-600 text-white font-semibold transition-colors"
                            >
                                {ratio === 'free' ? t('magicRatioFree') : ratio}
                            </button>
                        ))}
                    </div>
                  )}
               </div>
               <div className="h-6 w-px bg-gray-600 mx-2"></div>
               <div ref={upscaleButtonRef} className="relative">
                  <button
                    onClick={() => setIsUpscaleMenuOpen(prev => !prev)}
                    disabled={isAnyLoading}
                    className={`flex items-center gap-2 rounded-full bg-gray-700 px-4 py-2 text-sm font-semibold transition-all duration-200 ease-in-out hover:bg-gray-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${isUpscaling ? 'animate-shimmer' : ''}`}
                  >
                    <UpscaleIcon /> {t('upscale')}
                  </button>
                  {isUpscaleMenuOpen && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max rounded-full bg-gray-800/80 backdrop-blur-lg shadow-lg p-1 flex gap-1 transition-all duration-200">
                          {[2, 3, 4, 5].map(factor => (
                              <button
                                  key={factor}
                                  onClick={() => {
                                      handleUpscale(factor);
                                      setIsUpscaleMenuOpen(false);
                                  }}
                                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-indigo-600 text-white font-semibold transition-colors"
                                  aria-label={`Upscale ${factor}x`}
                              >
                                  {factor}x
                              </button>
                          ))}
                      </div>
                  )}
              </div>
            </div>

            {/* Prompt Section or Ratio Generate Button */}
            <div className={`flex w-full items-center rounded-full bg-gray-900/60 p-2 text-white shadow-2xl backdrop-blur-lg transition-all duration-300 ease-in-out sm:w-auto ${
                (isCropModeActive || isMagicRatioModeActive) ? 'opacity-100' : 'pointer-events-none opacity-0 sm:max-w-0 sm:p-0'
            }`}>
              {isCropModeActive && (
                <>
                  {cropRect && (
                      <button
                          onClick={handleClearSelection}
                          className="ml-0 mr-2 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-red-600/80 text-white transition-all duration-200 ease-in-out hover:bg-red-500 active:scale-95 sm:ml-2 sm:mr-0"
                          aria-label={t('clearSelection')}
                      >
                          <XIcon />
                      </button>
                  )}
                  <div className="hidden h-6 w-px bg-gray-600 sm:mx-2 sm:block"></div>
                  <div className="relative h-10 flex-grow sm:w-72 lg:w-96">
                      {prompt.length === 0 && placeholder.text2 && (
                        <div className="absolute inset-0 flex items-center p-2 text-sm text-gray-400 pointer-events-none">
                          <div className="h-6 overflow-hidden">
                            <div 
                              className="transition-transform duration-500 ease-in-out" 
                              style={{ transform: placeholderAnimationToggle ? 'translateY(-1.5rem)' : 'translateY(0)' }}
                            >
                              <div className="h-6 flex items-center">{placeholder.text1}</div>
                              <div className="h-6 flex items-center">{placeholder.text2}</div>
                            </div>
                          </div>
                        </div>
                      )}
                      <textarea
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          placeholder={!placeholder.text2 ? placeholder.text1 : ''}
                          rows={1}
                          className={`h-full w-full resize-none rounded-lg p-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${prompt.length === 0 && placeholder.text2 ? 'bg-transparent text-white' : 'bg-gray-700/50'}`}
                      />
                  </div>
                  <button
                      onClick={handleGenerate}
                      disabled={isAnyLoading || !prompt.trim() || !cropRect}
                      className="ml-2 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white transition-all duration-200 ease-in-out hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-900 disabled:text-gray-400 active:scale-95"
                      aria-label={t('generateEdit')}
                  >
                      <SparklesIcon />
                  </button>
                </>
              )}
              {isMagicRatioModeActive && (
                  <div className="w-full flex justify-center p-1 sm:w-auto">
                    <button
                        onClick={handleGenerateMagicRatio}
                        disabled={isAnyLoading || !isRatioChanged}
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-cyan-600 text-white transition-all duration-200 ease-in-out hover:bg-cyan-500 disabled:cursor-not-allowed disabled:bg-cyan-900 disabled:text-gray-400 active:scale-95"
                        aria-label={t('applyExpansion')}
                    >
                        <SparklesIcon />
                    </button>
                  </div>
              )}
            </div>
        </div>
      </div>
    </div>
  );
};