import { FaTimes, FaTruck, FaCheckCircle, FaMapMarkerAlt, FaBox } from 'react-icons/fa';

interface TrackingDetails {
  onMyWayToFarmer?: boolean;
  reachedFarmer?: boolean;
  pickedUpOrder?: boolean;
  onMyWayToBuyer?: boolean;
  reachedBuyer?: boolean;
  deliveredOrder?: boolean;
}

interface TrackOrderModalProps {
  order: {
    id: string;
    name: string;
    trackingDetails?: TrackingDetails | Array<{
      amount: number;
      deliveryPartnerId: string;
      lockedAt: any;
      acceptedForDelivery?: boolean;
      onMyWayToFarmer?: boolean;
      reachedFarmer?: boolean;
      pickedUpOrder?: boolean;
      onMyWayToBuyer?: boolean;
      reachedBuyer?: boolean;
      deliveredOrder?: boolean;
    }>;
  };
  onClose: () => void;
}

const TrackOrderModal = ({ order, onClose }: TrackOrderModalProps) => {
  // Determine tracking details based on the type of order.trackingDetails
  const trackingDetails = Array.isArray(order.trackingDetails)
    ? order.trackingDetails.find(detail => detail.acceptedForDelivery) || {}
    : order.trackingDetails || {};

  const trackingSteps = [
    {
      label: 'On the way to farmer',
      status: trackingDetails.onMyWayToFarmer || false,
      icon: <FaTruck className="text-lg" />,
    },
    {
      label: 'Reached the farmer',
      status: trackingDetails.reachedFarmer || false,
      icon: <FaMapMarkerAlt className="text-lg" />,
    },
    {
      label: 'Picked up the order',
      status: trackingDetails.pickedUpOrder || false,
      icon: <FaBox className="text-lg" />,
    },
    {
      label: 'On the way to buyer',
      status: trackingDetails.onMyWayToBuyer || false,
      icon: <FaTruck className="text-lg" />,
    },
    {
      label: 'Reached the buyer',
      status: trackingDetails.reachedBuyer || false,
      icon: <FaMapMarkerAlt className="text-lg" />,
    },
    {
      label: 'Delivered the order',
      status: trackingDetails.deliveredOrder || false,
      icon: <FaCheckCircle className="text-lg" />,
    },
  ];

  // Determine the current step (first incomplete step)
  const currentStepIndex = trackingSteps.findIndex(step => !step.status);
  const isCompleted = currentStepIndex === -1; // All steps completed

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-green-0 to-green-100 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-lg w-full max-h-[80vh] overflow-y-auto relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800 font-serif">
            Track Order: {order.name || 'Order'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800"
          >
            <FaTimes className="w-6 h-6" />
          </button>
        </div>

        {/* Timeline */}
        <div className="relative">
          {trackingSteps.map((step, index) => {
            const isStepCompleted = step.status;
            const isCurrentStep = !isStepCompleted && index === currentStepIndex;
            const isPending = !isStepCompleted && index > currentStepIndex;

            return (
              <div key={step.label} className="flex items-start mb-6 last:mb-0">
                {/* Timeline Dot and Line */}
                <div className="flex flex-col items-center mr-4">
                  <div
                    className={`w-8 h-8 flex items-center justify-center rounded-full ${
                      isStepCompleted || isCurrentStep
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-300 text-gray-600'
                    } ${isCurrentStep ? 'animate-pulse' : ''}`}
                  >
                    {step.icon}
                  </div>
                  {index < trackingSteps.length - 1 && (
                    <div
                      className={`w-1 flex-1 mt-1 ${
                        isStepCompleted || isCurrentStep ? 'bg-green-600' : 'bg-gray-300'
                      }`}
                      style={{ height: '40px' }}
                    />
                  )}
                </div>

                {/* Step Content */}
                <div className="flex-1">
                  <p
                    className={`text-sm font-medium font-sans ${
                      isStepCompleted || isCurrentStep ? 'text-green-600' : 'text-gray-600'
                    }`}
                  >
                    {step.label}
                  </p>
                  {isCurrentStep && (
                    <p className="text-xs text-gray-500 font-sans">In Progress...</p>
                  )}
                  {isStepCompleted && (
                    <p className="text-xs text-gray-500 font-sans">Completed</p>
                  )}
                  {isPending && (
                    <p className="text-xs text-gray-500 font-sans">Pending</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Completion Message */}
        {isCompleted && (
          <div className="mt-6 text-center">
            <p className="text-green-600 font-medium font-sans">
              Order has been successfully delivered!
            </p>
          </div>
        )}

        {/* Close Button */}
        <div className="mt-6 text-center">
          <button
            onClick={onClose}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-6 rounded-lg text-sm font-sans"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrackOrderModal;