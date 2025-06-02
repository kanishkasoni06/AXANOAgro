
import { FaFacebook, FaTwitter, FaInstagram, FaLinkedin } from "react-icons/fa";

const CommonFooter = () => {
  return (
    <footer className="bg-gray-800 text-white py-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <h3 className="text-xl font-bold mb-4">AgroMarket</h3>
            <p className="text-gray-400">
              Connecting farmers to markets with real-time prices, direct trade, and advisory services.
            </p>
            <div className="flex space-x-4 mt-4">
              <a href="#" className="text-gray-400 hover:text-white">
                <FaFacebook size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                <FaTwitter size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                <FaInstagram size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                <FaLinkedin size={20} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-white">Home</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white">Market Prices</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white">Advisory Services</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white">My Account</a></li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Services</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-white">Weather Forecast</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white">Crop Advisory</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white">Market Analysis</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white">Government Schemes</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Contact Us</h4>
            <address className="text-gray-400 not-italic">
              <p>123 Farm Road</p>
              <p>Agricultural Zone</p>
              <p>Punjab, India 143001</p>
              <p className="mt-2">Email: info@agromarket.com</p>
              <p>Phone: +91 98765 43210</p>
            </address>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="border-t border-gray-700 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} AgroMarket. All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="text-gray-400 hover:text-white text-sm">Terms of Service</a>
            <a href="#" className="text-gray-400 hover:text-white text-sm">Privacy Policy</a>
            <a href="#" className="text-gray-400 hover:text-white text-sm">Legal</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default CommonFooter;