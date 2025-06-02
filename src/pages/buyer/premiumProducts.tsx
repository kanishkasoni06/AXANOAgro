import { useState } from 'react';
import { Package, Star } from 'lucide-react'; // Icons for products and quality rating

interface Product {
  name: string;
  quantity: string;
  price: string;
  quality: string;
  description: string;
  origin: string;
  certification: string;
}

const PremiumProducts = () => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showAllProducts, setShowAllProducts] = useState(false);

  const products: Product[] = [
    {
      name: "Organic Wheat",
      quantity: "5.7 tons",
      price: "₹24.50",
      quality: "★★★★☆",
      description: "High-quality organic wheat grown without synthetic pesticides.",
      origin: "Punjab, India",
      certification: "USDA Organic",
    },
    {
      name: "Premium Basmati Rice",
      quantity: "3.2 tons",
      price: "₹38.75",
      quality: "★★★★★",
      description: "Aromatic long-grain basmati rice with exceptional flavor.",
      origin: "Haryana, India",
      certification: "FSSAI Certified",
    },
    {
      name: "Fresh Vegetables",
      quantity: "1.5 tons",
      price: "₹18.20",
      quality: "★★★☆☆",
      description: "Freshly harvested mixed vegetables, ideal for daily consumption.",
      origin: "Uttar Pradesh, India",
      certification: "Local Organic",
    },
    {
      name: "Organic Lentils",
      quantity: "2.8 tons",
      price: "₹29.90",
      quality: "★★★★☆",
      description: "Nutritious organic lentils, free from chemical fertilizers.",
      origin: "Madhya Pradesh, India",
      certification: "USDA Organic",
    },
  ];

  // Display only the first 3 products initially, or all if "View More" is clicked
  const displayedProducts = showAllProducts ? products : products.slice(0, 3);

  return (
    <section className="py-8 relative">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 font-serif">Premium Products</h2>
      {products.length === 0 ? (
        <p className="text-gray-600 text-lg font-sans">No premium products available.</p>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
          <ul className="space-y-6">
            {displayedProducts.map((product, index) => (
              <li
                key={index}
                className="border-b border-gray-200 pb-4 last:border-b-0"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-800 mb-1 font-serif">{product.name}</h3>
                    <p className="text-sm text-gray-600 mb-2 font-sans">{product.description}</p>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <Star className="text-yellow-500 mr-3 h-5 w-5" />
                        <div>
                          <p className="text-gray-600 text-sm font-sans">Quality Rating</p>
                          <p className="font-medium text-gray-800 font-sans">{product.quality}</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Package className="text-blue-500 mr-3 h-5 w-5" />
                        <div>
                          <p className="text-gray-600 text-sm font-sans">Origin</p>
                          <p className="font-medium text-gray-800 font-sans">{product.origin}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedProduct(product)}
                    className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg text-sm font-sans ml-4"
                  >
                    View Details
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {products.length > 3 && (
            <div className="mt-6 text-center">
              <button
                onClick={() => setShowAllProducts(!showAllProducts)}
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-lg text-base font-sans"
              >
                {showAllProducts ? 'View Less' : 'View More'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal for showing detailed product information */}
      {selectedProduct && (
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
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 text-gray-600 hover:text-gray-800 font-sans"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-2xl font-bold text-gray-800 mb-6 font-serif">{selectedProduct.name}</h2>
            <div className="space-y-6">
              <div>
                <p className="text-gray-600 text-sm font-sans mb-2">Description</p>
                <p className="font-medium text-gray-800 font-sans">{selectedProduct.description}</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <Package className="text-blue-500 mr-3 h-5 w-5" />
                  <div>
                    <p className="text-gray-600 text-sm font-sans">Origin</p>
                    <p className="font-medium text-gray-800 font-sans">{selectedProduct.origin}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Star className="text-yellow-500 mr-3 h-5 w-5" />
                  <div>
                    <p className="text-gray-600 text-sm font-sans">Quality Rating</p>
                    <p className="font-medium text-gray-800 font-sans">{selectedProduct.quality}</p>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-gray-600 text-sm font-sans mb-2">Available Quantity</p>
                <p className="font-medium text-gray-800 font-sans">{selectedProduct.quantity}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm font-sans mb-2">Price/kg</p>
                <p className="font-medium text-gray-800 font-sans">{selectedProduct.price}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm font-sans mb-2">Certification</p>
                <p className="font-medium text-gray-800 font-sans">{selectedProduct.certification}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-green-700 text-sm font-sans">
                  Ideal for bulk purchase. Contact suppliers for availability and delivery options.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default PremiumProducts;