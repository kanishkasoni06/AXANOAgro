 import { useNavigate } from "react-router-dom";
import Image from "../../assets/farm-0.jpg";
const HeroSection = () => {
  const navigate= useNavigate();
  return (
    <div 
    className="relative h-screen w-full bg-green-100 text-black">
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="text-center px-4 max-w-4xl">
        <h1 className="text-4xl md:text-6xl font-bold mb-6 text-start">
          Connecting Farmers to Markets
        </h1>
        <p className="text-xl md:text-2xl mb-8 text-start">
          Access real-time prices, trade directly with buyers, and get export advisory services all in one platform.
        </p>
        <div className="flex justify-start left-0">
      <button className="animate-bounce bg-white text-green-700 px-6 py-3 rounded-full font-bold shadow-lg hover:bg-green-100 transition-all" onClick={() => navigate("/marketplace")}>
        Explore Marketplace
      </button>
    </div>
      </div>
      <div>
        <img src={Image} alt="Farm" className="w-full h-auto object-cover rounded-lg shadow-lg" />
      </div>
    </div>
  </div>
  );
};

export default HeroSection;