import React from 'react';
import { Gallery } from './components/Gallery';
import { Editor } from './components/Editor';
import { useAppLogic } from './hooks/useAppLogic';

const App: React.FC = () => {
  const {
    currentPage,
    projects,
    selectedProject,
    handleNewProject,
    handleSelectProject,
    handleBackToGallery,
    handleSaveProject,
    handleDeleteProject,
  } = useAppLogic();

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      {currentPage === 'gallery' && (
        <Gallery 
          projects={projects} 
          onSelectProject={handleSelectProject}
          onNewProject={handleNewProject} 
          onDeleteProject={handleDeleteProject}
        />
      )}
      {currentPage === 'editor' && selectedProject && (
        <Editor 
          project={selectedProject}
          onBack={handleBackToGallery}
          onSave={handleSaveProject}
        />
      )}
    </div>
  );
};

export default App;
