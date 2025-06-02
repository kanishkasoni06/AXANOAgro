import  { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { FaAngleLeft, FaQuestionCircle, FaRobot, FaTimes, FaPaperPlane } from 'react-icons/fa';

const faqs = [
  {
    question: 'How do I update my profile information?',
    answer:
      'You can update your business name, email, full name, location, and profile image by navigating to the "Edit Profile" section from your dashboard. Go to Settings > Edit Profile, make your changes, and click "Save Profile." Note that KYC documents like Aadhar or passport photos cannot be edited directly and require admin assistance.',
  },
  {
    question: 'Why are my KYC documents not editable?',
    answer:
      'Your KYC documents (Aadhar card, passport photo, and photo holding Aadhar) are stored securely and can only be updated by administrators to ensure compliance. If you need to change these documents, please contact support through the AI chatbot or email support@farmconnect.com.',
  },
  {
    question: 'How do I fulfill orders from buyers?',
    answer:
      'When a buyer places an order, you’ll receive a notification on your farmer dashboard. Review the order details, confirm availability, and prepare the produce. Once ready, mark the order as "Ready for Pickup" to notify the assigned delivery partner. Track the order status on your dashboard.',
  },
  {
    question: 'How are delivery partners assigned to my orders?',
    answer:
      'Delivery partners are automatically assigned based on location and availability. Once you mark an order as "Ready for Pickup," the system notifies the assigned partner. You can view their details (e.g., vehicle number, status) and track the delivery progress on your dashboard.',
  },
  {
    question: 'What should I do if a buyer reports an issue with my produce?',
    answer:
      'If a buyer reports an issue, you’ll receive a notification with details. Respond promptly via the dashboard’s messaging system to resolve the issue. If needed, escalate to support using the AI chatbot or email support@farmconnect.com for assistance in handling disputes.',
  },
  {
    question: 'How can I contact support for urgent issues?',
    answer:
      'For urgent issues, use the AI chatbot below to get instant help. Alternatively, email support@farmconnect.com or call our 24/7 helpline at +91-123-456-7890. Our team will respond promptly to ensure your concerns are addressed.',
  },
];

const HelpAndSupport = () => {
  const navigate = useNavigate();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [showChatbot, setShowChatbot] = useState(false);
  const [message, setMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const handleBackToDashboard = () => {
    navigate('/farmer/settings');
  };

  const handleChatbotClick = () => {
    setShowChatbot(true);
  };

  const handleCloseChatbot = () => {
    setShowChatbot(false);
    setMessage('');
  };

  const handleSendMessage = () => {
    if (!message.trim()) return;
    console.log('User message:', message); // Placeholder for Grok 3 API integration
    setMessage(message.trim());
  };

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showChatbot) {
        handleCloseChatbot();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showChatbot]);

  // Focus input when modal opens
  useEffect(() => {
    if (showChatbot && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showChatbot]);

  // Scroll to bottom of chat (placeholder for future messages)
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  return (
    <div className="min-h-screen p-6 bg-gradient-to-b from-green-50 to-green-100">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            onClick={handleBackToDashboard}
            className="flex items-center text-gray-600 hover:text-gray-900 font-sans"
          >
            <FaAngleLeft className="mr-2 h-5 w-5" />
          </Button>
        </div>

        <h1 className="text-3xl font-bold text-gray-800 mb-8 font-sans">Help & Support</h1>

        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <div className="flex items-center mb-6">
            <FaQuestionCircle className="text-green-600 text-3xl mr-4" />
            <div>
              <h2 className="text-xl font-semibold text-gray-800 font-sans">Farmer Support</h2>
              <p className="text-sm text-gray-500 font-sans">
                Find answers to common questions or get help via our AI chatbot.
              </p>
            </div>
          </div>

          {faqs.map((faq, index) => (
            <div
              key={index}
              className="p-4 hover:bg-gray-50 rounded-lg cursor-pointer border-b border-gray-200"
              onClick={() => toggleFAQ(index)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FaQuestionCircle className="text-green-600 text-xl mr-4" />
                  <h3 className="text-gray-800 font-medium font-sans">{faq.question}</h3>
                </div>
              </div>
              {openIndex === index && (
                <p className="text-sm text-gray-600 mt-2 font-sans">{faq.answer}</p>
              )}
            </div>
          ))}

          <div className="p-4 text-center">
            <Button
              onClick={handleChatbotClick}
              className="bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-8 rounded-lg text-base font-sans flex items-center justify-center mx-auto"
            >
              <FaRobot className="mr-2 h-5 w-5" />
              Chat with AI Support
            </Button>
          </div>
        </div>
      </div>

      {/* Chatbot Modal */}
      {showChatbot && (
        <div className="fixed inset-0 bg-gradient-to-b from-green-0 to-green-100 flex justify-center items-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md mx-4 p-6 min-h-[80vh] max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <FaRobot className="text-green-600 text-2xl mr-3" />
                <h3 className="text-lg font-semibold text-gray-800 font-sans">AI Support Chat</h3>
              </div>
              <Button
                variant="ghost"
                onClick={handleCloseChatbot}
                className="text-gray-600 hover:text-gray-900"
              >
                <FaTimes className="h-5 w-5" />
              </Button>
            </div>

            {/* Chat Area (Placeholder) */}
            <div className="flex-1 bg-gray-100 rounded-lg p-4 overflow-y-auto mb-4">
              <div className="text-gray-600 text-sm font-sans">
                Hello! I'm here to help with any questions you have. What can I assist you with today?
              </div>
              <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div className="flex items-center space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type your message..."
                className="flex-1 text-sm text-gray-600 font-sans border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <Button
                onClick={handleSendMessage}
                className="bg-green-600 hover:bg-green-700 text-white rounded-lg p-2"
                disabled={!message.trim()}
              >
                <FaPaperPlane className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpAndSupport;