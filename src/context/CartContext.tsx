import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, doc, setDoc, deleteDoc, onSnapshot, Timestamp, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { toast } from 'react-hot-toast';

interface CartItem {
  id: string; // itemId
  quantity: number;
}

type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

interface Order {
  id: string;
  date: string;
  items: CartItem[];
  totalAmount: number;
  status: OrderStatus;
  buyerId?: string;
  buyerName?: string;
  deliveryAddress?: string;
}

interface CartContextType {
  cartItems: CartItem[];
  setCartItems: (items: CartItem[]) => void;
  orders: Order[];
  totalItems: number;
  totalAmount: number;
  addToCart: (item: Omit<CartItem, 'quantity'>) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  placeOrder: (orderDetails: Omit<Order, 'id' | 'date' | 'items' | 'totalAmount' | 'status'>) => Promise<string | null>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  fetchOrders: () => Promise<void>;
  loading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Calculate totalAmount by fetching item prices
  const calculateTotalAmount = async (items: CartItem[]) => {
    let total = 0;
    for (const item of items) {
      const itemDocRef = doc(db, 'items', item.id);
      const itemDoc = await getDoc(itemDocRef);
      if (itemDoc.exists()) {
        const itemData = itemDoc.data();
        const price = itemData.discountPrice || itemData.price;
        total += price * item.quantity;
      }
    }
    return total;
  };

  // Fetch cart from Firestore in real-time when user is authenticated
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user || !user.uid) {
        setCartItems([]);
        setTotalAmount(0);
        return;
      }

      const cartDocRef = doc(db, 'cart', user.uid);
      const unsubscribeSnapshot = onSnapshot(
        cartDocRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const cartData = docSnap.data();
            const items = (cartData.items || []).map((item: any) => ({
              id: item.itemId,
              quantity: item.quantity,
            }));
            setCartItems(items);
            setTotalAmount(cartData.totalAmount || 0);
          } else {
            setCartItems([]);
            setTotalAmount(0);
          }
        },
        (error) => {
          console.error('Error listening to cart:', error);
          toast.error('Failed to sync cart. Please try again.');
        }
      );

      return () => unsubscribeSnapshot();
    });

    return () => unsubscribeAuth();
  }, []);

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const syncCartToFirestore = async (updatedItems: CartItem[]) => {
    const user = auth.currentUser;
    if (!user || !user.uid) return;

    try {
      const cartDocRef = doc(db, 'cart', user.uid);
      if (updatedItems.length === 0) {
        await deleteDoc(cartDocRef);
        setTotalAmount(0);
        return;
      }

      // Validate required fields
      const validItems = updatedItems.filter(item => item.id && item.quantity > 0);

      if (validItems.length !== updatedItems.length) {
        console.warn('Some cart items were invalid and skipped:', updatedItems);
        toast.error('Some items in your cart are invalid and were skipped.');
      }

      if (validItems.length === 0) {
        await deleteDoc(cartDocRef);
        setTotalAmount(0);
        return;
      }

      // Calculate totalAmount before syncing
      const newTotalAmount = await calculateTotalAmount(validItems);

      await setDoc(
        cartDocRef,
        {
          buyerId: user.uid,
          items: validItems.map(item => ({
            itemId: item.id,
            quantity: item.quantity,
          })),
          lastUpdated: Timestamp.fromDate(new Date()),
          totalAmount: newTotalAmount,
        },
        { merge: true }
      );

      setTotalAmount(newTotalAmount);
    } catch (error) {
      console.error('Error syncing cart to Firestore:', error);
      toast.error('Failed to update cart. Please try again.');
    }
  };

  const addToCart = (item: Omit<CartItem, 'quantity'>) => {
    const user = auth.currentUser;
    if (!user) {
      toast.error('Please log in to add items to your cart.');
      return;
    }

    const existingItem = cartItems.find(cartItem => cartItem.id === item.id);
    let updatedItems: CartItem[];
    if (existingItem) {
      updatedItems = cartItems.map(cartItem =>
        cartItem.id === item.id
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      );
    } else {
      updatedItems = [...cartItems, { ...item, quantity: 1 }];
    }
    setCartItems(updatedItems);
    syncCartToFirestore(updatedItems);
  };

  const removeFromCart = (id: string) => {
    const updatedItems = cartItems.filter(item => item.id !== id);
    setCartItems(updatedItems);
    syncCartToFirestore(updatedItems);
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    const updatedItems = cartItems.map(item =>
      item.id === id ? { ...item, quantity } : item
    );
    setCartItems(updatedItems);
    syncCartToFirestore(updatedItems);
  };

  const clearCart = () => {
    setCartItems([]);
    setTotalAmount(0);
    const user = auth.currentUser;
    if (user && user.uid) {
      const cartDocRef = doc(db, 'cart', user.uid);
      deleteDoc(cartDocRef).catch(error => {
        console.error('Error clearing cart from Firestore:', error);
        toast.error('Failed to clear cart. Please try again.');
      });
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) return;

      const q = query(
        collection(db, 'orders'),
        where('buyerId', '==', user.uid),
        orderBy('date', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const ordersData: Order[] = [];

      querySnapshot.forEach((doc) => {
        ordersData.push({
          id: doc.id,
          ...doc.data(),
        } as Order);
      });

      setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to fetch orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const placeOrder = async (orderDetails: Omit<Order, 'id' | 'date' | 'items' | 'totalAmount' | 'status'>): Promise<string | null> => {
    if (cartItems.length === 0) return null;

    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const orderData = {
        ...orderDetails,
        buyerId: user.uid,
        items: cartItems,
        totalAmount,
        status: 'pending' as OrderStatus,
        date: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'orders'), orderData);

      // Update local state
      const newOrder: Order = {
        id: docRef.id,
        date: new Date().toISOString(),
        items: cartItems,
        totalAmount,
        status: 'pending',
        ...orderDetails,
      };

      setOrders(prev => [...prev, newOrder]);

      // Clear cart in Firestore and context
      const cartDocRef = doc(db, 'cart', user.uid);
      await deleteDoc(cartDocRef);
      setCartItems([]);
      setTotalAmount(0);

      return docRef.id;
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error('Failed to place order. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      setLoading(true);
      await updateDoc(doc(db, 'orders', orderId), {
        status,
        updatedAt: serverTimestamp(),
      });

      // Update local state
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId ? { ...order, status } : order
        )
      );
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        setCartItems,
        orders,
        totalItems,
        totalAmount,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        placeOrder,
        updateOrderStatus,
        fetchOrders,
        loading,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};