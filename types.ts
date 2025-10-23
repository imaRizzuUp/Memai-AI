export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectedObject {
  label: string;
  box: CropRect;
}

export interface Project {
  id: string;
  name: string;
  originalSrc: string;
  currentSrc: string;
}
