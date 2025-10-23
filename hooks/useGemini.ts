import { useState, useCallback, useRef } from 'react';
import { editImage, detectObjectsInImage, identifyObjectInCrop, upscaleImage, extendImage } from '../services/geminiService';
import { createMaskFromCrop } from '../utils/canvasUtils';
import type { CropRect } from '../types';
import { useLanguage } from '../context/LanguageContext';
import type { TranslationKey } from '../context/LanguageContext';

export const useGemini = () => {
    const { language, t } = useLanguage();
    const [isGenerating, setIsGenerating] = useState(false);
    const [isDetecting, setIsDetecting] = useState(false);
    const [isIdentifying, setIsIdentifying] = useState(false);
    const [isUpscaling, setIsUpscaling] = useState(false);
    const [isExtending, setIsExtending] = useState(false);
    const [error, _setError] = useState<string | null>(null);
    const errorTimeoutRef = useRef<number | null>(null);

    const setError = useCallback((message: string | null) => {
        if (errorTimeoutRef.current) {
            clearTimeout(errorTimeoutRef.current);
        }
        _setError(message);
        if (message) {
            errorTimeoutRef.current = window.setTimeout(() => {
                _setError(null);
            }, 5000);
        }
    }, []);

    const generateEdit = useCallback(async (
        currentSrc: string, 
        cropRect: CropRect, 
        prompt: string
    ) => {
        if (!prompt.trim() || !cropRect) {
            setError(t('errorPromptAndSelection'));
            return null;
        }
        setIsGenerating(true);
        setError(null);
        try {
            const maskImageBase64 = await createMaskFromCrop(currentSrc, cropRect);
            const editedImageBase64 = await editImage(currentSrc, maskImageBase64, prompt);
            return editedImageBase64;
        } catch (err: any) { 
            setError(t((err.message as TranslationKey) || 'errorGeneric'));
            return null;
        } finally {
            setIsGenerating(false);
        }
    }, [t, setError]);

    const extendImageAPI = useCallback(async (currentSrc: string, rect: CropRect) => {
        setIsExtending(true);
        setError(null);
        try {
            const extendedImageBase64 = await extendImage(currentSrc, rect);
            return extendedImageBase64;
        } catch (err: any) {
            setError(t((err.message as TranslationKey) || 'errorFailedToExtend'));
            return null;
        } finally {
            setIsExtending(false);
        }
    }, [t, setError]);

    const upscaleImageAPI = useCallback(async (currentSrc: string, factor: number) => {
        setIsUpscaling(true);
        setError(null);
        try {
            const upscaledImageBase64 = await upscaleImage(currentSrc, factor);
            return upscaledImageBase64;
        } catch (err: any) {
            setError(t((err.message as TranslationKey) || 'errorFailedToUpscale'));
            return null;
        } finally {
            setIsUpscaling(false);
        }
    }, [t, setError]);

    const detectObjects = useCallback(async (currentSrc: string) => {
        setIsDetecting(true);
        setError(null);
        try {
            const objects = await detectObjectsInImage(currentSrc, language);
            return objects;
        } catch (err: any) {
            setError(t((err.message as TranslationKey) || 'errorFailedToDetect'));
            return null;
        } finally {
            setIsDetecting(false);
        }
    }, [language, t, setError]);
    
    const identifyObject = useCallback(async (currentSrc: string, cropRect: CropRect) => {
        setIsIdentifying(true);
        try {
            return await identifyObjectInCrop(currentSrc, cropRect, language);
        } catch (err) {
            // Errors are handled inside the service, returning null.
            // No need to set a user-facing error here.
            return null;
        } finally {
            setIsIdentifying(false);
        }
    }, [language]);
    
    const isAnyLoading = isGenerating || isDetecting || isIdentifying || isUpscaling || isExtending;
    
    return {
        isGenerating,
        isDetecting,
        isIdentifying,
        isUpscaling,
        isExtending,
        isAnyLoading,
        error,
        setError,
        generateEdit,
        detectObjects,
        identifyObject,
        upscaleImageAPI,
        extendImageAPI,
    };
};