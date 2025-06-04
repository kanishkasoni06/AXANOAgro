import { useNavigate } from 'react-router-dom';
import { FaUser, FaEnvelope, FaMapMarkerAlt, FaStore, FaLock, FaImage } from 'react-icons/fa';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { auth } from '../../firebase/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';

const FarmerProfilePage = () => {
  const navigate = useNavigate();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const validationSchema = Yup.object({
    fullName: Yup.string()
      .min(3, 'Name must be at least 3 characters')
      .required('Name is required'),
    email: Yup.string()
      .email('Invalid email address')
      .required('Email is required'),
    location: Yup.string()
      .min(3, 'Location must be at least 3 characters')
      .required('Location is required'),
    businessName: Yup.string()
      .required('Business/Farm name is required'),
    password: Yup.string()
      .min(6, 'Password must be at least 6 characters')
      .required('Password is required'),
    profileImage: Yup.string()
      .url('Invalid URL format')
      .nullable()
  });

  const formik = useFormik({
    initialValues: {
      fullName: '',
      email: '',
      location: '',
      businessName: '',
      password: '',
      profileImage: ''
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        setAuthError(null);
        
        // 1. Create user with email/password
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          values.email,
          values.password
        );

        // 2. Update user profile with display name
        await updateProfile(userCredential.user, {
          displayName: values.fullName
        });

        // 3. Save additional user data to Firestore
        await setDoc(doc(db, 'farmer', userCredential.user.uid), {
          fullName: values.fullName,
          email: values.email,
          location: values.location,
          businessName: values.businessName,
          role: 'farmer',
          profileImage: values.profileImage || null,
          createdAt: new Date()
        });

        // 4. Redirect to farmer dashboard
        navigate('/KYCVerification', { 
          state: { 
            fullName: values.fullName,
            email: values.email,
            location: values.location,
            businessName: values.businessName,
            role: 'farmer',
            profileImage: values.profileImage || null, 
          } 
        });
      } catch (error) {
        console.error('Authentication error:', error);
        setAuthError('Failed to create account. Please try again.');
      }
    }
  });

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-green-0 to-green-50">
      <div className="max-w-md h-[800px] w-full bg-white rounded-xl shadow-lg p-8 text-center space-y-12">
        <h1 className="text-2xl font-bold text-center mb-6">Complete your profile</h1>
        {/* Form Fields */}
        <form onSubmit={formik.handleSubmit} className="space-y-4">
          <div className="flex flex-col items-center ">
          <div className="relative w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden mb-3">
            {profileImage ? (
              <img 
                src={profileImage} 
                alt="Profile" 
                className="w-full h-full object-cover"
                onError={() => setProfileImage(null)} // Reset if image fails to load
              />
            ) : (
              <FaImage className="w-8 h-8 text-gray-500" />
            )}
          </div>
          <div className="relative w-full">
            <FaImage className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              name="profileImage"
              value={formik.values.profileImage}
              onChange={(e) => {
                formik.handleChange(e);
                setProfileImage(e.target.value);
              }}
              onBlur={formik.handleBlur}
              placeholder="Profile Image URL"
              className={`w-full pl-10 pr-4 py-3 border ${formik.touched.profileImage && formik.errors.profileImage ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-500`}
            />
          </div>
          {formik.touched.profileImage && formik.errors.profileImage && (
            <p className="text-red-500 text-sm text-justify">{formik.errors.profileImage}</p>
          )}
        </div>

        {/* Auth Error Message */}
        {authError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {authError}
          </div>
        )}
          <div className="space-y-1">
            <div className="relative">
              <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                name="fullName"
                value={formik.values.fullName}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                placeholder="Full Name"
                className={`w-full pl-10 pr-4 py-3 border ${formik.touched.fullName && formik.errors.fullName ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-500`}
              />
            </div>
            {formik.touched.fullName && formik.errors.fullName && (
              <p className="text-red-500 text-sm text-justify">{formik.errors.fullName}</p>
            )}
          </div>

          <div className="space-y-1">
            <div className="relative">
              <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                name="email"
                value={formik.values.email}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                placeholder="Email Address"
                className={`w-full pl-10 pr-4 py-3 border ${formik.touched.email && formik.errors.email ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-500`}
              />
            </div>
            {formik.touched.email && formik.errors.email && (
              <p className="text-red-500 text-sm text-justify">{formik.errors.email}</p>
            )}
          </div>

          <div className="space-y-1">
            <div className="relative">
              <FaMapMarkerAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                name="location"
                value={formik.values.location}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                placeholder="Location"
                className={`w-full pl-10 pr-4 py-3 border ${formik.touched.location && formik.errors.location ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-500`}
              />
            </div>
            {formik.touched.location && formik.errors.location && (
              <p className="text-red-500 text-sm text-justify">{formik.errors.location}</p>
            )}
          </div>

          <div className="space-y-1">
            <div className="relative">
              <FaStore className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                name="businessName"
                value={formik.values.businessName}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                placeholder="Business/Farm Name"
                className={`w-full pl-10 pr-4 py-3 border ${formik.touched.businessName && formik.errors.businessName ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-500`}
              />
            </div>
            {formik.touched.businessName && formik.errors.businessName && (
              <p className="text-red-500 text-sm text-justify">{formik.errors.businessName}</p>
            )}
          </div>

          <div className="space-y-1">
            <div className="relative">
              <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                name="password"
                value={formik.values.password}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                placeholder="Password"
                className={`w-full pl-10 pr-4 py-3 border ${formik.touched.password && formik.errors.password ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-500`}
              />
            </div>
            {formik.touched.password && formik.errors.password && (
              <p className="text-red-500 text-sm text-justify">{formik.errors.password}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700 text-white py-7 rounded-xl shadow-md transition-all duration-300 transform hover:scale-[1.02] text-lg mt-auto mb-auto h-16"
          >
            Continue
          </Button>
        </form>
      </div>
    </div>
  );
};

export default FarmerProfilePage;