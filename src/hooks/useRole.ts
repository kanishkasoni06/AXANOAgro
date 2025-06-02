import { useState, useEffect } from 'react';

// Export the RoleId type to share across components
export type RoleId = 'farmer' | 'buyer' | 'delivery-partner' | null;

const useRole = () => {
  const [selectedRole, setSelectedRole] = useState<RoleId>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const role = localStorage.getItem('selectedRole') as RoleId;
    if (role) setSelectedRole(role);
  }, []);

  // Update both state and localStorage
  const updateRole = (role: RoleId) => {
    setSelectedRole(role);
    if (role) localStorage.setItem('selectedRole', role);
    else localStorage.removeItem('selectedRole');
  };

  return {
    selectedRole,
    setSelectedRole: updateRole,
    clearRole: () => updateRole(null)
  };
};

export default useRole;