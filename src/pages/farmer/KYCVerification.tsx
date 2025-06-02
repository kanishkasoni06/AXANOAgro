import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { FaAngleLeft } from 'react-icons/fa';
import { useAuth } from '../../context/authContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';

interface KYCImages {
  passport: File | null;
  aadhar: File | null;
  aadharHolding: File | null;
}

const FarmerKYCVerificationPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [images, setImages] = useState<KYCImages>({
    passport: null,
    aadhar: null,
    aadharHolding: null,
  });
  const [previews, setPreviews] = useState({
    passport: '',
    aadhar: '',
    aadharHolding: '',
  });
  const [errors, setErrors] = useState({
    passport: '',
    aadhar: '',
    aadharHolding: '',
    submit: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Clean up preview URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(previews).forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [previews]);

  // Role-based navigation
  const handleNavigate = () => {
    switch (user?.role) {
      case 'farmer':
        navigate('/login');
        break;
      case 'buyer':
        navigate('/buyer/Dashboard');
        break;
      case 'deliveryPartner':
        navigate('/delivery/Dashboard');
        break;
      default:
        navigate('/');
        break;
    }
  };

  // Convert file to Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to convert file to Base64'));
      reader.readAsDataURL(file);
    });
  };

  // Handle image selection and validation
  const handleImageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, key: keyof KYCImages) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file type (JPEG/PNG)
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        setErrors((prev) => ({
          ...prev,
          [key]: 'Please upload a JPEG or PNG image.',
        }));
        return;
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setErrors((prev) => ({
          ...prev,
          [key]: 'Image size must be less than 2MB.',
        }));
        return;
      }

      // Revoke previous preview URL
      if (previews[key]) {
        URL.revokeObjectURL(previews[key]);
      }

      // Update images and previews
      setImages((prev) => ({ ...prev, [key]: file }));
      setPreviews((prev) => ({ ...prev, [key]: URL.createObjectURL(file) }));
      setErrors((prev) => ({ ...prev, [key]: '' }));
    },
    [previews]
  );

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || user.role !== 'farmer') {
      setErrors((prev) => ({ ...prev, submit: 'You must be logged in as a farmer.' }));
      return;
    }

    // Validate all images are uploaded
    if (!images.passport || !images.aadhar || !images.aadharHolding) {
      setErrors((prev) => ({
        ...prev,
        submit: 'Please upload all required images.',
      }));
      return;
    }

    if (isSubmitting) return; // Prevent multiple submissions
    setIsSubmitting(true);
    setErrors((prev) => ({ ...prev, submit: '' }));

    try {
      // Convert images to Base64
      const base64Promises = Object.entries(images).map(async ([key, file]) => {
        if (!file) return null;
        const base64 = await fileToBase64(file);
        return { key, base64 };
      });

      const base64Results = await Promise.all(base64Promises);

      // Prepare farmer data
      const farmerData = {
        passportBase64: base64Results.find((r) => r?.key === 'passport')?.base64 || '',
        aadharBase64: base64Results.find((r) => r?.key === 'aadhar')?.base64 || '',
        aadharHoldingBase64: base64Results.find((r) => r?.key === 'aadharHolding')?.base64 || '',
        kycSubmittedAt: new Date().toISOString(),
        verified: false,
      };

      // Save to Firestore
      await updateDoc(doc(db, 'farmer', user.uid), farmerData);

      // Clear form and show success
      setImages({ passport: null, aadhar: null, aadharHolding: null });
      setPreviews((prev) => {
        Object.values(prev).forEach((url) => {
          if (url) URL.revokeObjectURL(url);
        });
        return { passport: '', aadhar: '', aadharHolding: '' };
      });
      alert('KYC documents submitted successfully! Awaiting verification.');
      navigate('/login'); // Stay on KYC page until verified
    } catch (error: any) {
      console.error('Error submitting KYC:', error);
      let errorMessage = 'Failed to submit KYC documents. Please try again.';
      if (error.message.includes('Base64')) {
        errorMessage = 'Error converting images. Please try smaller images.';
      } else if (error.code === 'permission-denied') {
        errorMessage = 'Unauthorized access. Please check Firestore permissions.';
      }
      setErrors((prev) => ({ ...prev, submit: errorMessage }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full bg-green-100 text-black min-h-screen py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in">
        {/* Navigation */}
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

        {/* Content */}
        <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6 text-center font-serif">
          KYC Verification
        </h1>
        <p className="text-base md:text-lg text-gray-700 mb-10 text-center font-sans max-w-3xl mx-auto">
          To ensure a secure and trusted platform, please upload the following documents. Ensure all images are clear, in JPEG or PNG format, and under 2MB.
        </p>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Upload Fields Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Passport Photo */}
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300">
              <label
                htmlFor="passport"
                className="block text-base font-medium text-gray-800 font-sans mb-2"
              >
                Passport-Size Photo
              </label>
              <input
                type="file"
                id="passport"
                accept="image/jpeg,image/png"
                onChange={(e) => handleImageChange(e, 'passport')}
                className="block w-full text-sm text-gray-600 font-sans border border-gray-300 rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-500 p-2"
                disabled={isSubmitting}
              />
              {errors.passport && (
                <p className="text-red-600 text-sm mt-2 font-sans">{errors.passport}</p>
              )}
              <p className="text-sm text-gray-600 mt-2 font-sans">
                Upload a standard passport-size photo.
              </p>
              {previews.passport && (
                <div className="mt-4">
                  <img
                    src={previews.passport}
                    alt="Passport preview"
                    className="w-[200px] h-[200px] object-cover rounded-md shadow-sm hover:scale-105 transition-transform duration-300 mx-auto"
                  />
                </div>
              )}
            </div>

            {/* Aadhar Card */}
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300">
              <label
                htmlFor="aadhar"
                className="block text-base font-medium text-gray-800 font-sans mb-2"
              >
                Aadhar Card
              </label>
              <input
                type="file"
                id="aadhar"
                accept="image/jpeg,image/png"
                onChange={(e) => handleImageChange(e, 'aadhar')}
                className="block w-full text-sm text-gray-600 font-sans border border-gray-300 rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-500 p-2"
                disabled={isSubmitting}
              />
              {errors.aadhar && <p className="text-red-600 text-sm mt-2 font-sans">{errors.aadhar}</p>}
              <p className="text-sm text-gray-600 mt-2 font-sans">
                Upload a clear image of your Aadhar card.
              </p>
              {previews.aadhar && (
                <div className="mt-4">
                  <img
                    src={previews.aadhar}
                    alt="Aadhar preview"
                    className="w-[300px] h-[200px] object-cover rounded-md shadow-sm hover:scale-105 transition-transform duration-300 mx-auto"
                  />
                </div>
              )}
            </div>

            {/* Aadhar Holding Photo */}
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300">
              <label
                htmlFor="aadharHolding"
                className="block text-base font-medium text-gray-800 font-sans mb-2"
              >
                Photo Holding Aadhar Card
              </label>
              <input
                type="file"
                id="aadharHolding"
                accept="image/jpeg,image/png"
                onChange={(e) => handleImageChange(e, 'aadharHolding')}
                className="block w-full text-sm text-gray-600 font-sans border border-gray-300 rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-500 p-2"
                disabled={isSubmitting}
              />
              {errors.aadharHolding && (
                <p className="text-red-600 text-sm mt-2 font-sans">{errors.aadharHolding}</p>
              )}
              <p className="text-sm text-gray-600 mt-2 font-sans">
                Upload a photo of yourself holding your Aadhar card.
              </p>
              {previews.aadharHolding && (
                <div className="mt-4">
                  <img
                    src={previews.aadharHolding}
                    alt="Aadhar holding preview"
                    className="w-[300px] h-[200px] object-cover rounded-md shadow-sm hover:scale-105 transition-transform duration-300 mx-auto"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="text-center">
            {errors.submit && <p className="text-red-600 text-sm mb-4 font-sans">{errors.submit}</p>}
            <Button
              type="submit"
              className={`bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-8 rounded-lg text-base font-sans ${
                isSubmitting ? 'animate-pulse' : ''
              }`}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit KYC Documents'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FarmerKYCVerificationPage;