import React, { useRef, useState, useEffect } from "react";
import { BiUser, BiMenu } from "react-icons/bi";
import { FaBell, FaTimes } from "react-icons/fa";
import { auth } from "../../firebase/firebase";
import { signOut } from "firebase/auth";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/authContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/firebase";

interface MenuItem {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
}

interface NavbarProps {
  menuItems: MenuItem[];
}

const Navbar: React.FC<NavbarProps> = ({ menuItems }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userDetails, setUserDetails] = useState<{ fullName: string; role: string; profileImage?: string | null } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const location = useLocation();

  // Check if we're on the homepage
  const isHomePage = location.pathname === "/";

  // Fetch user details from Firestore if not available in localStorage
  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Check localStorage first
        const storedUser = localStorage.getItem('authUser');
        let parsedUser = storedUser ? JSON.parse(storedUser) : null;

        if (parsedUser?.fullName) {
          setUserDetails({
            fullName: parsedUser.fullName,
            role: parsedUser.role || null,
            profileImage: parsedUser.profileImage || null,
          });
          setLoading(false);
          return;
        }

        // If fullName is not in localStorage, fetch from Firestore
        let userDoc;
        if (user.role === 'farmer') {
          userDoc = await getDoc(doc(db, "farmer", user.uid));
        } else if (user.role === 'buyer') {
          userDoc = await getDoc(doc(db, "buyer", user.uid));
        } else if (user.role === 'deliveryPartner') {
          userDoc = await getDoc(doc(db, "deliveryPartner", user.uid));
        }

        if (userDoc && userDoc.exists()) {
          const data = userDoc.data();
          const updatedUser = {
            ...parsedUser,
            fullName: data.fullName || "User",
            profileImage: data.profileImage || null,
          };
          setUserDetails({
            fullName: data.fullName || "User",
            role: user.role || "",
            profileImage: data.profileImage || null,
          });
          // Update localStorage with the fetched fullName
          localStorage.setItem('authUser', JSON.stringify(updatedUser));
        } else {
          setUserDetails({
            fullName: "User",
            role: user.role || "",
            profileImage: null,
          });
        }
      } catch (err) {
        console.error("Error fetching user details:", err);
        setUserDetails({
          fullName: "User",
          role: user.role || "",
          profileImage: null,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, [user]);

  // Close dropdown when clicking outside
  const handleClickOutside = (event: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  };

  // Add/remove click outside listener
  React.useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleLogout = async () => {
    setChecking(true);
    setError(null);

    try {
      // Sign out the user using Firebase Authentication
      await signOut(auth);

      // Clear user data from AuthContext and localStorage
      setUser(null);

      console.log("User signed out. Current user:", auth.currentUser);

      // Navigate to the login page after logout
      navigate('/');
    } catch (err: any) {
      console.error('Logout error:', err);
      setError('Failed to log out. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  const fullName = userDetails?.fullName || "User";
  const role = userDetails?.role || null;
  const profileImage = userDetails?.profileImage || null;

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center ">
          {/* First Section: Logo (Left) */}
          <div className="flex-shrink-0 mr-14">
            <span className="text-green-600 font-bold text-xl">AXANO Agro</span>
          </div>

          {/* Second Section: Menu Items (Center) */}
          <div className="flex-1 flex justify-center">
            <div className="hidden md:flex space-x-6">
              {menuItems.map((item, index) => (
                <button
                  key={index}
                  onClick={item.onClick}
                  className="text-gray-700 hover:text-green-600 px-3 py-2 font-medium flex items-center"
                >
                  {item.icon && <span className="mr-2">{item.icon}</span>}
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Third Section: Right Side (Extreme Right) */}
          <div className="flex items-center justify-end ml-12 ">
            {isHomePage ? (
              <div className="flex space-x-4">
                <button
                  onClick={() => navigate("/login")}
                  className="px-4 py-2 border border-green-500 text-green-500 rounded-lg hover:bg-green-50 font-medium"
                >
                  Login
                </button>
                <button
                  onClick={() => navigate("/role-selection")}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  Register
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                {/* Notification Icon */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-1 rounded-full text-gray-400 hover:text-gray-500 relative"
                    aria-haspopup="true"
                    aria-expanded={isOpen}
                  >
                    <FaBell className="h-6 w-6" />
                    {/* <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500 animate-ping"></span> */}
                  </button>

                  {isOpen && (
                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                      <div className="flex justify-between items-center p-4 border-b border-gray-200">
                        <h3 className="font-semibold text-gray-800">Notifications</h3>
                        <button
                          onClick={() => setIsOpen(false)}
                          className="text-gray-400 hover:text-gray-500"
                        >
                          <FaTimes className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="p-4">
                        <div className="text-center py-4">
                          <p className="text-gray-500 text-sm">
                            No new notifications
                          </p>
                        </div>
                      </div>
                      <div className="p-2 border-t border-gray-200 text-center">
                        <button className="text-sm text-blue-600 hover:text-blue-700">
                          View all notifications
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* User Info */}
                <div className="flex items-center space-x-2">
                  {loading ? (
                    <div className="animate-pulse flex space-x-2">
                      <div className="h-8 w-8 rounded-full bg-gray-200"></div>
                      <div className="hidden md:block">
                        <div className="h-4 w-20 bg-gray-200 rounded mb-1"></div>
                        <div className="h-3 w-16 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  ) : user ? (
                    <>
                      <div className="flex-shrink-0">
                        {profileImage ? (
                          <img
                            className="h-8 w-8 rounded-full object-cover"
                            src={profileImage}
                            alt="Profile"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                            <BiUser className="h-5 w-5 text-green-600" />
                          </div>
                        )}
                      </div>
                      <div className="hidden md:block">
                        <div className="text-sm font-medium text-gray-700">{fullName}</div>
                        <div className="text-xs text-gray-500 capitalize">
                          {role === "deliveryPartner" ? "Delivery Partner" : role || "User"}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-gray-500">Guest User</div>
                  )}
                </div>

                {/* Logout Button and Error Message */}
                <div className="flex flex-col items-center space-y-2">
                  {error && (
                    <div className="bg-red-100 text-red-700 p-2 rounded text-sm">
                      {error}
                    </div>
                  )}
                  <button
                    onClick={handleLogout}
                    disabled={checking}
                    className={`px-4 py-2 rounded-md text-white font-medium ${
                      checking ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                    } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500`}
                  >
                    {checking ? 'Logging out...' : 'Logout'}
                  </button>
                </div>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-gray-500 hover:text-gray-700 focus:outline-none ml-4"
            >
              {mobileMenuOpen ? (
                <FaTimes className="h-6 w-6" />
              ) : (
                <BiMenu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  item.onClick();
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-green-600 hover:bg-gray-50 flex items-center"
              >
                {item.icon && <span className="mr-2">{item.icon}</span>}
                {item.label}
              </button>
            ))}
          </div>
          {!isHomePage && (
            <div className="pt-4 pb-3 border-t border-gray-200">
              <div className="flex items-center px-5 justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    {profileImage ? (
                      <img
                        className="h-10 w-10 rounded-full"
                        src={profileImage}
                        alt=""
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                        <BiUser className="h-6 w-6 text-green-600" />
                      </div>
                    )}
                  </div>
                  <div className="ml-3">
                    <div className="text-base font-medium text-gray-800">
                      {fullName}
                    </div>
                    <div className="text-sm font-medium text-gray-500 capitalize">
                      {role === "deliveryPartner" ? "Delivery Partner" : role || "User"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;