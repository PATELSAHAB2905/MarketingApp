import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

// Exact marketer name → sheet tab mapping
export const MARKETER_ROSTER = {
  'marketer-1': { name: 'Deepak Prajapati', mobile: '9826012345', email: 'deepak@patelsahab.com' },
  'marketer-2': { name: 'Vijay Verma',       mobile: '9826023456', email: 'vijay@patelsahab.com' },
  'marketer-3': { name: 'Atul Meena',         mobile: '9826034567', email: 'atul@patelsahab.com' },
  'marketer-4': { name: 'Pankaj Malviya',     mobile: '9826045678', email: 'pankaj@patelsahab.com' },
  'marketer-5': { name: 'Vikash Meena',       mobile: '9826056789', email: 'vikash@patelsahab.com' },
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('PATEL_CURRENT_USER');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    // Default: Deepak Prajapati for easy mobile testing
    return {
      id: 'marketer-1',
      name: 'Deepak Prajapati',
      role: 'MARKETER',
      email: 'deepak@patelsahab.com',
      mobile: '9826012345',
    };
  });

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('PATEL_CURRENT_USER', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('PATEL_CURRENT_USER');
    }
  }, [currentUser]);

  const login = (email, role = 'MARKETER', marketerId = 'marketer-1') => {
    if (role === 'ADMIN') {
      const user = {
        id: 'admin-1',
        name: 'Sujeet Patel',
        role: 'ADMIN',
        email: email || 'admin@patelsahab.com',
        mobile: '9826000000',
      };
      setCurrentUser(user);
      return user;
    } else {
      const info = MARKETER_ROSTER[marketerId] || MARKETER_ROSTER['marketer-1'];
      const user = {
        id: marketerId,
        name: info.name,
        role: 'MARKETER',
        email: email || info.email,
        mobile: info.mobile,
      };
      setCurrentUser(user);
      return user;
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('PATEL_CURRENT_USER');
  };

  const switchRole = (role, marketerId) => {
    return login('', role, marketerId);
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
