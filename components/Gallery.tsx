import React, { useRef } from 'react';
import type { Project } from '../types';
import { PlusIcon, ImageIcon, TrashIcon, DownloadIcon } from './icons';
import { useLanguage } from '../context/LanguageContext';
import { LanguageSwitcher } from './LanguageSwitcher';

interface GalleryProps {
  projects: Project[];
  onSelectProject: (projectId: string) => void;
  onNewProject: (file: File) => void;
  onDeleteProject: (projectId: string) => void;
}

export const Gallery: React.FC<GalleryProps> = ({ projects, onSelectProject, onNewProject, onDeleteProject }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onNewProject(file);
    }
    // Reset the input value to allow selecting the same file again
    if (event.target) {
        event.target.value = '';
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    onDeleteProject(projectId);
  };
  
  const handleDownloadClick = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = project.currentSrc;
    // Extract extension from mime type, default to png
    const extension = project.currentSrc.split(';')[0].split('/')[1] || 'png';
    link.download = `${project.name}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="flex justify-between items-end mb-8 border-b border-gray-700 pb-4">
        <div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-wider uppercase">MEMAI</h1>
          <p className="text-sm text-gray-400 tracking-wide -mt-1">{t('memaiBy')}</p>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <>
            <label
              htmlFor="new-project-upload"
              className="flex cursor-pointer items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white shadow-md transition-transform hover:scale-105 hover:bg-indigo-500"
            >
              <PlusIcon />
              {t('newProject')}
            </label>
            <input
              id="new-project-upload"
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/png, image/jpeg, image/webp"
              aria-label={t('newProject')}
            />
          </>
        </div>
      </header>

      <main>
        {projects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {projects.map(project => (
              <div
                key={project.id}
                onClick={() => onSelectProject(project.id)}
                className="group relative aspect-w-1 aspect-h-1 bg-gray-800 rounded-xl overflow-hidden cursor-pointer shadow-lg hover:shadow-indigo-500/30 transition-all duration-300"
              >
                <img src={project.currentSrc} alt={project.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                <div className="absolute inset-0 bg-black bg-opacity-40 flex flex-col justify-end p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <h3 className="text-white font-bold text-lg truncate">{project.name}</h3>
                  <p className="text-indigo-300 text-sm">{t('clickToEdit')}</p>
                </div>
                <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button
                        onClick={(e) => handleDownloadClick(e, project)}
                        aria-label={`${t('downloadImage')} ${project.name}`}
                        className="p-2 bg-blue-600/80 hover:bg-blue-500 rounded-full text-white transition-colors transform hover:scale-110"
                    >
                        <DownloadIcon />
                    </button>
                    <button
                        onClick={(e) => handleDeleteClick(e, project.id)}
                        aria-label={`Delete ${project.name}`}
                        className="p-2 bg-red-600/80 hover:bg-red-500 rounded-full text-white transition-colors transform hover:scale-110"
                    >
                        <TrashIcon />
                    </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 flex flex-col items-center justify-center h-[60vh]">
            <ImageIcon />
            <h2 className="text-2xl font-semibold text-gray-400 mt-4">{t('noPhotosYet')}</h2>
            <p className="mt-2 text-gray-500">{t('getStarted')}</p>
          </div>
        )}
      </main>
    </div>
  );
};