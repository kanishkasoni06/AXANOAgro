import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../firebase/firebase";
import { useCart } from "../../context/CartContext";
import { Loader2 } from "lucide-react";
import axios from "axios";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (orderId: string) => void;
  totalAmount: number;
  cartItems: Array<{
    id: string;
    name: string;
    price: string;
    quantity: number;
    imageUrl: string;
  }>;
  deliveryDetails: {
    name: string;
    address: string;
    phone: string;
    specialInstructions: string;
  };
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  totalAmount,
  cartItems,
  deliveryDetails,
}) => {
  const { clearCart } = useCart();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Load Razorpay SDK
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handlePayNow = async () => {
  setIsLoading(true);
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    // Log the payload for debugging
    const payload = { amount: Math.round(totalAmount * 100) };
    console.log("Sending request to /create-order with payload:", payload);

    // Fetch order ID from backend
    const response = await axios.post("http://localhost:3000/create-order", payload, {
      headers: { "Content-Type": "application/json" },
    });
    const { orderId } = response.data;
    console.log("Order created:", orderId);

    // Get Razorpay key - use environment variable or fallback to hardcoded key
    const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY || 'rzp_live_xqIA5b66QZO5JV';
    console.log("Using Razorpay key:", razorpayKey);

    // Initialize Razorpay
    const options = {
      key: razorpayKey,
      amount: Math.round(totalAmount * 100), // Amount in paise
      currency: "INR",
      name: "AgriFarm",
      description: "Order Payment",
      order_id: orderId,
      handler: async (response: any) => {
        try {
          // Create order in Firestore
          const orderData = {
            buyerId: user.uid,
            deliveryName: deliveryDetails.name,
            deliveryAddress: deliveryDetails.address,
            deliveryPhone: deliveryDetails.phone,
            specialInstructions: deliveryDetails.specialInstructions,
            items: cartItems.map((item) => ({
              id: item.id,
              name: item.name,
              price: parseFloat(item.price),
              quantity: item.quantity,
              imageUrl: item.imageUrl,
            })),
            totalAmount,
            deliveryCharges: 0,
            gst: 0,
            status: "pending",
            paymentId: response.razorpay_payment_id,
            razorpayOrderId: response.razorpay_order_id,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };

          const orderRef = await addDoc(collection(db, "orders"), orderData);
          console.log("Order stored in Firestore:", orderRef.id);

          // Clear cart and confirm order
          clearCart();
          onConfirm(orderRef.id);

          // Send FCM notification
          await axios.post("http://localhost:3000/api/send-notification", {
            userId: user.uid,
            title: "Order Placed",
            body: `Your order #${orderRef.id} has been placed successfully!`,
          });

          alert(
            `Payment successful! Payment ID: ${response.razorpay_payment_id}\nOrder ID: ${response.razorpay_order_id}`
          );
        } catch (error) {
          console.error("Error creating order after payment:", error);
          setError("Failed to process order after payment. Please contact support.");
        }
      },
      prefill: {
        name: deliveryDetails.name,
        email: user.email || "customer@example.com",
        contact: deliveryDetails.phone,
      },
      theme: {
        color: "#3399cc",
      },
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.on("payment.failed", (response: any) => {
      setError("Payment failed! Please try again.");
      console.error("Payment failed:", response.error);
    });
    rzp.open();
  } catch (error) {
    console.error("Error initiating payment:", error);
    setError("Failed to initiate payment. Please try again.");
  } finally {
    setIsLoading(false);
  }
};

  // Payment breakdown
  const paymentDetails = {
    subtotal: totalAmount,
    deliveryCharges: 0,
    gst: 0,
    total: totalAmount,
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-green-50 border-green-600 rounded-lg p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-green-800">Payment Confirmation</DialogTitle>
          <DialogDescription className="text-gray-600">
            Review your order and payment details before proceeding
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Delivery Details */}
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="font-medium text-lg mb-3">Delivery Details</h3>
            <div className="space-y-2 text-gray-700">
              <p><strong>Name:</strong> {deliveryDetails.name}</p>
              <p><strong>Phone:</strong> {deliveryDetails.phone}</p>
              <p><strong>Address:</strong> {deliveryDetails.address}</p>
              {deliveryDetails.specialInstructions && (
                <p><strong>Special Instructions:</strong> {deliveryDetails.specialInstructions}</p>
              )}
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="font-medium text-lg mb-3">Order Summary</h3>
            <div className="space-y-3">
              {cartItems.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <span className="text-gray-700">
                    {item.name} × {item.quantity}
                  </span>
                  <span className="font-medium">
                    ₹{(parseFloat(item.price) * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Details */}
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="font-medium text-lg mb-3">Payment Details</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-700">Subtotal</span>
                <span className="font-medium">₹{paymentDetails.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Delivery Charges</span>
                <span className="font-medium">₹{paymentDetails.deliveryCharges.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">GST</span>
                <span className="font-medium">₹{paymentDetails.gst.toFixed(2)}</span>
              </div>
              <div className="border-t mt-2 pt-2 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-green-600">₹{paymentDetails.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && <div className="text-red-500 text-sm mt-2">{error}</div>}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              onClick={handlePayNow}
              className="bg-green-600 hover:bg-green-700"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Pay Now"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};