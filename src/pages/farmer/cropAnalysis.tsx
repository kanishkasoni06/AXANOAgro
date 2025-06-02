import { useState } from 'react';
import { Image, AlertTriangle, Leaf } from 'lucide-react';

// Interface for the analysis result (dummy data for now)
interface AnalysisResult {
  status: string;
  detectedIssue: string;
  recommendation: string;
}

// Dummy analysis result
const dummyResult: AnalysisResult = {
  status: 'Unhealthy Crop',
  detectedIssue: 'Powdery Mildew Detected',
  recommendation: 'Apply a fungicide and ensure proper ventilation. Monitor the crop for the next 7 days.',
};

interface AnalyseCropModalProps {
  onClose: () => void;
}

const AnalyseCropModal = ({ onClose }: AnalyseCropModalProps) => {
  const [isAnalysed, setIsAnalysed] = useState(false); // State to toggle between initial and result screens

  const handleAnalyse = () => {
    // Simulate analysis by switching to the result screen
    setIsAnalysed(true);
  };

  return (
    <div className="fixed inset-0 bg-green-100 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
      <div
        className="bg-white rounded-2xl p-8 max-w-3xl w-full max-h-[80vh] overflow-y-auto relative scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <style>{`
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-600 hover:text-gray-800 font-sans"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Initial Screen: Image Upload */}
        {!isAnalysed && (
          <>
            <h2 className="text-2xl font-bold text-gray-800 mb-6 font-serif">Analyse Your Crop</h2>
            <div className="space-y-6">
              <p className="text-gray-600 text-sm font-sans">
                Upload an image of your crop to analyse its health and detect any issues.
              </p>
              <div className="flex justify-center">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Image className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 text-sm font-sans mb-4">
                    Click to upload an image or drag and drop here
                  </p>
                  <button
                    onClick={handleAnalyse} // Simulate image upload and analysis
                    className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-lg text-base font-sans"
                  >
                    Upload Image
                  </button>
                </div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-green-700 text-sm font-sans">
                  Ensure the image is clear and well-lit for accurate analysis.
                </p>
              </div>
            </div>
          </>
        )}

        {/* Result Screen: Analysis Results */}
        {isAnalysed && (
          <>
            <h2 className="text-2xl font-bold text-gray-800 mb-6 font-serif">Crop Analysis Results</h2>
            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="border border-gray-200 rounded-lg p-2">
                  <div className="w-48 h-48 bg-gray-200 flex items-center justify-center rounded-lg">
                    <Image className="h-12 w-12 text-gray-400" />
                  </div>
                </div>
              </div>
              <div>
                <p className="text-gray-600 text-sm font-sans mb-2">Status</p>
                <p className="font-medium text-gray-800 font-sans flex items-center">
                  <Leaf className="text-red-500 mr-2 h-5 w-5" />
                  {dummyResult.status}
                </p>
              </div>
              <div>
                <p className="text-gray-600 text-sm font-sans mb-2">Detected Issue</p>
                <p className="font-medium text-gray-800 font-sans flex items-center">
                  <AlertTriangle className="text-yellow-500 mr-2 h-5 w-5" />
                  {dummyResult.detectedIssue}
                </p>
              </div>
              <div>
                <p className="text-gray-600 text-sm font-sans mb-2">Recommendation</p>
                <p className="font-medium text-gray-800 font-sans">{dummyResult.recommendation}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-green-700 text-sm font-sans">
                  Follow the recommendations and monitor your crop. Consult with a local agricultural expert if the issue persists.
                </p>
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setIsAnalysed(false)} // Go back to upload screen
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg text-sm font-sans"
                >
                  Analyse Another Image
                </button>
                <button
                  onClick={onClose}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg text-sm font-sans"
                >
                  Close
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AnalyseCropModal;