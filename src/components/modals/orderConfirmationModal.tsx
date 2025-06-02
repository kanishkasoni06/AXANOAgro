import { useState } from "react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Loader2 } from "lucide-react";
import { PaymentModal } from "./paymentModal";

interface OrderConfirmationModalProps {
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
}

export const OrderConfirmationModal: React.FC<OrderConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  totalAmount,
  cartItems,
}) => {
  const [deliveryDetails, setDeliveryDetails] = useState({
    name: "",
    address: "",
    phone: "",
    specialInstructions: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setDeliveryDetails((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleConfirmOrder = async () => {
    try {
      setIsLoading(true);
      setError("");

      // Validate inputs
      if (!deliveryDetails.name.trim() || !deliveryDetails.address.trim() || !deliveryDetails.phone.trim()) {
        setError("Please fill in all required fields");
        return;
      }

      // Do NOT create order here; open PaymentModal for payment processing
      setIsPaymentModalOpen(true);
    } catch (error) {
      console.error("Error validating order:", error);
      setError("Failed to proceed to payment. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px] bg-green-50 border-green-600 rounded-lg p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-green-800">Confirm Your Order</DialogTitle>
            <DialogDescription className="text-gray-600">
              Please review your order details and provide delivery information
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
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
              <div className="border-t mt-3 pt-3 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-green-600">₹{totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Delivery Information Form */}
            <div className="space-y-4">
              <h3 className="font-medium text-lg">Delivery Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={deliveryDetails.name}
                    onChange={handleInputChange}
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={deliveryDetails.phone}
                    onChange={handleInputChange}
                    placeholder="9876543210"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Delivery Address *</Label>
                <Textarea
                  id="address"
                  name="address"
                  value={deliveryDetails.address}
                  onChange={handleInputChange}
                  placeholder="Street, City, State, Pincode"
                  rows={3}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialInstructions">Special Instructions</Label>
                <Textarea
                  id="specialInstructions"
                  name="specialInstructions"
                  value={deliveryDetails.specialInstructions}
                  onChange={handleInputChange}
                  placeholder="Any special delivery instructions..."
                  rows={2}
                />
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
                onClick={handleConfirmOrder}
                className="bg-green-600 hover:bg-green-700"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Proceed to Payment"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onConfirm={onConfirm}
        totalAmount={totalAmount}
        cartItems={cartItems}
        deliveryDetails={deliveryDetails}
      />
    </>
  );
};