import { useState } from 'react';
import { GiWheat } from "react-icons/gi";

const MarketAnalysis = () => {
  const [showDetails, setShowDetails] = useState(false);

  const crops = [
    { name: "Wheat", change: "+1.2%", price: "₹2500/quintal", trend: "Stable", checked: false },
    { name: "Rice", change: "+0.8%", price: "₹3200/quintal", trend: "Rising", checked: true },
    { name: "Cotton", change: "-0.5%", price: "₹6000/quintal", trend: "Declining", checked: true },
  ];

  return (
    <>
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300 flex-1">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 font-serif">Today's Market Prices</h2>
        
        <div className="space-y-4">
          {crops.map((crop, index) => (
            <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors duration-200">
              <div className="flex items-center">
                <GiWheat 
                  className="mr-3 h-6 w-6 text-green-600"
                />
                <div>
                  <span className="font-medium text-gray-800 font-sans">{crop.name}</span>
                  <p className="text-sm text-gray-600 font-sans">{crop.price}</p>
                </div>
              </div>
              <span className={`text-sm font-medium font-sans ${crop.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                {crop.change}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => setShowDetails(true)}
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-lg text-base font-sans"
          >
            View Details
          </button>
        </div>
      </div>

      {/* Modal for showing detailed market analysis */}
      {showDetails && (
        <div className="fixed inset-0 bg-green-100 shadow-xl bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div
            className="bg-white rounded-2xl p-8 max-w-4xl w-full max-h-[80vh] overflow-y-auto relative scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <style>{`
              .scrollbar-hide::-webkit-scrollbar {
                display: none;
              }
            `}</style>
            <button
              onClick={() => setShowDetails(false)}
              className="absolute top-4 right-4 text-gray-600 hover:text-gray-800 font-sans"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-2xl font-bold text-gray-800 mb-6 font-serif">Detailed Market Analysis</h2>
            <div className="space-y-6">
              {crops.map((crop, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center mb-4">
                    <GiWheat className="mr-3 h-6 w-6 text-green-600" />
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 font-serif">{crop.name}</h3>
                      <p className="text-sm text-gray-600 font-sans">{crop.price}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 font-sans">Price Change</p>
                      <p className={`font-medium font-sans ${crop.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                        {crop.change}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 font-sans">Market Trend</p>
                      <p className="font-medium text-gray-800 font-sans">{crop.trend}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 font-sans">Recommended Action</p>
                      <p className="font-medium text-gray-800 font-sans">
                        {crop.trend === "Rising" ? "Hold/Sell" : crop.trend === "Stable" ? "Monitor" : "Buy/Hold"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 font-sans">Market Volume</p>
                      <p className="font-medium text-gray-800 font-sans">{Math.floor(Math.random() * 1000) + 500} quintals</p>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-green-50 rounded-lg">
                    <p className="text-green-700 text-sm font-sans">
                      {crop.trend === "Rising" 
                        ? `Strong demand for ${crop.name}. Consider selling at current prices.`
                        : crop.trend === "Stable"
                        ? `${crop.name} prices are stable. Monitor market for opportunities.`
                        : `Prices for ${crop.name} are declining. Consider holding or buying.`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MarketAnalysis;