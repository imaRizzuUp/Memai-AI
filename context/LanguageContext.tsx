import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';

const en = {
  "memaiBy": "By Henoch Saerang",
  "newProject": "New Project",
  "clickToEdit": "Click to edit",
  "noPhotosYet": "No photos yet",
  "getStarted": "Click \"New Project\" to start editing your first image.",
  "backToGallery": "Back to gallery",
  "downloadImage": "Download image",
  "undo": "Undo",
  "redo": "Redo",
  "detectingObjects": "Detecting objects...",
  "applyingEdits": "Applying edits...",
  "identifyingObject": "Identifying object...",
  "pan": "Pan",
  "magicCrop": "Magic Crop",
  "autoDetect": "Auto Detect",
  "drawManually": "Draw Manually",
  "clearSelection": "Clear selection",
  "generateEdit": "Generate edit",
  "describeYourEdit": "Describe your edit...",
  "waitingForAutoDetect": "waiting for the auto detect...",
  "makeCropBox": "Make a crop box already..",
  "selectLabelBox": "Select a label box",
  "errorFailedToDetect": "Failed to detect objects.",
  "errorFailedToProcess": "Failed to process image with AI.",
  "errorGeneric": "An unknown error occurred.",
  "errorPromptAndSelection": "Please enter a prompt and select an area.",
  "zoomIn": "Zoom In",
  "zoomOut": "Zoom Out",
  "panModeSelectionWarning": "Disable Pan mode to select a box.",
  "eta": "Est. {0}",
  "fitToScreen": "Fit to screen",
  "upscale": "Upscale",
  "upscalingImage": "Upscaling image...",
  "errorFailedToUpscale": "Failed to upscale image.",
  "upscalingImageFactor": "Upscaling image ({0}x)...",
  "magicRatio": "Magic Ratio",
  "applyExpansion": "Apply Expansion",
  "expandingCanvas": "Expanding canvas...",
  "errorFailedToExtend": "Failed to expand the image.",
  "magicRatioMenuTitle": "Aspect Ratio",
  "magicRatioFree": "Free"
};

const id = {
  "memaiBy": "Oleh Henoch Saerang",
  "newProject": "Proyek Baru",
  "clickToEdit": "Klik untuk mengedit",
  "noPhotosYet": "Belum ada foto",
  "getStarted": "Klik \"Proyek Baru\" untuk mulai mengedit gambar pertamamu.",
  "backToGallery": "Kembali ke galeri",
  "downloadImage": "Unduh gambar",
  "undo": "Urungkan",
  "redo": "Ulangi",
  "detectingObjects": "Mendeteksi objek...",
  "applyingEdits": "Menerapkan editan...",
  "identifyingObject": "Mengidentifikasi objek...",
  "pan": "Geser",
  "magicCrop": "Potong Ajaib",
  "autoDetect": "Deteksi Otomatis",
  "drawManually": "Gambar Manual",
  "clearSelection": "Hapus pilihan",
  "generateEdit": "Buat editan",
  "describeYourEdit": "Jelaskan editanmu...",
  "waitingForAutoDetect": "menunggu deteksi otomatis...",
  "makeCropBox": "Buat kotak potong dulu..",
  "selectLabelBox": "Pilih kotak label",
  "errorFailedToDetect": "Gagal mendeteksi objek.",
  "errorFailedToProcess": "Gagal memproses gambar dengan AI.",
  "errorGeneric": "Terjadi kesalahan yang tidak diketahui.",
  "errorPromptAndSelection": "Silakan masukkan perintah dan pilih area.",
  "zoomIn": "Perbesar",
  "zoomOut": "Perkecil",
  "panModeSelectionWarning": "Nonaktifkan mode Pan untuk memilih kotak.",
  "eta": "Est. {0}",
  "fitToScreen": "Pas ke layar",
  "upscale": "Tingkatkan Skala",
  "upscalingImage": "Meningkatkan skala gambar...",
  "errorFailedToUpscale": "Gagal meningkatkan skala gambar.",
  "upscalingImageFactor": "Meningkatkan skala gambar ({0}x)...",
  "magicRatio": "Rasio Ajaib",
  "applyExpansion": "Terapkan Perluasan",
  "expandingCanvas": "Memperluas kanvas...",
  "errorFailedToExtend": "Gagal memperluas gambar.",
  "magicRatioMenuTitle": "Rasio Aspek",
  "magicRatioFree": "Bebas"
};

type Language = 'en' | 'id';
type Translations = typeof en;
export type TranslationKey = keyof Translations;

const translations: Record<Language, Translations> = { en, id };

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, ...args: (string | number)[]) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = useCallback((key: TranslationKey, ...args: (string | number)[]): string => {
    let template = translations[language][key] || key;
    args.forEach((arg, i) => {
        template = template.replace(`{${i}}`, String(arg));
    });
    return template;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};