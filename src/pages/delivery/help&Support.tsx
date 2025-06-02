import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { FaAngleLeft, FaQuestionCircle, FaRobot, FaTimes, FaPaperPlane } from 'react-icons/fa';

const faqs = [
  {
    question: 'How do I accept a delivery order?',
    answer:
      'Browse available delivery orders on your dashboard under "Delivery Offers." Select an order, review the details (e.g., pickup point, drop-off point, amount), and click "Accept Delivery." Once accepted, the order will appear in your "Active Deliveries" section.',
  },
  {
    question: 'How can I track my delivery route and status?',
    answer:
      'After accepting a delivery, track its status on your dashboard under "Active Deliveries." You can update statuses like "On My Way to Farmer," "Picked Up Order," "On My Way to Buyer," and "Delivered." The farmer and buyer will also receive updates on your progress.',
  },
  {
    question: 'What should I do if I encounter an issue during delivery?',
    answer:
      'If you face issues (e.g., incorrect pickup address, damaged goods), report them via the order details on your dashboard. Provide a description and photos if possible. The farmer and buyer will be notified, and you can escalate to support using the AI chatbot or email support@farmconnect.com.',
  },
  {
    question: 'How do I receive payments for completed deliveries?',
    answer:
      'Payments for completed deliveries are credited to your account after the order is marked as "Delivered." You can view your earnings in the "Completed Deliveries" section. Manage your payment methods in Settings > Payment Methods to ensure smooth transactions.',
  },
  {
    question: 'How can I update my vehicle or availability details?',
    answer:
      'Update your vehicle information (e.g., vehicle type, number) or availability schedule by navigating to Settings > Edit Profile from your dashboard. Make your changes and click "Save Profile" to ensure accurate delivery assignments.',
  },
  {
    question: 'How can I contact support for urgent issues?',
    answer:
      'For urgent issues, use the AI chatbot below for instant help. Alternatively, email support@farmconnect.com or call our 24/7 helpline at +91-123-456-7890. Our team will respond promptly to address your concerns.',
  },
];

const DeliveryPartnerHelpAndSupport = () => {
  const navigate = useNavigate();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [showChatbot, setShowChatbot] = useState(false);
  const [message, setMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const handleBackToSettings = () => {
    navigate('/delivery/settings');
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
    setMessage('');
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
            onClick={handleBackToSettings}
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
              <h2 className="text-xl font-semibold text-gray-800 font-sans">Delivery Partner Support</h2>
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
                Hello! I'm here to help with any questions you have as a delivery partner. What can I assist you with today?
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

export default DeliveryPartnerHelpAndSupport;