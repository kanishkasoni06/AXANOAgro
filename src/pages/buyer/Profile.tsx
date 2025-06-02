import { useNavigate } from 'react-router-dom';
import { UploadIcon } from 'lucide-react';
import { useFormik } from 'formik';
import { FaUser, FaHome, FaVenusMars, FaMapPin, FaEnvelope, FaLock } from 'react-icons/fa';
import * as Yup from 'yup';
import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { auth } from '../../firebase/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';

const BuyerProfilePage = () => {
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
    address: Yup.string()
      .min(10, 'Address must be at least 10 characters')
      .required('Address is required'),
    gender: Yup.string()
      .required('Gender is required'),
    pinCode: Yup.string()
      .matches(/^[1-9][0-9]{5}$/, 'Invalid PIN code (6 digits)')
      .required('PIN code is required'),
    password: Yup.string()
      .min(6, 'Password must be at least 6 characters')
      .required('Password is required')
  });

  const formik = useFormik({
    initialValues: {
      fullName: '',
      email: '',
      address: '',
      gender: '',
      pinCode: '',
      password: ''
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
          displayName: values.fullName,
          photoURL: profileImage || undefined
        });

        // 3. Save additional user data to Firestore in buyer collection
        await setDoc(doc(db, 'buyer', userCredential.user.uid), {
          fullName: values.fullName,
          email: values.email,
          address: values.address,
          gender: values.gender,
          pinCode: values.pinCode,
          role: 'buyer',
          profileImage: profileImage || null,
          createdAt: new Date(),
          status: 'active' // can be 'active', 'inactive', etc.
        });

        // 4. Redirect to phone verification
        navigate('/buyer/homePage', { 
          state: { 
            ...values,
            profileImage 
          } 
        });
      } catch (error) {
        console.error('Authentication error:', error);
        setAuthError('Failed to create account. Please try again.');
      }
    }
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setProfileImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-green-0 to-green-50">
      <div className="max-w-md h-[800px] w-full bg-white rounded-xl shadow-lg p-8 text-center space-y-12">
        <h1 className="text-2xl font-bold text-center mb-6">Complete your profile</h1>
        
        {/* Image Upload Section */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden mb-3">
            {profileImage ? (
              <img 
                src={profileImage} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            ) : (
              <UploadIcon className="w-8 h-8 text-gray-500" />
            )}
          </div>
          <label className="cursor-pointer">
            <span className="text-sm font-medium text-green-600 hover:text-green-700">
              {profileImage ? 'Change Image' : 'Upload Profile Image'}
            </span>
            <input 
              type="file" 
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Auth Error Message */}
        {authError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {authError}
          </div>
        )}

        {/* Form Fields */}
        <form onSubmit={formik.handleSubmit} className="space-y-4">
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
              <FaHome className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                name="address"
                value={formik.values.address}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                placeholder="Full Address"
                className={`w-full pl-10 pr-4 py-3 border ${formik.touched.address && formik.errors.address ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-500`}
              />
            </div>
            {formik.touched.address && formik.errors.address && (
              <p className="text-red-500 text-sm text-justify">{formik.errors.address}</p>
            )}
          </div>

          <div className="space-y-1">
            <div className="relative">
              <FaVenusMars className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <select
                name="gender"
                value={formik.values.gender}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className={`w-full pl-10 pr-4 py-3 appearance-none border ${formik.touched.gender && formik.errors.gender ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-500`}
              >
                <option value="" disabled>Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </select>
            </div>
            {formik.touched.gender && formik.errors.gender && (
              <p className="text-red-500 text-sm text-justify">{formik.errors.gender}</p>
            )}
          </div>

          <div className="space-y-1">
            <div className="relative">
              <FaMapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                name="pinCode"
                value={formik.values.pinCode}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                placeholder="PIN Code (6 digits)"
                className={`w-full pl-10 pr-4 py-3 border ${formik.touched.pinCode && formik.errors.pinCode ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-500`}
              />
            </div>
            {formik.touched.pinCode && formik.errors.pinCode && (
              <p className="text-red-500 text-sm text-justify">{formik.errors.pinCode}</p>
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
            disabled={formik.isSubmitting}
          >
            {formik.isSubmitting ? 'Creating Account...' : 'Continue'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default BuyerProfilePage;