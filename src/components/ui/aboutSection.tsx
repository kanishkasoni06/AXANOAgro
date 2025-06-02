import { useNavigate } from "react-router-dom";
const AboutSection = () => {
    const navigate= useNavigate();
  return (
    <div 
    className="relative h-screen w-full  text-black bg-gray-50">
    <div className="absolute inset-0 flex  items-center">
    <div className="justify-center ml-auto max-w-3xl">
        <img src={'https://media.istockphoto.com/id/1600745858/photo/young-famer-working-in-a-cornfield-inspecting-using-smartphone-inspecting-leaves-caused-by.jpg?s=1024x1024&w=is&k=20&c=fUYn0neXhLCk4w5xmoOS9m-3R-MrtbUJ2TsuemiWKvQ='} alt="Farm" className="mx-auto  object-cover rounded-lg shadow-lg" />
      </div>
      <div className="max-w-3xl mx-auto">
        <div>   <h2 className="text-3xl md:text-5xl font-bold text-gray-800  mb-6 font-serif">
            About Us
          </h2>
        <p className="text-lg md:text-xl text-gray-700 mb-4 font-sans leading-relaxed text-justify">
            Our platform revolutionizes agricultural trade by connecting farmers directly with buyers. Through seamless bidding and direct purchasing, we enable access to fresh, high-quality produce at fair prices, fostering transparency and trust in every transaction.
          </p>
          <p className="text-lg md:text-xl text-gray-700 font-sans leading-relaxed text-justify">
            By eliminating intermediaries, we empower farmers to showcase their harvests and buyers to source premium goods, supporting sustainable agriculture and vibrant local economies. Join a community where quality meets opportunity.
          </p>
          </div>   
          <div className="flex justify-start left-0 mt-3">
      <button className="animate-bounce bg-white text-green-700 px-6 py-3 rounded-full font-bold shadow-lg hover:bg-green-100 transition-all" onClick={() => navigate("/terms-and-conditions")}>
        Terms & Conditions
      </button>
    </div>
      </div>
    </div>
  </div>
  );
};

export default AboutSection;