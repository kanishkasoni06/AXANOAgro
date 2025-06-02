import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { FaLanguage, FaArrowLeft } from 'react-icons/fa';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/authContext';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n'; // Adjust path to your i18n.ts
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase'; // Adjust path to your Firebase config

interface Language {
  name: string;
  native: string;
  script: string;
  code: string; // ISO 639-1 or custom code for i18next
}

const LanguageSelection = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation(); // Hook for translations

  // Initialize selectedLanguage from localStorage or i18n.language
  const [selectedLanguage, setSelectedLanguage] = useState<string | undefined>(
    localStorage.getItem('preferredLanguage') || i18n.language
  );

  // Check if coming from settings page
  const fromSettings = location.state?.fromSettings;

  // Language data with native scripts and i18next codes
  const languages: Language[] = [
    { name: 'English', native: 'English', script: 'Text', code: 'en' },
    { name: 'Hindi', native: 'हिंदी', script: 'देवनागरी', code: 'hi' },
    { name: 'Punjabi', native: 'ਪੰਜਾਬੀ', script: 'ਗੁਰਮੁਖੀ', code: 'pa' },
    { name: 'Bengali', native: 'বাংলা', script: 'বাংলা লিপি', code: 'bn' },
    { name: 'Tamil', native: 'தமிழ்', script: 'தமிழ் அரிச்சுவடி', code: 'ta' },
    { name: 'Telugu', native: 'తెలుగు', script: 'తెలుగు లిపి', code: 'te' },
  ];

  // Sync i18n.language with localStorage on component mount
  useEffect(() => {
    const storedLanguage = localStorage.getItem('preferredLanguage');
    if (storedLanguage && storedLanguage !== i18n.language) {
      i18n.changeLanguage(storedLanguage);
      setSelectedLanguage(storedLanguage);
    }
  }, []);

  // Handle language selection
  const handleLanguageSelect = (languageCode: string) => {
    setSelectedLanguage(languageCode);
    i18n.changeLanguage(languageCode); // Change app language immediately
    localStorage.setItem('preferredLanguage', languageCode); // Update localStorage immediately
  };

  // Handle Continue button click
  const handleContinue = async () => {
    if (!selectedLanguage) return;

    // Persist language in local storage
    localStorage.setItem('preferredLanguage', selectedLanguage);
    localStorage.setItem('i18nextLng', selectedLanguage); // Keep for i18next compatibility

    // Save to Firestore for logged-in users
    if (user) {
      try {
        // Note: Updated collection name to 'farmer' as per your code
        await updateDoc(doc(db, 'farmer', user.uid), {
          preferredLanguage: selectedLanguage,
        });
      } catch (error) {
        console.error('Error saving language to Firestore:', error);
      }
    }

    if (user && user.role) {
      // If user exists and has a role, navigate to /{role}/settings
      navigate(`/${user.role}/settings`);
    } else {
      // Navigate to role-selection for non-logged-in users or if no role
      navigate('/role-selection');
    }
  };

  // Handle back to settings
  const handleBack = () => {
    navigate(-1); // Go back to previous page (settings)
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-green-0 to-green-50">
      {/* Mobile-sized container */}
      <div className="w-full max-w-md h-[700px] bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col">
        {/* Header with optional back button */}
        <div className="px-4 py-4 flex items-center">
          {fromSettings && (
            <Button
              variant="ghost"
              onClick={handleBack}
              className="text-gray-600 hover:text-gray-900 mr-4"
              aria-label={t('backToSettings')}
            >
              <FaArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="flex-1" /> {/* Spacer to push title to center if no back button */}
        </div>

        {/* Content area */}
        <div className="flex-1 px-4 flex flex-col">
          {/* Title */}
          <div className="grid grid-flow-col px-8">
            <FaLanguage className="text-4xl text-green-600" />
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">
              {t('chooseLanguage')}
            </h2>
          </div>

          {/* Language options grid - 2 columns */}
          <div className="grid grid-cols-2 gap-3 mb-6 px-2 overflow-y-auto">
            {languages.map((lang) => (
              <button
                key={lang.name}
                onClick={() => handleLanguageSelect(lang.code)}
                className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all ${
                  selectedLanguage === lang.code
                    ? 'bg-green-50 border-green-500 scale-[1.02]'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
                aria-label={`Select ${lang.name} language`}
              >
                <span className="font-medium text-gray-900 text-lg">
                  {lang.native}
                </span>
                <span className="text-gray-500 text-sm mt-1">
                  {lang.script}
                </span>
              </button>
            ))}
          </div>

          {/* Continue button */}
          <div className="pb-10 px-6 mt-auto">
            <Button
              onClick={handleContinue}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-6 rounded-lg shadow-md"
              disabled={!selectedLanguage}
            >
              {t('continue')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LanguageSelection;