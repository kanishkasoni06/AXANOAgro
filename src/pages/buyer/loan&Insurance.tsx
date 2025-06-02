import { useState } from 'react';
import { Banknote, Shield, ExternalLink } from 'lucide-react'; // Icons for loans, insurance, and official link

// Interface for a Loan or Insurance item
interface LoanInsuranceItem {
  id: string;
  title: string;
  shortDescription: string;
  lastUpdated: string;
  providerType: 'Bank' | 'Insurance Company';
  fullDetails: string;
  eligibility: string;
  applicationProcess: string;
  officialLink: string;
}

// Mock data for loans and insurance
const mockLoanInsurance: LoanInsuranceItem[] = [
  {
    id: '1',
    title: 'Agricultural Loan Scheme',
    shortDescription: 'Low-interest loans for farmers to purchase equipment and seeds.',
    lastUpdated: '2025-04-15',
    providerType: 'Bank',
    fullDetails:
      'This Agricultural Loan Scheme offers low-interest loans to farmers with flexible repayment terms. The loan can be used for purchasing equipment, seeds, fertilizers, and other farming essentials. Interest rates start at 4% per annum, with a maximum loan amount of ₹5,00,000.',
    eligibility: 'Farmers with at least 2 years of farming experience and land ownership documents.',
    applicationProcess:
      'Apply through your nearest bank branch with your Aadhaar card, land documents, and proof of farming experience.',
    officialLink: 'https://example.com/apply-agri-loan',
  },
  {
    id: '2',
    title: 'Crop Insurance Plan',
    shortDescription: 'Protect your crops against natural disasters and pests.',
    lastUpdated: '2025-03-20',
    providerType: 'Insurance Company',
    fullDetails:
      'This Crop Insurance Plan provides coverage for losses due to natural disasters (e.g., floods, droughts) and pest infestations. Premiums start at ₹2,000 per hectare, with a maximum coverage of ₹1,00,000 per hectare. Claims are processed within 15 days of verification.',
    eligibility: 'Farmers cultivating crops on at least 1 hectare of land.',
    applicationProcess:
      'Apply through the insurance provider’s portal or contact your local insurance agent with proof of land cultivation.',
    officialLink: 'https://example.com/apply-crop-insurance',
  },
  {
    id: '3',
    title: 'Equipment Financing Loan',
    shortDescription: 'Finance new farming equipment with easy EMI options.',
    lastUpdated: '2025-02-10',
    providerType: 'Bank',
    fullDetails:
      'The Equipment Financing Loan allows farmers to purchase new farming equipment with EMIs spread over 5 years. Interest rates are fixed at 5% per annum, and loans up to ₹10,00,000 are available. Collateral may be required for loans above ₹5,00,000.',
    eligibility: 'Farmers with a good credit history and proof of income from farming.',
    applicationProcess:
      'Visit your nearest bank branch with your credit history, income proof, and ID documents to apply.',
    officialLink: 'https://example.com/apply-equipment-loan',
  },
  {
    id: '4',
    title: 'Livestock Insurance',
    shortDescription: 'Insurance coverage for livestock against diseases and accidents.',
    lastUpdated: '2025-01-05',
    providerType: 'Insurance Company',
    fullDetails:
      'The Livestock Insurance plan covers losses due to diseases, accidents, and theft of livestock. Premiums are calculated based on the livestock value, starting at ₹500 per animal. Coverage includes veterinary expenses up to ₹10,000 per incident.',
    eligibility: 'Farmers owning at least 5 livestock animals.',
    applicationProcess:
      'Contact your local insurance provider or apply online with details of your livestock and proof of ownership.',
    officialLink: 'https://example.com/apply-livestock-insurance',
  },
];

const LoanAndInsurance = () => {
  const [selectedItem, setSelectedItem] = useState<LoanInsuranceItem | null>(null);
  const [showAllItems, setShowAllItems] = useState(false);

  // Display only the first 3 items initially, or all if "View More" is clicked
  const displayedItems = showAllItems ? mockLoanInsurance : mockLoanInsurance.slice(0, 3);

  return (
    <section className="py-8 relative">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 font-serif">Loan and Insurance Information</h2>
      {mockLoanInsurance.length === 0 ? (
        <p className="text-gray-600 text-lg font-sans">No loan or insurance information available.</p>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
          <ul className="space-y-6">
            {displayedItems.map(item => (
              <li
                key={item.id}
                className="border-b border-gray-200 pb-4 last:border-b-0"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-800 mb-1 font-serif">{item.title}</h3>
                    <p className="text-sm text-gray-600 mb-2 font-sans">{item.shortDescription}</p>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        {item.providerType === 'Bank' ? (
                          <Banknote className="text-blue-500 mr-3 h-5 w-5" />
                        ) : (
                          <Shield className="text-green-500 mr-3 h-5 w-5" />
                        )}
                        <div>
                          <p className="text-gray-600 text-sm font-sans">Provider Type</p>
                          <p className="font-medium text-gray-800 font-sans">{item.providerType}</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Banknote className="text-blue-500 mr-3 h-5 w-5" />
                        <div>
                          <p className="text-gray-600 text-sm font-sans">Last Updated</p>
                          <p className="font-medium text-gray-800 font-sans">{item.lastUpdated}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedItem(item)}
                    className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg text-sm font-sans ml-4"
                  >
                    View Details
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {mockLoanInsurance.length > 3 && (
            <div className="mt-6 text-center">
              <button
                onClick={() => setShowAllItems(!showAllItems)}
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-lg text-base font-sans"
              >
                {showAllItems ? 'View Less' : 'View More'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal for showing detailed loan/insurance information */}
      {selectedItem && (
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
              onClick={() => setSelectedItem(null)}
              className="absolute top-4 right-4 text-gray-600 hover:text-gray-800 font-sans"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-2xl font-bold text-gray-800 mb-6 font-serif">{selectedItem.title}</h2>
            <div className="space-y-6">
              <div>
                <p className="text-gray-600 text-sm font-sans mb-2">Short Description</p>
                <p className="font-medium text-gray-800 font-sans">{selectedItem.shortDescription}</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  {selectedItem.providerType === 'Bank' ? (
                    <Banknote className="text-blue-500 mr-3 h-5 w-5" />
                  ) : (
                    <Shield className="text-green-500 mr-3 h-5 w-5" />
                  )}
                  <div>
                    <p className="text-gray-600 text-sm font-sans">Provider Type</p>
                    <p className="font-medium text-gray-800 font-sans">{selectedItem.providerType}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Banknote className="text-blue-500 mr-3 h-5 w-5" />
                  <div>
                    <p className="text-gray-600 text-sm font-sans">Last Updated</p>
                    <p className="font-medium text-gray-800 font-sans">{selectedItem.lastUpdated}</p>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-gray-600 text-sm font-sans mb-2">Full Description</p>
                <p className="font-medium text-gray-800 font-sans">{selectedItem.fullDetails}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm font-sans mb-2">Eligibility Criteria</p>
                <p className="font-medium text-gray-800 font-sans">{selectedItem.eligibility}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm font-sans mb-2">Application Process</p>
                <p className="font-medium text-gray-800 font-sans">{selectedItem.applicationProcess}</p>
              </div>
              <div className="flex items-center">
                <ExternalLink className="text-blue-500 mr-3 h-5 w-5" />
                <div>
                  <p className="text-gray-600 text-sm font-sans mb-2">Official Link</p>
                  <a
                    href={selectedItem.officialLink}
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
                  Ensure you meet the eligibility criteria before applying. Contact your local bank or insurance provider for assistance.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default LoanAndInsurance;