import React from 'react';
import { useLanguage } from '../context/LanguageContext';

export const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center rounded-full bg-gray-800 p-1 text-sm font-semibold">
      <button
        onClick={() => setLanguage('en')}
        className={`rounded-full px-4 py-1.5 transition-colors duration-300 ease-in-out ${
          language === 'en' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-700'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLanguage('id')}
        className={`rounded-full px-4 py-1.5 transition-colors duration-300 ease-in-out ${
          language === 'id' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-700'
        }`}
      >
        ID
      </button>
    </div>
  );
};
