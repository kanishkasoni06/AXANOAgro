import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { FaSeedling, FaShoppingBasket, FaTruck } from 'react-icons/fa';
import { IconType } from 'react-icons';

// Define a union type for valid role IDs
type RoleId = 'farmer' | 'buyer' | 'delivery-partner';

interface Role {
  id: RoleId;
  name: string;
  description: string;
  icon: IconType;
  color: string;
  redirectPath: string;
}

const RoleSelection = () => {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<RoleId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const roles: Role[] = [
    {
      id: 'farmer',
      name: 'Farmer',
      description: 'List and sell your produce directly',
      icon: FaSeedling,
      color: 'text-green-600',
      redirectPath: '/farmer/Profile'
    },
    {
      id: 'buyer',
      name: 'Buyer',
      description: 'Purchase quality agricultural products',
      icon: FaShoppingBasket,
      color: 'text-blue-600',
      redirectPath: '/buyer/Profile'
    },
    {
      id: 'delivery-partner',
      name: 'Delivery Partner',
      description: 'Join our logistics network',
      icon: FaTruck,
      color: 'text-orange-600',
      redirectPath: '/delivery/Profile'
    }
  ];

  const handleContinue = () => {
    if (!selectedRole) {
      setError('Please select a role to continue');
      return;
    }
    
    const role = roles.find(r => r.id === selectedRole);
    if (role) {
      navigate(role.redirectPath);
    }
  };

  const handleRoleSelect = (roleId: RoleId) => {
    setSelectedRole(roleId);
    setError(null); // Clear error when user selects a role
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-green-0 to-green-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md overflow-hidden">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Choose your role
          </h2>

          {error && (
            <div className="mb-4 p-3 text-red-600 bg-red-50 rounded-md text-center">
              {error}
            </div>
          )}

          <div className="space-y-5 mb-8">
            {roles.map((role) => {
              const IconComponent = role.icon;
              return (
                <div
                  key={role.id}
                  onClick={() => handleRoleSelect(role.id)} 
                  className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedRole === role.id
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleRoleSelect(role.id)}
                >
                  <div className={`mt-1 ${role.color}`}>
                    <IconComponent className="text-2xl" />
                  </div>
                  <h2 className="font-semibold text-lg text-gray-900">{role.name}</h2>
                  <p className="text-gray-600 mt-1">{role.description}</p>
                </div>
              );
            })}
          </div>

          <div className="pb-6">
            <Button
              onClick={handleContinue}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-6 rounded-lg shadow-md transition-colors"
              disabled={!selectedRole}
            >
              Continue
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;