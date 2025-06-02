import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button"
import {  FaTruck } from "react-icons/fa"

const Intro3 = () => {
    const navigate=useNavigate();
    const Navigate=()=>{
        navigate("/language-selection");
    }
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-green-0 to-green-50">
    {/* Main container with shadow and rounded corners */}
    <div className="max-w-md  h-[700px] w-full bg-white rounded-xl shadow-lg p-8 text-center space-y-12">
      
      {/* Larger icon with improved styling */}
      <div className="flex justify-center mb-4">
        <div className="bg-green-100 p-10 rounded-full shadow-inner">
          <FaTruck className="text-green-600 text-7xl" />
        </div>
      </div>
      
      {/* Main heading */}
      <h1 className="text-3xl font-bold text-gray-900">Welcome to AgroMarket</h1>
      
      {/* Description text */}
      <div className="text-gray-700 leading-6 mb-6">
        <p>Connect with farmers, buyers and <span className="font-bold">delivery partners</span></p>
        <p> in one place</p>
      </div>
      
      {/* Three dots indicator */}
      <div className="flex justify-center space-x-2 mb-6">
        <div className="w-2 h-2 rounded-full bg-gray-300"></div>
        <div className="w-2 h-2 rounded-full bg-gray-300"></div>
        <div className="w-2 h-2 rounded-full bg-green-600"></div>
      </div>
        {/* Spacer to push button to bottom */}
        <div className="flex-1"></div>
      {/* Next button */}
      <div className="p-6 w-full">
          <Button 
            className="w-full bg-green-600  hover:bg-green-700 text-white py-7 rounded-xl shadow-md transition-all duration-300 transform hover:scale-[1.02] text-lg mt-20 mb-auto h-16"
            onClick={Navigate}
          >
            Next
          </Button>
        </div>
    </div>
  </div>
  )
}

export default Intro3