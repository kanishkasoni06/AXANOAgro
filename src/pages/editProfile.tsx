import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { FaAngleLeft } from 'react-icons/fa';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '../context/authContext';
import { db } from '../firebase/firebase';
import { Button } from '../components/ui/button';


interface FarmerProfile {
  businessName?: string;
  email: string;
  fullName?: string;
  location?: string;
  profileImage?: string | null;
  aadharBase64?: string;
  passportBase64?: string;
  aadharHoldingBase64?: string;
  role: string;
  verified?: boolean;
  userId: string;
}

interface DeliveryPartnerProfile {
  address?: string;
  email: string;
  fullName?: string;
  pinCode?: string;
  profileImage?: string | null;
  status?: string;
  vehicleNumber?: string;
  role: string;
  userId: string;
}

interface BuyerProfile {
  address?: string;
  email: string;
  fullName?: string;
  gender?: string;
  pinCode?: string;
  profileImage?: string | null;
  role: string;
  userId: string;
}

type ProfileData = FarmerProfile | DeliveryPartnerProfile | BuyerProfile;

const EditProfilePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [formData, setFormData] = useState({
    businessName: '',
    email: '',
    fullName: '',
    location: '',
    address: '',
    pinCode: '',
    gender: '',
    profileImage: null as File | null,
  });
  const [preview, setPreview] = useState('');
  const [errors, setErrors] = useState({
    businessName: '',
    email: '',
    fullName: '',
    location: '',
    address: '',
    pinCode: '',
    gender: '',
    profileImage: '',
    submit: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Determine collection based on role
  const getCollectionName = (role: string) => {
    switch (role) {
      case 'farmer':
        return 'farmer';
      case 'buyer':
        return 'buyer';
      case 'deliveryPartner':
        return 'deliveryPartner';
      default:
        return '';
    }
  };

  // Role-based navigation
  const handleNavigate = () => {
    switch (user?.role) {
      case 'farmer':
        navigate('/farmer/settings');
        break;
      case 'buyer':
        navigate('/buyer/settings');
        break;
      case 'deliveryPartner':
        navigate('/delivery/settings');
        break;
      default:
        navigate('/');
        console.warn('User role is undefined or invalid:', user?.role);
        break;
    }
  };

  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user || !user.role) {
        setErrors((prev) => ({ ...prev, submit: 'You must be logged in.' }));
        setIsLoading(false);
        return;
      }

      try {
        const collectionName = getCollectionName(user.role);
        if (!collectionName) {
          throw new Error('Invalid role');
        }

        const docRef = doc(db, collectionName, user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as ProfileData;
          setProfile(data);
          setFormData({
            businessName: (data as FarmerProfile).businessName || '',
            email: data.email || user.email || '',
            fullName: data.fullName || '',
            location: (data as FarmerProfile).location || '',
            address: (data as DeliveryPartnerProfile | BuyerProfile).address || '',
            pinCode: (data as DeliveryPartnerProfile | BuyerProfile).pinCode || '',
            gender: (data as BuyerProfile).gender || '',
            profileImage: null,
          });
          setPreview(data.profileImage || '');
        } else {
          const defaultData: ProfileData = {
            role: user.role,
            userId: user.uid,
            email: user.email || '',
          };
          setProfile(defaultData);
          setFormData({
            businessName: '',
            email: user.email || '',
            fullName: '',
            location: '',
            address: '',
            pinCode: '',
            gender: '',
            profileImage: null,
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        setErrors((prev) => ({ ...prev, submit: 'Failed to load profile. Please try again.' }));
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  // Convert file to Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to convert file to Base64'));
      reader.readAsDataURL(file);
    });
  };

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      setErrors((prev) => ({
        ...prev,
        email: emailRegex.test(value) ? '' : 'Please enter a valid email address.',
      }));
    } else if (name === 'pinCode') {
      const pinCodeRegex = /^[0-9]{5,6}$/;
      setErrors((prev) => ({
        ...prev,
        pinCode: pinCodeRegex.test(value) || !value ? '' : 'Pin code must be 5-6 digits.',
      }));
    } else {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // Handle profile image change
  const handleImageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        setErrors((prev) => ({ ...prev, profileImage: 'Please upload a JPEG or PNG image.' }));
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, profileImage: 'Image size must be less than 2MB.' }));
        return;
      }

      setFormData((prev) => ({ ...prev, profileImage: file }));
      if (preview) URL.revokeObjectURL(preview);
      setPreview(URL.createObjectURL(file));
      setErrors((prev) => ({ ...prev, profileImage: '' }));
    },
    [preview]
  );

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.role) {
      setErrors((prev) => ({ ...prev, submit: 'You must be logged in.' }));
      return;
    }

    if (Object.values(errors).some((error) => error)) {
      setErrors((prev) => ({ ...prev, submit: 'Please fix the errors before submitting.' }));
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrors((prev) => ({ ...prev, submit: '' }));

    try {
      const collectionName = getCollectionName(user.role);
      if (!collectionName) {
        throw new Error('Invalid role');
      }

      // Prepare updated data
      const updatedData: Partial<ProfileData> = {
        email: formData.email,
        fullName: formData.fullName,
      };

      if (user.role === 'farmer') {
        (updatedData as FarmerProfile).businessName = formData.businessName;
        (updatedData as FarmerProfile).location = formData.location;
      } else if (user.role === 'deliveryPartner') {
        (updatedData as DeliveryPartnerProfile).address = formData.address;
        (updatedData as DeliveryPartnerProfile).pinCode = formData.pinCode;
      } else if (user.role === 'buyer') {
        (updatedData as BuyerProfile).address = formData.address;
        (updatedData as BuyerProfile).pinCode = formData.pinCode;
        (updatedData as BuyerProfile).gender = formData.gender;
      }

      if (formData.profileImage) {
        updatedData.profileImage = await fileToBase64(formData.profileImage);
      }

      // Save to Firestore
      await setDoc(doc(db, collectionName, user.uid), updatedData, { merge: true });

      setProfile((prev) => (prev ? { ...prev, ...updatedData } : null));
      setFormData((prev) => ({ ...prev, profileImage: null }));
      if (preview) URL.revokeObjectURL(preview);
      setPreview(updatedData.profileImage || profile?.profileImage || '');
      alert('Profile updated successfully!');
      handleNavigate();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      let errorMessage = 'Failed to update profile. Please try again.';
      if (error.message.includes('Base64')) {
        errorMessage = 'Error processing profile image. Please try a smaller image.';
      } else if (error.code === 'permission-denied') {
        errorMessage = 'Unauthorized access. Please check Firestore permissions.';
      }
      setErrors((prev) => ({ ...prev, submit: errorMessage }));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Clean up preview URL on unmount
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  if (isLoading) {
    return <div className="text-center py-12 text-gray-800 font-sans">Loading...</div>;
  }

  if (!profile) {
    return <div className="text-center py-12 text-red-600 font-sans">Error loading profile.</div>;
  }

  return (
    <div className="w-full bg-gradient-to-b from-green-0 to-green-100 text-black min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in">
        <div className="flex items-center mb-8">
          <Button
            variant="ghost"
            onClick={handleNavigate}
            className="flex items-center text-gray-600 hover:text-gray-900 font-sans"
            disabled={isSubmitting}
          >
            <FaAngleLeft className="h-5 w-5 mr-2" />
          </Button>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6  font-serif">
          Edit Profile
        </h1>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300">
            <div className="mb-6">
              <label
                htmlFor="profileImage"
                className="block text-base font-medium text-gray-800 font-sans mb-2"
              >
                Profile Image
              </label>
              <input
                type="file"
                id="profileImage"
                accept="image/jpeg,image/png"
                onChange={handleImageChange}
                className="block w-full text-sm text-gray-600 font-sans border border-gray-300 rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-500 p-2"
                disabled={isSubmitting}
              />
              {errors.profileImage && (
                <p className="text-red-600 text-sm mt-2 font-sans">{errors.profileImage}</p>
              )}
              <p className="text-sm text-gray-600 mt-2 font-sans">
                Upload a JPEG or PNG image (max 2MB).
              </p>
              {(preview || profile.profileImage) && (
                <div className="mt-4">
                  <img
                    src={preview || profile.profileImage || ''}
                    alt="Profile preview"
                    className="w-[150px] h-[150px] object-cover rounded-full shadow-sm hover:scale-105 transition-transform duration-300 mx-auto"
                  />
                </div>
              )}
            </div>

            {profile.role === 'farmer' && (
              <>
                <div className="mb-6">
                  <label
                    htmlFor="businessName"
                    className="block text-base font-medium text-gray-800 font-sans mb-2"
                  >
                    Business Name
                  </label>
                  <input
                    type="text"
                    id="businessName"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleInputChange}
                    className="block w-full text-sm text-gray-600 font-sans border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="mb-6">
                  <label
                    htmlFor="location"
                    className="block text-base font-medium text-gray-800 font-sans mb-2"
                  >
                    Location
                  </label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    className="block w-full text-sm text-gray-600 font-sans border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    disabled={isSubmitting}
                  />
                </div>
              </>
            )}

            <div className="mb-6">
              <label
                htmlFor="fullName"
                className="block text-base font-medium text-gray-800 font-sans mb-2"
              >
                Full Name
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                className="block w-full text-sm text-gray-600 font-sans border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                disabled={isSubmitting}
              />
            </div>

            <div className="mb-6">
              <label
                htmlFor="email"
                className="block text-base font-medium text-gray-800 font-sans mb-2"
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="block w-full text-sm text-gray-600 font-sans border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                disabled={isSubmitting}
                required
              />
              {errors.email && (
                <p className="text-red-600 text-sm mt-2 font-sans">{errors.email}</p>
              )}
            </div>

            {(profile.role === 'deliveryPartner' || profile.role === 'buyer') && (
              <>
                <div className="mb-6">
                  <label
                    htmlFor="address"
                    className="block text-base font-medium text-gray-800 font-sans mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="block w-full text-sm text-gray-600 font-sans border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="mb-6">
                  <label
                    htmlFor="pinCode"
                    className="block text-base font-medium text-gray-800 font-sans mb-2"
                  >
                    Pin Code
                  </label>
                  <input
                    type="text"
                    id="pinCode"
                    name="pinCode"
                    value={formData.pinCode}
                    onChange={handleInputChange}
                    className="block w-full text-sm text-gray-600 font-sans border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    disabled={isSubmitting}
                  />
                  {errors.pinCode && (
                    <p className="text-red-600 text-sm mt-2 font-sans">{errors.pinCode}</p>
                  )}
                </div>
              </>
            )}

            {profile.role === 'buyer' && (
              <div className="mb-6">
                <label
                  htmlFor="gender"
                  className="block text-base font-medium text-gray-800 font-sans mb-2"
                >
                  Gender
                </label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="block w-full text-sm text-gray-600 font-sans border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  disabled={isSubmitting}
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            )}

            {profile.role === 'deliveryPartner' && (
              <>
                <div className="mb-6">
                  <label
                    htmlFor="status"
                    className="block text-base font-medium text-gray-800 font-sans mb-2"
                  >
                    Status
                  </label>
                  <input
                    type="text"
                    id="status"
                    value={(profile as DeliveryPartnerProfile).status || ''}
                    className="block w-full text-sm text-gray-600 font-sans border border-gray-300 rounded-lg p-2 bg-gray-100"
                    disabled
                  />
                  <p className="text-sm text-gray-600 mt-2 font-sans">
                    Status is managed by administrators.
                  </p>
                </div>

                <div className="mb-6">
                  <label
                    htmlFor="vehicleNumber"
                    className="block text-base font-medium text-gray-800 font-sans mb-2"
                  >
                    Vehicle Number
                  </label>
                  <input
                    type="text"
                    id="vehicleNumber"
                    value={(profile as DeliveryPartnerProfile).vehicleNumber || ''}
                    className="block w-full text-sm text-gray-600 font-sans border border-gray-300 rounded-lg p-2 bg-gray-100"
                    disabled
                  />
                </div>
              </>
            )}

            {profile.role === 'farmer' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {(profile as FarmerProfile).aadharBase64 && (
                  <div className="mb-6">
                    <label
                      className="block text-base font-medium text-gray-800 font-sans mb-2"
                    >
                      Aadhar Card
                    </label>
                    <img
                      src={(profile as FarmerProfile).aadharBase64}
                      alt="Aadhar card"
                      className="w-[300px] h-[200px] object-cover rounded-md shadow-sm mx-auto"
                    />
                    
                  </div>
                )}

                {(profile as FarmerProfile).passportBase64 && (
                  <div className="mb-6">
                    <label
                      className="block text-base font-medium text-gray-800 font-sans mb-2"
                    >
                      Passport Photo
                    </label>
                    <img
                      src={(profile as FarmerProfile).passportBase64}
                      alt="Passport photo"
                      className="w-[200px] h-[200px] object-cover rounded-md shadow-sm mx-auto"
                    />
                    
                  </div>
                )}

                {(profile as FarmerProfile).aadharHoldingBase64 && (
                  <div className="mb-6">
                    <label
                      className="block text-base font-medium text-gray-800 font-sans mb-2"
                    >
                      Photo Holding Aadhar
                    </label>
                    <img
                      src={(profile as FarmerProfile).aadharHoldingBase64}
                      alt="Aadhar holding"
                      className="w-[300px] h-[200px] object-cover rounded-md shadow-sm mx-auto"
                    />
                    
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="text-center">
            {errors.submit && <p className="text-red-600 text-sm mb-4 font-sans">{errors.submit}</p>}
            <Button
              type="submit"
              className={`bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-8 rounded-lg text-base font-sans ${
                isSubmitting ? 'animate-pulse' : ''
              }`}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Profile'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfilePage;