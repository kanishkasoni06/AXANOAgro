import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './components/ui/button';
import { FaAngleLeft, FaImage } from 'react-icons/fa';
import { useAuth } from './context/authContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase/firebase';
import { useFormik } from 'formik';
import * as Yup from 'yup';

interface KYCImages {
  passport: string;
  aadhar: string;
  aadharHolding: string;
  drivingLicense?: string;
}

const KYCVerificationPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [submitError, setSubmitError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validationSchema = Yup.object({
    passport: Yup.string()
      .url('Invalid URL format for passport photo')
      .required('Passport photo URL is required'),
    aadhar: Yup.string()
      .url('Invalid URL format for Aadhar card')
      .required('Aadhar card URL is required'),
    aadharHolding: Yup.string()
      .url('Invalid URL format for Aadhar holding photo')
      .required('Aadhar holding photo URL is required'),
    drivingLicense: Yup.string().test(
      'driving-license-required',
      'Driving license URL is required for delivery partners',
      function (value) {
        const isDeliveryPartner = user?.role === 'deliveryPartner';
        if (isDeliveryPartner) {
          return Yup.string()
            .url('Invalid URL format for driving license')
            .required()
            .isValidSync(value);
        }
        return true; // Not required for non-deliveryPartner
      }
    ),
  });

  const formik = useFormik({
    initialValues: {
      passport: '',
      aadhar: '',
      aadharHolding: '',
      drivingLicense: '',
    },
    validationSchema,
    onSubmit: async (values: KYCImages) => {
      if (!user || (user.role !== 'farmer' && user.role !== 'deliveryPartner')) {
        setSubmitError('You must be logged in as a farmer or delivery partner.');
        return;
      }

      if (isSubmitting) return;
      setIsSubmitting(true);
      setSubmitError('');

      try {
        // Ensure no empty strings are submitted for required fields
        if (!values.passport || !values.aadhar || !values.aadharHolding) {
          setSubmitError('All required image URLs must be provided.');
          setIsSubmitting(false);
          return;
        }
        if (user.role === 'deliveryPartner' && !values.drivingLicense) {
          setSubmitError('Driving license URL is required for delivery partners.');
          setIsSubmitting(false);
          return;
        }

        // Prepare KYC data with image URLs
        const kycData = {
          passportUrl: values.passport,
          aadharUrl: values.aadhar,
          aadharHoldingUrl: values.aadharHolding,
          ...(user.role === 'deliveryPartner' && { drivingLicenseUrl: values.drivingLicense }),
          kycSubmittedAt: new Date().toISOString(),
          verified: false,
        };

        // Determine Firestore collection based on role
        const collectionName = user.role === 'farmer' ? 'farmer' : 'deliveryPartner';

        // Save to Firestore
        await updateDoc(doc(db, collectionName, user.uid), kycData);

        // Clear form and show success
        formik.resetForm();
        alert('KYC documents submitted successfully! Awaiting verification.');
        navigate('/login');
      } catch (error: any) {
        console.error('Error submitting KYC:', error);
        let errorMessage = 'Failed to submit KYC documents. Please try again.';
        if (error.code === 'permission-denied') {
          errorMessage = 'Unauthorized access. Please check Firestore permissions.';
        } else if (error.code === 'not-found') {
          errorMessage = 'User document not found. Please ensure you are registered.';
        }
        setSubmitError(errorMessage);
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  // Role-based navigation
  const handleNavigate = () => {
    switch (user?.role) {
      case 'farmer':
        navigate('/login');
        break;
      case 'deliveryPartner':
        navigate('/login');
        break;
      case 'buyer':
        navigate('/login');
        break;
      default:
        navigate('/login');
        break;
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
          To ensure a secure and trusted platform, please provide URLs to the following documents. All fields are mandatory, and images must be accessible, in JPEG or PNG format, and hosted securely.
        </p>

        <form onSubmit={formik.handleSubmit} className="space-y-8">
          {/* URL Input Fields Row */}
          <div
            className={`grid grid-cols-1 ${
              user?.role === 'deliveryPartner' ? 'md:grid-cols-2' : 'md:grid-cols-3'
            } gap-6`}
          >
            {/* Passport Photo URL */}
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300">
              <label
                htmlFor="passport"
                className="block text-base font-medium text-gray-800 font-sans mb-2"
              >
                Passport-Size Photo URL (Required)
              </label>
              <div className="relative">
                <FaImage className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  id="passport"
                  name="passport"
                  value={formik.values.passport}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  placeholder="Paste Passport Photo URL"
                  className={`w-full pl-10 pr-4 py-3 border ${
                    formik.touched.passport && formik.errors.passport ? 'border-red-500' : 'border-gray-300'
                  } rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-500 font-sans text-sm`}
                  disabled={isSubmitting}
                  required
                />
              </div>
              {formik.touched.passport && formik.errors.passport && (
                <p className="text-red-600 text-sm mt-2 font-sans">{formik.errors.passport}</p>
              )}
              <p className="text-sm text-gray-600 mt-2 font-sans">
                Provide a URL to a standard passport-size photo.
              </p>
              {formik.values.passport && (
                <div className="mt-4">
                  <img
                    src={formik.values.passport}
                    alt="Passport preview"
                    className="w-[200px] h-[200px] object-cover rounded-md shadow-sm hover:scale-105 transition-transform duration-300 mx-auto"
                    onError={() => formik.setFieldValue('passport', '')}
                  />
                </div>
              )}
            </div>

            {/* Aadhar Card URL */}
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300">
              <label
                htmlFor="aadhar"
                className="block text-base font-medium text-gray-800 font-sans mb-2"
              >
                Aadhar Card URL (Required)
              </label>
              <div className="relative">
                <FaImage className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  id="aadhar"
                  name="aadhar"
                  value={formik.values.aadhar}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  placeholder="Paste Aadhar Card URL"
                  className={`w-full pl-10 pr-4 py-3 border ${
                    formik.touched.aadhar && formik.errors.aadhar ? 'border-red-500' : 'border-gray-300'
                  } rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-500 font-sans text-sm`}
                  disabled={isSubmitting}
                  required
                />
              </div>
              {formik.touched.aadhar && formik.errors.aadhar && (
                <p className="text-red-600 text-sm mt-2 font-sans">{formik.errors.aadhar}</p>
              )}
              <p className="text-sm text-gray-600 mt-2 font-sans">
                Provide a URL to a clear image of your Aadhar card.
              </p>
              {formik.values.aadhar && (
                <div className="mt-4">
                  <img
                    src={formik.values.aadhar}
                    alt="Aadhar preview"
                    className="w-[300px] h-[200px] object-cover rounded-md shadow-sm hover:scale-105 transition-transform duration-300 mx-auto"
                    onError={() => formik.setFieldValue('aadhar', '')}
                  />
                </div>
              )}
            </div>

            {/* Aadhar Holding Photo URL */}
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300">
              <label
                htmlFor="aadharHolding"
                className="block text-base font-medium text-gray-800 font-sans mb-2"
              >
                Photo Holding Aadhar Card URL (Required)
              </label>
              <div className="relative">
                <FaImage className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  id="aadharHolding"
                  name="aadharHolding"
                  value={formik.values.aadharHolding}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  placeholder="Paste Aadhar Holding Photo URL"
                  className={`w-full pl-10 pr-4 py-3 border ${
                    formik.touched.aadharHolding && formik.errors.aadharHolding ? 'border-red-500' : 'border-gray-300'
                  } rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-500 font-sans text-sm`}
                  disabled={isSubmitting}
                  required
                />
              </div>
              {formik.touched.aadharHolding && formik.errors.aadharHolding && (
                <p className="text-red-600 text-sm mt-2 font-sans">{formik.errors.aadharHolding}</p>
              )}
              <p className="text-sm text-gray-600 mt-2 font-sans">
                Provide a URL to a photo of yourself holding your Aadhar card.
              </p>
              {formik.values.aadharHolding && (
                <div className="mt-4">
                  <img
                    src={formik.values.aadharHolding}
                    alt="Aadhar holding preview"
                    className="w-[300px] h-[200px] object-cover rounded-md shadow-sm hover:scale-105 transition-transform duration-300 mx-auto"
                    onError={() => formik.setFieldValue('aadharHolding', '')}
                  />
                </div>
              )}
            </div>

            {/* Driving License URL (Delivery Partner Only) */}
            {user?.role === 'deliveryPartner' && (
              <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300">
                <label
                  htmlFor="drivingLicense"
                  className="block text-base font-medium text-gray-800 font-sans mb-2"
                >
                  Driving License URL (Required)
                </label>
                <div className="relative">
                  <FaImage className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    id="drivingLicense"
                    name="drivingLicense"
                    value={formik.values.drivingLicense}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    placeholder="Paste Driving License URL"
                    className={`w-full pl-10 pr-4 py-3 border ${
                      formik.touched.drivingLicense && formik.errors.drivingLicense
                        ? 'border-red-500'
                        : 'border-gray-300'
                    } rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-500 font-sans text-sm`}
                    disabled={isSubmitting}
                    required
                  />
                </div>
                {formik.touched.drivingLicense && formik.errors.drivingLicense && (
                  <p className="text-red-600 text-sm mt-2 font-sans">{formik.errors.drivingLicense}</p>
                )}
                <p className="text-sm text-gray-600 mt-2 font-sans">
                  Provide a URL to a clear image of your driving license.
                </p>
                {formik.values.drivingLicense && (
                  <div className="mt-4">
                    <img
                      src={formik.values.drivingLicense}
                      alt="Driving license preview"
                      className="w-[300px] h-[200px] object-cover rounded-md shadow-sm hover:scale-105 transition-transform duration-300 mx-auto"
                      onError={() => formik.setFieldValue('drivingLicense', '')}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="text-center">
            {submitError && <p className="text-red-600 text-sm mb-4 font-sans">{submitError}</p>}
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

export default KYCVerificationPage;