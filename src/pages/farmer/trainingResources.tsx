import { useState } from 'react';
import {  Calendar, Video, Book, ExternalLink } from 'lucide-react'; // Added ExternalLink for video link
import AnalyseCropModal from './cropAnalysis';
 // Import the modal component

// Interface for a Training Resource
interface TrainingResource {
  id: string;
  title: string;
  shortDescription: string;
  lastUpdated: string;
  fullContent: string;
  resourceType: 'video' | 'article';
  videoLink?: string; // Added videoLink for video resources
}

// Mock data for training resources
const mockResources: TrainingResource[] = [
  {
    id: '1',
    title: 'Organic Farming Basics',
    shortDescription: 'Learn the fundamentals of organic farming techniques.',
    lastUpdated: '2025-04-10',
    fullContent:
      'Organic farming focuses on sustainable practices that avoid synthetic fertilizers and pesticides. This video covers soil preparation, composting, crop rotation, and natural pest control methods to help you transition to organic farming.',
    resourceType: 'video',
    videoLink: 'https://www.youtube.com/watch?v=organic-farming-basics',
  },
  {
    id: '2',
    title: 'Drip Irrigation Guide',
    shortDescription: 'A guide to setting up drip irrigation for water efficiency.',
    lastUpdated: '2025-03-15',
    fullContent:
      'Drip irrigation delivers water directly to the roots of plants, reducing water wastage. This article explains how to design and install a drip irrigation system, including choosing the right equipment and maintaining the system for optimal performance.',
    resourceType: 'article',
  },
  {
    id: '3',
    title: 'Pest Management Strategies',
    shortDescription: 'Effective strategies to manage pests without chemicals.',
    lastUpdated: '2025-02-20',
    fullContent:
      'This video explores integrated pest management (IPM) techniques, such as introducing beneficial insects, using traps, and planting companion crops to naturally deter pests. Learn how to protect your crops while maintaining a healthy ecosystem.',
    resourceType: 'video',
    videoLink: 'https://www.youtube.com/watch?v=pest-management-strategies',
  },
  {
    id: '4',
    title: 'Soil Fertility Enhancement',
    shortDescription: 'Techniques to improve soil fertility naturally.',
    lastUpdated: '2025-01-10',
    fullContent:
      'This article covers methods to enhance soil fertility, including the use of cover crops, organic manures, and biofertilizers. Understand how to test your soil and apply the right amendments to boost productivity.',
    resourceType: 'article',
  },
];

const TrainingResources = () => {
  const [selectedResource, setSelectedResource] = useState<TrainingResource | null>(null);
  const [showAllResources, setShowAllResources] = useState(false);
    const [showAnalyseModal, setShowAnalyseModal] = useState(false); // State to control the visibility of the Analyse Crop modal

  // Display only the first 3 resources initially, or all if "View More" is clicked
  const displayedResources = showAllResources ? mockResources : mockResources.slice(0, 3);

  return (
    <section className="py-8 relative">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 font-serif">Training Resources</h2>
      {mockResources.length === 0 ? (
        <p className="text-gray-600 text-lg font-sans">No training resources available.</p>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
          <ul className="space-y-6">
            {displayedResources.map(resource => (
              <li
                key={resource.id}
                className="border-b border-gray-200 pb-4 last:border-b-0"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-800 mb-1 font-serif">{resource.title}</h3>
                    <p className="text-sm text-gray-600 mb-2 font-sans">{resource.shortDescription}</p>
                    <div className="flex items-center space-x-8"> {/* Increased gap from space-x-4 to space-x-8 */}
                      <div className="flex items-center">
                        <Calendar className="text-blue-500 mr-3 h-5 w-5" />
                        <div>
                          <p className="text-gray-600 text-sm font-sans">Last Updated</p>
                          <p className="font-medium text-gray-800 font-sans">{resource.lastUpdated}</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        {resource.resourceType === 'video' ? (
                          <Video className="text-purple-500 mr-3 h-5 w-5" />
                        ) : (
                          <Book className="text-green-500 mr-3 h-5 w-5" />
                        )}
                        <div>
                          <p className="text-gray-600 text-sm font-sans">Resource Type</p>
                          <p className="font-medium text-gray-800 font-sans capitalize">{resource.resourceType}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedResource(resource)}
                    className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg text-sm font-sans ml-4"
                  >
                    View Details
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex justify-center space-x-4"> {/* Aligned buttons horizontally */}
           {mockResources.length > 3 && (
              <button
                onClick={() => setShowAllResources(!showAllResources)}
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-lg text-base font-sans"
              >
                {showAllResources ? 'View Less' : 'View More'}
              </button>
            )}
            <button
              onClick={() => setShowAnalyseModal(true)} // Open the Analyse Crop modal
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg text-base font-sans"
            >
              Analyse Crop
            </button>
          </div>
        </div>
      )}

      {/* Modal for showing detailed resource information */}
      {selectedResource && (
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
              onClick={() => setSelectedResource(null)}
              className="absolute top-4 right-4 text-gray-600 hover:text-gray-800 font-sans"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-2xl font-bold text-gray-800 mb-6 font-serif">{selectedResource.title}</h2>
            <div className="space-y-6">
              <div>
                <p className="text-gray-600 text-sm font-sans mb-2">Short Description</p>
                <p className="font-medium text-gray-800 font-sans">{selectedResource.shortDescription}</p>
              </div>
              <div className="flex items-center space-x-8"> {/* Increased gap from space-x-4 to space-x-8 */}
                <div className="flex items-center">
                  <Calendar className="text-blue-500 mr-3 h-5 w-5" />
                  <div>
                    <p className="text-gray-600 text-sm font-sans">Last Updated</p>
                    <p className="font-medium text-gray-800 font-sans">{selectedResource.lastUpdated}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  {selectedResource.resourceType === 'video' ? (
                    <Video className="text-purple-500 mr-3 h-5 w-5" />
                  ) : (
                    <Book className="text-green-500 mr-3 h-5 w-5" />
                  )}
                  <div>
                    <p className="text-gray-600 text-sm font-sans">Resource Type</p>
                    <p className="font-medium text-gray-800 font-sans capitalize">{selectedResource.resourceType}</p>
                  </div>
                </div>
              </div>
              {selectedResource.resourceType === 'video' && selectedResource.videoLink && (
                <div className="flex items-center">
                  <ExternalLink className="text-blue-500 mr-3 h-5 w-5" />
                  <div>
                    <p className="text-gray-600 text-sm font-sans mb-2">Watch Video</p>
                    <a
                      href={selectedResource.videoLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-medium font-sans"
                    >
                      Watch on YouTube
                    </a>
                  </div>
                </div>
              )}
              <div>
                <p className="text-gray-600 text-sm font-sans mb-2">Full Content</p>
                <p className="font-medium text-gray-800 font-sans">{selectedResource.fullContent}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-green-700 text-sm font-sans">
                  Apply these techniques to improve your farming practices. Reach out to local agricultural experts for more guidance.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Analyse Crop Modal */}
      {showAnalyseModal && (
        <AnalyseCropModal onClose={() => setShowAnalyseModal(false)} />
      )}
    </section>
  );
};

export default TrainingResources;