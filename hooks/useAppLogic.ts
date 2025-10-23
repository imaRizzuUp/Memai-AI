import { useState, useCallback, useEffect } from 'react';
import type { Project } from '../types';

const PROJECTS_STORAGE_KEY = 'memai-projects';

export const useAppLogic = () => {
  const [currentPage, setCurrentPage] = useState<'gallery' | 'editor'>('gallery');
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const savedProjects = window.localStorage.getItem(PROJECTS_STORAGE_KEY);
      return savedProjects ? JSON.parse(savedProjects) : [];
    } catch (error) {
      console.error("Failed to load projects from localStorage", error);
      return [];
    }
  });
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
    } catch (error) {
      console.error("Failed to save projects to localStorage", error);
    }
  }, [projects]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleNewProject = useCallback(async (file: File) => {
    const newId = `proj-${Date.now()}`;
    const base64Src = await fileToBase64(file);
    const newProject: Project = {
      id: newId,
      name: file.name.split('.').slice(0, -1).join('.') || 'New Project',
      originalSrc: base64Src,
      currentSrc: base64Src,
    };
    setProjects(prev => [newProject, ...prev]);
    setSelectedProjectId(newId);
    setCurrentPage('editor');
  }, []);

  const handleSelectProject = useCallback((projectId: string) => {
    setSelectedProjectId(projectId);
    setCurrentPage('editor');
  }, []);

  const handleBackToGallery = useCallback(() => {
    setSelectedProjectId(null);
    setCurrentPage('gallery');
  }, []);

  const handleSaveProject = useCallback((projectId: string, newSrc: string) => {
    setProjects(prev => 
      prev.map(p => p.id === projectId ? { ...p, currentSrc: newSrc } : p)
    );
  }, []);

  const handleDeleteProject = useCallback((projectId: string) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
  }, []);
  
  const selectedProject = projects.find(p => p.id === selectedProjectId) || null;

  return {
    currentPage,
    projects,
    selectedProject,
    handleNewProject,
    handleSelectProject,
    handleBackToGallery,
    handleSaveProject,
    handleDeleteProject,
  };
};