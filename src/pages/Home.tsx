
import { useNavigate } from "react-router-dom";
import Navbar from "../components/ui/navbar";
import AboutSection from "../components/ui/aboutSection";
import CommonFooter from "../components/ui/footer";
import FeaturesSection from "../components/ui/features";
import ReviewsSection from "../components/ui/review";

const Home = () => {
  const navigate = useNavigate();
  const handleNavigate = () => {
    navigate("/terms-and-conditions");
  }

  const getMenuItems = () => {
    return [
      {
        label: "About Us",
        onClick: () => handleScrollToSection("about-us"),
        icon: null, // No icons for Home page navbar items
      },
      {
        label: "Terms and Conditions",
        onClick: () => handleNavigate(),
        icon: null,
      },
      {
        label: "Features",
        onClick: () => handleScrollToSection("features"),
        icon: null,
      },
      {
        label: "Reviews",
        onClick: () => handleScrollToSection("reviews"),
        icon: null,
      },
    ];
  };

  const handleScrollToSection = (sectionId: string) => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="bg-gradient-to-b from-green-0 to-green-100">
      {/* Navbar */}
      <Navbar menuItems={getMenuItems()} />

      {/* Hero Section */}
      <section id="hero" className="min-h-screen flex items-center justify-center p-6 bg-green-50">
  <div className="max-w-3xl mx-auto text-center">
    <h1 className="text-5xl md:text-6xl font-bold text-gray-800 mb-4 leading-tight">
      Empower Your Deliveries with <span className="text-green-600">AXANO Agro</span>
    </h1>
    <p className="text-lg text-gray-600 mb-8">
      Seamless delivery management for partners, powered by real-time updates and secure authentication.
    </p>
    <div className="flex justify-center space-x-4">
      <button
        onClick={() => navigate("/intro")}
        className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
      >
        Get Started
      </button>
      <button
        onClick={() => handleScrollToSection("about-us")}
        className="px-6 py-3 border border-green-500 text-green-500 rounded-lg hover:bg-green-50 font-medium"
      >
        Learn More
      </button>
    </div>
  </div>
</section>

      {/* About Us Section */}
      <section id="about-us" className="min-h-screen">
        <AboutSection />
      </section>

      {/* Features Section */}
      <FeaturesSection />

      {/* Reviews Section */}
      <ReviewsSection />

      {/* Footer */}
      <CommonFooter />
    </div>
  );
};

export default Home;