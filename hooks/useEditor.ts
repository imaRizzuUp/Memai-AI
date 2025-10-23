import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Project, DetectedObject, CropRect } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useViewport } from './useViewport';
import { useSelection } from './useSelection';
import { useHistory } from './useHistory';
import { useGemini } from './useGemini';

interface UseEditorProps {
  project: Project;
  onSave: (projectId: string, newSrc: string) => void;
}

const ESTIMATED_AI_TIME_MS = 30000; // 30 seconds for any AI task

const formatTime = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const useEditor = ({ project, onSave }: UseEditorProps) => {
  const { t, language } = useLanguage();
  const [prompt, setPrompt] = useState('');
  const [selectedObjectLabel, setSelectedObjectLabel] = useState<string | null>(null);
  const [tool, setTool] = useState<'pan' | 'crop'>('pan');
  const [isCropModeActive, setIsCropModeActive] = useState(false);
  const [isMagicRatioModeActive, setIsMagicRatioModeActive] = useState(false);
  const [magicRatioRect, setMagicRatioRect] = useState({ x: 0, y: 0, width: 1, height: 1 });
  const [activeAspectRatio, setActiveAspectRatio] = useState<string | null>(null);
  const [activeHandle, setActiveHandle] = useState<string | null>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const dragStartRect = useRef({ x: 0, y: 0, width: 1, height: 1 });

  const [isSpacePanning, setIsSpacePanning] = useState(false);
  const [placeholder, setPlaceholder] = useState({ text1: '', text2: '' });
  const [placeholderAnimationToggle, setPlaceholderAnimationToggle] = useState(false);
  const [showPanWarning, setShowPanWarning] = useState(false);
  const panWarningTimeoutRef = useRef<number | null>(null);
  const [upscaleFactor, setUpscaleFactor] = useState(2);

  const imageContainerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const [displayedLoadingText, setDisplayedLoadingText] = useState('');
  const [isExitingLoadingText, setIsExitingLoadingText] = useState(false);

  const {
    zoom, panOffset, isPanning, handleZoom, handleResetView, getRelativeCoords, panHandlers, transformWrapperRef, gestureZoomDirection
  } = useViewport({ imageContainerRef, imageRef, projectId: project.id });

  const handleManualCropComplete = useCallback((_rect: CropRect) => {
    setSelectedObjectLabel(null);
  }, []);

  const {
    cropRect, setCropRect, isCropping, detectedObjects, setDetectedObjects,
    handleClearSelection: baseClearSelection, handleSelectDetectedObject: baseHandleSelectDetectedObject, cropHandlers
  } = useSelection({ getRelativeCoords, onCropComplete: handleManualCropComplete });

  const {
    updateHistory, resetHistory, handleUndo, handleRedo, canUndo, canRedo
  } = useHistory({ initialSrc: project.currentSrc, onStateChange: (src) => onSave(project.id, src) });

  const {
    isAnyLoading, error, setError, generateEdit, detectObjects: detectObjectsAPI, 
    isDetecting, isGenerating, isIdentifying, identifyObject, 
    isUpscaling, upscaleImageAPI,
    isExtending, extendImageAPI
  } = useGemini();

  useEffect(() => {
    let newText = '';
    if (isDetecting) newText = t('detectingObjects');
    else if (isGenerating) newText = t('applyingEdits');
    else if (isIdentifying) newText = t('identifyingObject');
    else if (isExtending) newText = t('expandingCanvas');
    else if (isUpscaling) newText = t('upscalingImageFactor', upscaleFactor);
    
    if (newText && newText !== displayedLoadingText) {
        if (displayedLoadingText) {
            setIsExitingLoadingText(true);
            setTimeout(() => {
                setDisplayedLoadingText(newText);
                setIsExitingLoadingText(false);
            }, 300);
        } else {
            setDisplayedLoadingText(newText);
        }
    } else if (!newText && displayedLoadingText) {
        setDisplayedLoadingText('');
    }
  }, [isDetecting, isGenerating, isIdentifying, isUpscaling, isExtending, t, displayedLoadingText, upscaleFactor]);


  const [elapsedTime, setElapsedTime] = useState(0);
  const timerIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isDetecting || isExtending) {
      setElapsedTime(0);
      timerIntervalRef.current = window.setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isDetecting, isExtending]);

  const formattedTime = {
    elapsed: formatTime(elapsedTime),
    eta: formatTime(Math.round(ESTIMATED_AI_TIME_MS / 1000)),
  };

  useEffect(() => {
    resetHistory(project.currentSrc);
    setTool('pan');
    setIsCropModeActive(false);
    setIsMagicRatioModeActive(false);
    setCropRect(null);
    setDetectedObjects([]);
    setPrompt('');
    setSelectedObjectLabel(null);
  }, [project.id, resetHistory, setCropRect, setDetectedObjects]);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
        if (e.code === 'Space') {
            e.preventDefault();
            setIsSpacePanning(true);
        }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
        if (e.code === 'Space') {
            e.preventDefault();
            setIsSpacePanning(false);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    let intervalId: number | null = null;
    if (!isCropModeActive) {
      setPlaceholder({ text1: t('describeYourEdit'), text2: '' });
      setPlaceholderAnimationToggle(false);
      return;
    }

    if (isDetecting) {
      setPlaceholder({ text1: t('describeYourEdit'), text2: t('waitingForAutoDetect') });
    } else if (detectedObjects.length > 0 && !cropRect) {
      setPlaceholder({ text1: t('describeYourEdit'), text2: t('selectLabelBox') });
    } else if (detectedObjects.length === 0 && !cropRect) {
      setPlaceholder({ text1: t('describeYourEdit'), text2: t('makeCropBox') });
    } else {
      setPlaceholder({ text1: t('describeYourEdit'), text2: '' });
      setPlaceholderAnimationToggle(false); 
      return; 
    }
    
    setPlaceholderAnimationToggle(false);
    intervalId = window.setInterval(() => setPlaceholderAnimationToggle(prev => !prev), 2500);
    
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [isCropModeActive, isDetecting, tool, detectedObjects.length, cropRect, t]);

  const triggerPanWarning = useCallback(() => {
    if (panWarningTimeoutRef.current) {
      clearTimeout(panWarningTimeoutRef.current);
    }
    setShowPanWarning(true);
    panWarningTimeoutRef.current = window.setTimeout(() => {
      setShowPanWarning(false);
    }, 3000);
  }, []);

  const handlePanToggle = useCallback(() => {
    if (!isCropModeActive) {
      setTool('pan');
      return;
    }
    setTool(prevTool => (prevTool === 'pan' ? 'crop' : 'pan'));
  }, [isCropModeActive]);

  const handleClearSelection = useCallback(() => {
    baseClearSelection();
    setPrompt('');
    setSelectedObjectLabel(null);
  }, [baseClearSelection]);

  const handleMagicCropToggle = () => {
    setIsCropModeActive(prev => {
      const willBeActive = !prev;
      if (willBeActive) {
        setTool('crop');
        setIsMagicRatioModeActive(false);
      } else {
        setTool('pan');
        handleClearSelection();
      }
      return willBeActive;
    });
  };

  const handleCancelMagicRatio = useCallback(() => {
    setIsMagicRatioModeActive(false);
    setActiveAspectRatio(null);
    setMagicRatioRect({ x: 0, y: 0, width: 1, height: 1 });
  }, []);

  const handleSelectAspectRatio = useCallback((ratioString: string) => {
    setIsMagicRatioModeActive(true);
    setTool('pan');
    setIsCropModeActive(false);
    handleClearSelection();

    const imageEl = imageRef.current;
    if (!imageEl || !imageEl.naturalWidth) return;

    if (ratioString === 'free') {
        setActiveAspectRatio(null);
        setMagicRatioRect({ x: 0, y: 0, width: 1, height: 1 });
        return;
    }

    const [w, h] = ratioString.split(':').map(Number);
    const newAspectRatio = w / h;
    setActiveAspectRatio(ratioString);

    const imageRatio = imageEl.naturalWidth / imageEl.naturalHeight;
    let rect = { x: 0, y: 0, width: 1, height: 1 };

    if (newAspectRatio > imageRatio) { // New ratio is wider than image
        const newWidthRelative = newAspectRatio / imageRatio;
        rect = {
            x: (1 - newWidthRelative) / 2,
            y: 0,
            width: newWidthRelative,
            height: 1
        };
    } else { // New ratio is taller than or same as image
        const newHeightRelative = imageRatio / newAspectRatio;
        rect = {
            x: 0,
            y: (1 - newHeightRelative) / 2,
            width: 1,
            height: newHeightRelative
        };
    }
    setMagicRatioRect(rect);
  }, [imageRef, handleClearSelection]);

  const handleDrawManually = () => {
    setDetectedObjects([]);
    handleClearSelection(); 
    setTool('crop');
  };

  const handleDetectObjects = useCallback(async () => {
    handleClearSelection();
    setError(null);
    const objects = await detectObjectsAPI(project.currentSrc);
    if (objects) {
        setDetectedObjects(objects);
        setTool('crop');
    }
  }, [handleClearSelection, setError, detectObjectsAPI, project.currentSrc, setDetectedObjects]);
  
  const handleGenerate = useCallback(async () => {
    if (!cropRect) return;
    
    setError(null);
    let finalPrompt;
    let labelToUse = selectedObjectLabel;
  
    if (!labelToUse) {
      const identifiedLabel = await identifyObject(project.currentSrc, cropRect);
      if (identifiedLabel) {
        labelToUse = identifiedLabel;
      }
    }
  
    finalPrompt = labelToUse 
      ? `${labelToUse}, ${prompt}`
      : prompt;
  
    const newSrc = await generateEdit(project.currentSrc, cropRect, finalPrompt);
  
    if (newSrc) {
      updateHistory(newSrc);
      handleClearSelection();
      setIsCropModeActive(false);
      setTool('pan');
    }
  }, [
    cropRect, prompt, selectedObjectLabel, project.currentSrc, identifyObject, 
    generateEdit, updateHistory, handleClearSelection, setError
  ]);

  const handleGenerateMagicRatio = useCallback(async () => {
      if (!magicRatioRect) return;
      setError(null);
      const newSrc = await extendImageAPI(project.currentSrc, magicRatioRect);
      if (newSrc) {
          updateHistory(newSrc);
          setIsMagicRatioModeActive(false);
      }
  }, [magicRatioRect, project.currentSrc, extendImageAPI, updateHistory, setError]);

  const handleUpscale = useCallback(async (factor: number) => {
    setError(null);
    setUpscaleFactor(factor);
    const newSrc = await upscaleImageAPI(project.currentSrc, factor);
    if (newSrc) {
      updateHistory(newSrc);
    }
  }, [project.currentSrc, upscaleImageAPI, updateHistory, setError]);
  
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = project.currentSrc;
    const extension = project.currentSrc.split(';')[0].split('/')[1] || 'png';
    link.download = `${project.name}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isAnyLoading) return;

    const target = e.target as HTMLElement;
    const handle = target.dataset.handle;
    if (isMagicRatioModeActive && handle) {
        e.stopPropagation();
        e.preventDefault();
        setActiveHandle(handle);
        dragStartPos.current = { x: e.clientX, y: e.clientY };
        dragStartRect.current = magicRatioRect;
        return;
    }
    
    e.preventDefault();
    const canPan = tool === 'pan' || (tool === 'crop' && isSpacePanning) || isMagicRatioModeActive;
    if (canPan) {
        panHandlers.onMouseDown(e);
    } else if (isCropModeActive && tool === 'crop' && detectedObjects.length === 0) {
        cropHandlers.onMouseDown(e);
    }
  }, [isAnyLoading, tool, isSpacePanning, detectedObjects.length, panHandlers, cropHandlers, isCropModeActive, isMagicRatioModeActive, magicRatioRect]);
  
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isMagicRatioModeActive && activeHandle) {
        const imageEl = imageRef.current;
        // FIX: Add a guard for dragStartRect.current and snapshot its value
        if (!imageEl || !imageEl.naturalWidth || !dragStartRect.current) return;
        
        const dx = (e.clientX - dragStartPos.current.x) / zoom;
        const dy = (e.clientY - dragStartPos.current.y) / zoom;

        const dxRelative = dx / imageEl.naturalWidth;
        const dyRelative = dy / imageEl.naturalHeight;

        const { x: startX, y: startY, width: startWidth, height: startHeight } = dragStartRect.current;
        let x = startX, y = startY, width = startWidth, height = startHeight;

        if (activeAspectRatio) {
            const [w, h] = activeAspectRatio.split(':').map(Number);
            const ratio = w / h;

            if (['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(activeHandle)) {
                let proposedWidth = width;
                let proposedHeight = height;

                if (activeHandle.includes('right')) proposedWidth = startWidth + dxRelative;
                else if (activeHandle.includes('left')) proposedWidth = startWidth - dxRelative;

                if (activeHandle.includes('bottom')) proposedHeight = startHeight + dyRelative;
                else if (activeHandle.includes('top')) proposedHeight = startHeight - dyRelative;

                if (Math.abs(dxRelative) > Math.abs(dyRelative)) {
                    proposedHeight = proposedWidth / ratio;
                } else {
                    proposedWidth = proposedHeight * ratio;
                }
                
                if (activeHandle.includes('left')) x = (startX + startWidth) - proposedWidth;
                if (activeHandle.includes('top')) y = (startY + startHeight) - proposedHeight;
                width = proposedWidth;
                height = proposedHeight;
            } else { // Edge handles
                if (activeHandle === 'right' || activeHandle === 'left') {
                    width = activeHandle === 'right' ? startWidth + dxRelative : startWidth - dxRelative;
                    height = width / ratio;
                    y = startY - (height - startHeight) / 2;
                    if (activeHandle === 'left') x = startX + dxRelative;
                }
                if (activeHandle === 'top' || activeHandle === 'bottom') {
                    height = activeHandle === 'bottom' ? startHeight + dyRelative : startHeight - dyRelative;
                    width = height * ratio;
                    x = startX - (width - startWidth) / 2;
                    if (activeHandle === 'top') y = startY + dyRelative;
                }
            }
        } else { // Free transform
            if (activeHandle.includes('left')) {
                x = startX + dxRelative;
                width = startWidth - dxRelative;
            }
            if (activeHandle.includes('right')) {
                width = startWidth + dxRelative;
            }
            if (activeHandle.includes('top')) {
                y = startY + dyRelative;
                height = startHeight - dyRelative;
            }
            if (activeHandle.includes('bottom')) {
                height = startHeight + dyRelative;
            }
        }
        
        if (width > 0.2 && height > 0.2) {
            setMagicRatioRect({ x, y, width, height });
        }
        return;
    }

    if (isPanning || (isSpacePanning && tool === 'crop') || (isMagicRatioModeActive && isPanning)) {
        panHandlers.onMouseMove(e);
    } else if (isCropping) {
        cropHandlers.onMouseMove(e);
    }
  }, [isMagicRatioModeActive, activeHandle, activeAspectRatio, zoom, isPanning, isSpacePanning, tool, isCropping, panHandlers, cropHandlers]);
  
  const handleMouseUpOrLeave = useCallback(() => {
    if (activeHandle) {
        setActiveHandle(null);
    }
    panHandlers.onMouseUp();
    cropHandlers.onMouseUp();
  }, [activeHandle, panHandlers, cropHandlers]);

  const handleSelectDetectedObject = useCallback((object: DetectedObject) => {
    baseHandleSelectDetectedObject(object);
    setSelectedObjectLabel(object.label);
    setPrompt(''); 
    setTool('crop');
  }, [baseHandleSelectDetectedObject]);

  const isRatioChanged = magicRatioRect.x !== 0 || magicRatioRect.y !== 0 || magicRatioRect.width !== 1 || magicRatioRect.height !== 1;

  return {
    prompt, setPrompt, error, cropRect, tool, 
    isCropModeActive, isMagicRatioModeActive, magicRatioRect, isRatioChanged,
    isPanning: isPanning || (isSpacePanning && tool === 'crop') || (isMagicRatioModeActive && isPanning && !activeHandle),
    isSpacePanning, imageContainerRef, imageRef, 
    isAnyLoading, isDetecting, isIdentifying, isUpscaling, isExtending,
    displayedLoadingText, isExitingLoadingText, transformWrapperRef,
    formattedTime, zoom, panOffset, detectedObjects,
    handlePanToggle, handleGenerate, handleGenerateMagicRatio, handleDownload, handleMouseDown,
    handleMouseMove, handleMouseUpOrLeave, handleClearSelection,
    handleMagicCropToggle, handleSelectAspectRatio, handleCancelMagicRatio, handleDrawManually, handleUpscale,
    handleZoom, handleResetView, handleDetectObjects,
    handleSelectDetectedObject, canUndo, canRedo, handleUndo, handleRedo,
    placeholder, placeholderAnimationToggle,
    showPanWarning, triggerPanWarning,
    gestureZoomDirection,
  };
};
