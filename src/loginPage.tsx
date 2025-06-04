import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { useAuth } from './context/authContext';
import { auth, db } from './firebase/firebase';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'farmer' | 'deliveryPartner' | 'buyer' | 'admin' | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useAuth();

  // Admin credentials
  const ADMIN_EMAIL = 'admin@gmail.com';
  const ADMIN_PASSWORD = 'admin@123';

  // Function to detect role based on email (for non-admin users)
  const detectRoleByEmail = async (email: string) => {
    if (!email || email.toLowerCase() === ADMIN_EMAIL) {
      setRole(null);
      setRoleError(null);
      return;
    }

    try {
      const collectionsToCheck = ['farmer', 'buyer', 'deliveryPartner'];
      const rolesFound: string[] = [];

      // Check each collection for the email
      for (const collectionName of collectionsToCheck) {
        const q = query(collection(db, collectionName), where('email', '==', email));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          rolesFound.push(collectionName);
        }
      }

      if (rolesFound.length === 0) {
        setRole(null);
        setRoleError('No account found with this email. Please register first.');
      } else if (rolesFound.length > 1) {
        setRole(null);
        setRoleError('Multiple roles found for this email. Please contact support.');
      } else {
        setRole(rolesFound[0] as 'farmer' | 'deliveryPartner' | 'buyer');
        setRoleError(null);
      }
    } catch (err: any) {
      console.error('Error detecting role:', err);
      setRole(null);
      setRoleError('Error detecting role. Please try again later.');
    }
  };

  // Detect role whenever email changes (skip for admin)
  useEffect(() => {
    if (email.toLowerCase() === ADMIN_EMAIL) {
      setRole('admin');
      setRoleError(null);
    } else {
      detectRoleByEmail(email);
    }
  }, [email]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Validate role before proceeding
    if (!role) {
      setError('Cannot proceed with login. Role not determined.');
      setLoading(false);
      return;
    }

    try {
      console.log("Attempting to log in with email:", email, "and role:", role);

      if (role === 'admin' && email.toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        // Admin login bypass
        console.log("Admin credentials matched, bypassing Firebase Auth");

        // Mock user object for admin
        const adminUser = {
          uid: 'admin-uid', // Hardcoded UID for admin
          email: ADMIN_EMAIL,
          role: null, // Set to null to match AuthUser type
        };

        // Store admin user in AuthContext
        setUser(adminUser);

        // Navigate to admin dashboard
        navigate('/admin');
        return; // Exit early
      }

      // Non-admin login: Authenticate with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      console.log("User authenticated with UID:", user.uid);

      // Determine the collection and dashboard path based on the role
      let collectionName: string;
      let dashboardPath: string;

      switch (role) {
        case 'farmer':
          collectionName = 'farmer';
          // Check verified status
          const farmerDoc = await getDoc(doc(db, 'farmer', user.uid));
          const farmerVerified = farmerDoc.exists() ? farmerDoc.data().verified : false;
          dashboardPath = farmerVerified ? '/farmer/homePage' : '/KYCVerification';
          break;
        case 'deliveryPartner':
          collectionName = 'deliveryPartner';
          // Check verified status
          const deliveryDoc = await getDoc(doc(db, 'deliveryPartner', user.uid));
          const deliveryVerified = deliveryDoc.exists() ? deliveryDoc.data().verified : false;
          dashboardPath = deliveryVerified ? '/delivery/homePage' : '/KYCVerification';
          break;
        case 'buyer':
          collectionName = 'buyer';
          dashboardPath = '/buyer/homePage';
          break;
        default:
          throw new Error('Invalid role detected');
      }

      // Fetch user data from the respective collection using the user's UID
      const userDocRef = doc(db, collectionName, user.uid);
      console.log("Fetching user data from collection:", collectionName, "with UID:", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        throw new Error(`No ${role} data found for this user. Please register first.`);
      }

      console.log("User data fetched:", userDoc.data());

      // Store user data in AuthContext
      setUser({
        uid: user.uid,
        email: user.email,
        role: role,
      });

      // Navigate to the respective dashboard
      navigate(dashboardPath);
    } catch (err: any) {
      console.error('Login error:', err);
      if (role === 'admin' && email.toLowerCase() === ADMIN_EMAIL) {
        setError('Invalid admin password. Please use the correct admin credentials.');
      } else if (err.code === 'auth/invalid-credential') {
        setError('Invalid email or password. Please try again.');
      } else if (err.code === 'auth/user-not-found') {
        setError('No user found with this email. Please register first.');
      } else if (err.code === 'auth/wrong-password') {
        setError('Incorrect password. Please try again.');
      } else {
        setError(err.message || 'Failed to log in. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = () => {
    navigate('/role-selection');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Login</h2>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
            {error}
          </div>
        )}

        {roleError && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
            {roleError}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
              placeholder="Enter your email"
            />
          </div>

          {/* Role Display (Read-Only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Role
            </label>
            <div className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700 sm:text-sm">
              {role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Farmer/Delivery Partner/Buyer'}
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
              placeholder="Enter your password"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !role}
            className={`w-full py-2 px-4 rounded-md text-white font-medium ${
              loading || !role ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <span onClick={handleRegister} className="text-green-600 hover:underline">
            Register here
          </span>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;