import { FaBell, FaLock, FaTruck, FaShoppingCart, FaGavel, FaUsers } from "react-icons/fa";

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: <FaBell className="text-green-600 text-3xl mb-4" />,
    title: "Real-Time Notifications",
    description: "Stay updated with instant alerts on new deliveries and transactions.",
  },
  {
    icon: <FaLock className="text-green-600 text-3xl mb-4" />,
    title: "Secure Authentication",
    description: "Protect your account with robust and reliable login systems.",
  },
  {
    icon: <FaTruck className="text-green-600 text-3xl mb-4" />,
    title: "Efficient Delivery Management",
    description: "Manage your deliveries with ease and optimize your routes.",
  },
  {
    icon: <FaShoppingCart className="text-green-600 text-3xl mb-4" />,
    title: "Wholesale Purchase",
    description: "Access bulk buying options directly from farmers at competitive prices.",
  },
  {
    icon: <FaGavel className="text-green-600 text-3xl mb-4" />,
    title: "Bidding System",
    description: "Participate in auctions to secure delivery contracts efficiently.",
  },
  {
    icon: <FaUsers className="text-green-600 text-3xl mb-4" />,
    title: "Easy Contact",
    description: "Seamless communication between farmers, buyers, and delivery partners.",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="min-h-screen bg-green-50 flex items-center justify-center px-6 py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">
          Why Choose AgriFarm?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-xl shadow-md p-8 flex flex-col items-center text-center min-h-[220px] hover:scale-105 transition-all duration-300"
            >
              {feature.icon}
              <h3 className="text-gray-800 font-medium text-xl mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-500">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;