import React, { useState, useRef, useCallback, useLayoutEffect } from 'react';

interface UseViewportProps {
  imageContainerRef: React.RefObject<HTMLDivElement>;
  imageRef: React.RefObject<HTMLImageElement>;
  projectId: string; 
}

export const useViewport = ({ imageContainerRef, imageRef, projectId }: UseViewportProps) => {
  // State for React to be aware of the final transform values
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [gestureZoomDirection, setGestureZoomDirection] = useState<'in' | 'out' | null>(null);

  // Refs for direct, high-frequency manipulation to ensure smoothness
  const transformWrapperRef = useRef<HTMLDivElement>(null);
  const panOffsetRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const stateCommitTimeoutRef = useRef<number | null>(null);
  const gestureTimeoutRef = useRef<number | null>(null);


  // State for mouse-based panning interaction
  const [isPanning, setIsPanning] = useState(false);
  const panStartPoint = useRef({ x: 0, y: 0 });
  const startPanOffset = useRef({ x: 0, y: 0 });
  
  const [imageRenderPosition, setImageRenderPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });

  // Function to apply transform directly to the DOM element
  const applyTransform = useCallback(() => {
    if (transformWrapperRef.current) {
      const { x, y } = panOffsetRef.current;
      const z = zoomRef.current;
      transformWrapperRef.current.style.transform = `translate(${x}px, ${y}px) scale(${z})`;
    }
  }, []);

  // Function to commit the ref values to React state after a gesture
  const commitState = useCallback(() => {
    // Avoid unnecessary re-renders if the state is already in sync
    if (panOffsetRef.current.x !== panOffset.x || panOffsetRef.current.y !== panOffset.y) {
      setPanOffset(panOffsetRef.current);
    }
    if (zoomRef.current !== zoom) {
      setZoom(zoomRef.current);
    }
  }, [panOffset, zoom]);

  const updateImagePosition = useCallback(() => {
    const imageEl = imageRef.current;
    const containerEl = imageContainerRef.current;
    if (imageEl && containerEl) {
      const imageRect = imageEl.getBoundingClientRect();
      const containerRect = containerEl.getBoundingClientRect();
      setImageRenderPosition({
        top: imageRect.top - containerRect.top,
        left: imageRect.left - containerRect.left,
        width: imageRect.width,
        height: imageRect.height,
      });
    }
  }, [imageRef, imageContainerRef]);

  const resetViewToFit = useCallback(() => {
    const imageEl = imageRef.current;
    const containerEl = imageContainerRef.current;

    if (!imageEl || !containerEl || !imageEl.naturalWidth || !containerEl.clientWidth) {
        return;
    }

    const { naturalWidth: imgWidth, naturalHeight: imgHeight } = imageEl;
    const { clientWidth: containerWidth, clientHeight: containerHeight } = containerEl;

    const scaleX = containerWidth / imgWidth;
    const scaleY = containerHeight / imgHeight;

    const newZoom = Math.min(scaleX, scaleY) * 0.95; 

    const finalZoom = newZoom > 0 ? newZoom : 1;
    zoomRef.current = finalZoom;
    panOffsetRef.current = { x: 0, y: 0 };

    setZoom(finalZoom);
    setPanOffset({ x: 0, y: 0 });
    
    applyTransform();
  }, [imageRef, imageContainerRef, applyTransform]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();

    if (e.ctrlKey) { // Zoom gesture
      const zoomAmount = e.deltaY * -0.01;
      const newZoom = zoomRef.current * Math.exp(zoomAmount);
      zoomRef.current = Math.max(0.2, Math.min(newZoom, 5));
      
      if (gestureTimeoutRef.current) clearTimeout(gestureTimeoutRef.current);
      setGestureZoomDirection(zoomAmount > 0 ? 'in' : 'out');
      gestureTimeoutRef.current = window.setTimeout(() => {
        setGestureZoomDirection(null);
      }, 200);

    } else { // Pan gesture
      panOffsetRef.current = {
        x: panOffsetRef.current.x - e.deltaX,
        y: panOffsetRef.current.y - e.deltaY,
      };
    }
    
    applyTransform();
    
    // Debounce the state commit
    if (stateCommitTimeoutRef.current) clearTimeout(stateCommitTimeoutRef.current);
    stateCommitTimeoutRef.current = window.setTimeout(commitState, 150);
  }, [applyTransform, commitState]);

  useLayoutEffect(() => {
    const containerEl = imageContainerRef.current;
    if (!containerEl) return;
    containerEl.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      containerEl.removeEventListener('wheel', handleWheel);
    };
  }, [imageContainerRef, handleWheel]);

  useLayoutEffect(() => {
    const imageEl = imageRef.current;
    if (!imageEl) return;
    const handleLoad = () => resetViewToFit();
    if (imageEl.complete) {
      handleLoad();
    } else {
      imageEl.addEventListener('load', handleLoad);
    }
    window.addEventListener('resize', handleLoad);
    return () => {
      imageEl.removeEventListener('load', handleLoad);
      window.removeEventListener('resize', handleLoad);
    };
  }, [projectId, resetViewToFit]);

  useLayoutEffect(() => {
    updateImagePosition();
  }, [zoom, panOffset, updateImagePosition]);
  
  const handleZoom = (factor: number) => {
    const newZoom = Math.max(0.2, Math.min(zoomRef.current * factor, 5));
    zoomRef.current = newZoom;
    setZoom(newZoom); // Commit immediately for button clicks
    applyTransform();
  };
  
  const handlePanMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    setIsPanning(true);
    panStartPoint.current = { x: e.clientX, y: e.clientY };
    startPanOffset.current = panOffsetRef.current;
  }, []);
  
  const handlePanMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning) return;
    const dx = e.clientX - panStartPoint.current.x;
    const dy = e.clientY - panStartPoint.current.y;
    panOffsetRef.current = {
        x: startPanOffset.current.x + dx,
        y: startPanOffset.current.y + dy,
    };
    applyTransform();
  }, [isPanning, applyTransform]);
  
  const handlePanMouseUpOrLeave = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      commitState(); // Commit final position to state
    }
  }, [isPanning, commitState]);
  
  const getRelativeCoords = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const containerEl = imageContainerRef.current;
    if (!containerEl || !imageRenderPosition.width || !imageRenderPosition.height) {
        return null;
    }
    const containerRect = containerEl.getBoundingClientRect();
    const clickX = e.clientX - containerRect.left;
    const clickY = e.clientY - containerRect.top;

    const { left, top, width, height } = imageRenderPosition;

    if (clickX < left || clickX > left + width || clickY < top || clickY > top + height) {
        return null;
    }

    return {
        x: (clickX - left) / width,
        y: (clickY - top) / height,
    };
  }, [imageRenderPosition, imageContainerRef]);

  return {
    zoom,
    panOffset,
    isPanning,
    transformWrapperRef,
    handleZoom,
    handleResetView: resetViewToFit,
    getRelativeCoords,
    gestureZoomDirection,
    panHandlers: {
      onMouseDown: handlePanMouseDown,
      onMouseMove: handlePanMouseMove,
      onMouseUp: handlePanMouseUpOrLeave,
      onMouseLeave: handlePanMouseUpOrLeave,
    }
  };
};