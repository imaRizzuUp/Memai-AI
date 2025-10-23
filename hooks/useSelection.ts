import React, { useState, useRef, useCallback } from 'react';
import type { CropRect, DetectedObject } from '../types';

interface UseSelectionProps {
    getRelativeCoords: (e: React.MouseEvent<HTMLDivElement>) => { x: number; y: number } | null;
    onCropComplete: (rect: CropRect) => void;
}

export const useSelection = ({ getRelativeCoords, onCropComplete }: UseSelectionProps) => {
    const [cropRect, setCropRect] = useState<CropRect | null>(null);
    const [isCropping, setIsCropping] = useState(false);
    const cropStartPoint = useRef({ x: 0, y: 0 });
    
    const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([]);
    
    const handleClearSelection = useCallback(() => {
        setCropRect(null);
        setDetectedObjects([]);
    }, []);

    const handleSelectDetectedObject = useCallback((object: DetectedObject) => {
        setCropRect(object.box);
    }, []);

    const handleCropMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const coords = getRelativeCoords(e);
        if (!coords) return;
        setIsCropping(true);
        cropStartPoint.current = coords;
        setCropRect({ x: coords.x, y: coords.y, width: 0, height: 0 });
    }, [getRelativeCoords]);
    
    const handleCropMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!isCropping) return;
        const coords = getRelativeCoords(e);
        if (!coords) return;

        const startX = cropStartPoint.current.x;
        const startY = cropStartPoint.current.y;
        
        const newRect = {
            x: Math.min(coords.x, startX),
            y: Math.min(coords.y, startY),
            width: Math.abs(coords.x - startX),
            height: Math.abs(coords.y - startY),
        };
        setCropRect(newRect);
    }, [isCropping, getRelativeCoords]);
    
    const handleCropMouseUpOrLeave = useCallback(() => {
        if (isCropping) {
            setIsCropping(false);
            setCropRect(currentRect => {
                if (currentRect && (currentRect.width < 0.02 || currentRect.height < 0.02)) {
                    return null;
                }
                if (currentRect) {
                    onCropComplete(currentRect);
                }
                return currentRect;
            });
        }
    }, [isCropping, onCropComplete]);

    return {
        cropRect,
        setCropRect,
        isCropping,
        detectedObjects,
        setDetectedObjects,
        handleClearSelection,
        handleSelectDetectedObject,
        cropHandlers: {
            onMouseDown: handleCropMouseDown,
            onMouseMove: handleCropMouseMove,
            onMouseUp: handleCropMouseUpOrLeave,
            onMouseLeave: handleCropMouseUpOrLeave,
        }
    };
};