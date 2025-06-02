import { FaStar } from "react-icons/fa";

const ReviewsSection = () => {
  return (
    <section id="reviews" className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">
          What Our Partners Say
        </h2>
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          {/* Review 1 */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center mb-2">
              {[...Array(5)].map((_, i) => (
                <FaStar key={i} className="text-yellow-400 text-sm" />
              ))}
            </div>
            <p className="text-gray-800 italic">
              "AgriFarm has made my delivery process so efficient! The real-time notifications keep me on track."
            </p>
            <p className="text-sm text-gray-500 mt-2">- Delivery Partner A</p>
          </div>
          {/* Review 2 */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center mb-2">
              {[...Array(4)].map((_, i) => (
                <FaStar key={i} className="text-yellow-400 text-sm" />
              ))}
              <FaStar className="text-gray-300 text-sm" />
            </div>
            <p className="text-gray-800 italic">
              "The bidding system is a game-changer. I can secure better contracts easily."
            </p>
            <p className="text-sm text-gray-500 mt-2">- Delivery Partner B</p>
          </div>
          {/* Review 3 */}
          <div className="p-4">
            <div className="flex items-center mb-2">
              {[...Array(5)].map((_, i) => (
                <FaStar key={i} className="text-yellow-400 text-sm" />
              ))}
            </div>
            <p className="text-gray-800 italic">
              "I love how I can directly contact farmers and buyers. It saves so much time!"
            </p>
            <p className="text-sm text-gray-500 mt-2">- Delivery Partner C</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ReviewsSection;