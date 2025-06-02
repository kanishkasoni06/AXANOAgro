import { useState } from 'react';
import { Calendar, ExternalLink } from 'lucide-react'; // Added ExternalLink for the official link

// Interface for a Government Scheme
interface GovernmentScheme {
  id: string;
  name: string;
  shortDescription: string;
  lastUpdated: string;
  fullDescription: string;
  eligibility: string;
  applicationProcess: string;
  officialLink: string; // Added officialLink field
}

// Mock data for government schemes
const mockSchemes: GovernmentScheme[] = [
  {
    id: '1',
    name: 'PM Kisan Samman Nidhi',
    shortDescription: 'Financial support of ₹6,000 per year for farmers.',
    lastUpdated: '2025-04-15',
    fullDescription:
      'The Pradhan Mantri Kisan Samman Nidhi (PM-KISAN) scheme provides financial assistance of ₹6,000 per year to small and marginal farmers, payable in three equal installments of ₹2,000 every four months.',
    eligibility:
      'Small and marginal farmers with landholding up to 2 hectares are eligible. Farmers must be registered with the local agricultural department.',
    applicationProcess:
      'Apply online through the PM-KISAN portal or visit your nearest Common Service Centre (CSC) with your Aadhaar card and land documents.',
    officialLink: 'https://pmkisan.gov.in',
  },
  {
    id: '2',
    name: 'Crop Insurance Scheme',
    shortDescription: 'Insurance coverage for crop loss due to natural calamities.',
    lastUpdated: '2025-03-20',
    fullDescription:
      'The Pradhan Mantri Fasal Bima Yojana (PMFBY) provides comprehensive insurance coverage against crop loss due to natural calamities, pests, and diseases.',
    eligibility:
      'All farmers growing notified crops in the notified areas are eligible. Both loanee and non-loanee farmers can apply.',
    applicationProcess:
      'Contact your local agricultural officer or apply through the PMFBY portal. Premiums are subsidized for farmers.',
    officialLink: 'https://pmfby.gov.in',
  },
  {
    id: '3',
    name: 'Soil Health Card Scheme',
    shortDescription: 'Free soil testing and health cards for farmers.',
    lastUpdated: '2025-02-10',
    fullDescription:
      'The Soil Health Card Scheme provides farmers with soil health cards every 2 years, which contain information on soil nutrient status and recommendations for improvement.',
    eligibility: 'All farmers are eligible to participate in this scheme.',
    applicationProcess:
      'Visit your local agricultural office to register for soil testing. Soil samples will be collected by officials.',
    officialLink: 'https://soilhealth.dac.gov.in',
  },
  {
    id: '4',
    name: 'Kisan Credit Card Scheme',
    shortDescription: 'Access to affordable credit for farming needs.',
    lastUpdated: '2025-01-05',
    fullDescription:
      'The Kisan Credit Card (KCC) scheme provides farmers with access to affordable credit for agricultural and allied activities, with flexible repayment options.',
    eligibility: 'All farmers, including tenant farmers, are eligible to apply for a KCC.',
    applicationProcess:
      'Visit your nearest bank branch with your land documents and ID proof to apply for a Kisan Credit Card.',
    officialLink: 'https://www.nabard.org/kisan-credit-card',
  },
];

const GovernmentSchemeUpdates = () => {
  const [selectedScheme, setSelectedScheme] = useState<GovernmentScheme | null>(null);
  const [showAllSchemes, setShowAllSchemes] = useState(false);

  // Display only the first 3 schemes initially, or all if "View More" is clicked
  const displayedSchemes = showAllSchemes ? mockSchemes : mockSchemes.slice(0, 3);

  return (
    <section className="py-8 relative">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 font-serif">Government Scheme Updates</h2>
      {mockSchemes.length === 0 ? (
        <p className="text-gray-600 text-lg font-sans">No government scheme updates available.</p>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
          <ul className="space-y-6">
            {displayedSchemes.map(scheme => (
              <li
                key={scheme.id}
                className="border-b border-gray-200 pb-4 last:border-b-0"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-800 mb-1 font-serif">{scheme.name}</h3>
                    <p className="text-sm text-gray-600 mb-2 font-sans">{scheme.shortDescription}</p>
                    <div className="flex items-center">
                      <Calendar className="text-blue-500 mr-3 h-5 w-5" />
                      <div>
                        <p className="text-gray-600 text-sm font-sans">Last Updated</p>
                        <p className="font-medium text-gray-800 font-sans">{scheme.lastUpdated}</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedScheme(scheme)}
                    className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg text-sm font-sans ml-4"
                  >
                    View Details
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {mockSchemes.length > 3 && (
            <div className="mt-6 text-center">
              <button
                onClick={() => setShowAllSchemes(!showAllSchemes)}
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-lg text-base font-sans"
              >
                {showAllSchemes ? 'View Less' : 'View More'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal for showing detailed scheme information */}
      {selectedScheme && (
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
              onClick={() => setSelectedScheme(null)}
              className="absolute top-4 right-4 text-gray-600 hover:text-gray-800 font-sans"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-2xl font-bold text-gray-800 mb-6 font-serif">{selectedScheme.name}</h2>
            <div className="space-y-6">
              <div>
                <p className="text-gray-600 text-sm font-sans mb-2">Short Description</p>
                <p className="font-medium text-gray-800 font-sans">{selectedScheme.shortDescription}</p>
              </div>
              <div className="flex items-center">
                <Calendar className="text-blue-500 mr-3 h-5 w-5" />
                <div>
                  <p className="text-gray-600 text-sm font-sans">Last Updated</p>
                  <p className="font-medium text-gray-800 font-sans">{selectedScheme.lastUpdated}</p>
                </div>
              </div>
              <div>
                <p className="text-gray-600 text-sm font-sans mb-2">Full Description</p>
                <p className="font-medium text-gray-800 font-sans">{selectedScheme.fullDescription}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm font-sans mb-2">Eligibility Criteria</p>
                <p className="font-medium text-gray-800 font-sans">{selectedScheme.eligibility}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm font-sans mb-2">Application Process</p>
                <p className="font-medium text-gray-800 font-sans">{selectedScheme.applicationProcess}</p>
              </div>
              <div className="flex items-center">
                <ExternalLink className="text-blue-500 mr-3 h-5 w-5" />
                <div>
                  <p className="text-gray-600 text-sm font-sans mb-2">Official Link</p>
                  <a
                    href={selectedScheme.officialLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-medium font-sans"
                  >
                    Apply on the Official Website
                  </a>
                </div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-green-700 text-sm font-sans">
                  Ensure you meet the eligibility criteria before applying. Contact your local agricultural office for assistance.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default GovernmentSchemeUpdates;