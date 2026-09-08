import React, { createContext, useContext, useState, useEffect } from 'react';
import { setDocument } from '../services/firestoreService';

const AuthContext = createContext();

// Fixed Immutable Master Password
export const MASTER_PASSWORD = 'Patel@2905';

// Default Admin User Config
export const DEFAULT_ADMIN = {
  id: 'admin-1',
  name: 'Patel Sahab Management',
  role: 'ADMIN',
  email: 'patelsahabspices@gmail.com', // Primary Admin Gmail ID
  secondaryEmail: 'admin@patelsahab.com',
  mobile: '9826022905',
  username: 'admin',
};

// Initial Marketer Roster
export const INITIAL_MARKETER_ROSTER = {
  'marketer-1': { id: 'marketer-1', name: 'Deepak Prajapati', mobile: '9826012345', email: 'deepak@patelsahab.com', active: true },
  'marketer-2': { id: 'marketer-2', name: 'Vijay Verma',       mobile: '9826023456', email: 'vijay@patelsahab.com', active: true },
  'marketer-3': { id: 'marketer-3', name: 'Atul Meena',         mobile: '9826034567', email: 'atul@patelsahab.com', active: true },
  'marketer-4': { id: 'marketer-4', name: 'Pankaj Malviya',     mobile: '9826045678', email: 'pankaj@patelsahab.com', active: true },
  'marketer-5': { id: 'marketer-5', name: 'Vikash Meena',       mobile: '9826056789', email: 'vikash@patelsahab.com', active: true },
};

/**
 * Extracts default password (last 4 digits of mobile number).
 */
export function getDefaultPassword(mobile) {
  if (!mobile) return '1234';
  const digits = String(mobile).replace(/\D/g, '');
  return digits.length >= 4 ? digits.slice(-4) : digits.padStart(4, '0');
}

export const AuthProvider = ({ children }) => {
  // Current logged in user (null if not logged in)
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('PATEL_CURRENT_USER');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return null; // Require login
  });

  // Custom passwords map: { [userId]: 'customPassword' }
  const [userPasswords, setUserPasswords] = useState(() => {
    const saved = localStorage.getItem('PATEL_USER_PASSWORDS');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {};
  });

  // Failed login attempts map: { [userKey]: number }
  const [failedAttempts, setFailedAttempts] = useState(() => {
    const saved = localStorage.getItem('PATEL_LOGIN_ATTEMPTS');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {};
  });

  // Admin profile state
  const [adminProfile, setAdminProfile] = useState(() => {
    const saved = localStorage.getItem('PATEL_ADMIN_PROFILE');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_ADMIN,
          ...parsed,
          email: parsed.email || 'patelsahabspices@gmail.com',
        };
      } catch (e) {}
    }
    return DEFAULT_ADMIN;
  });

  // Sync state to localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('PATEL_CURRENT_USER', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('PATEL_CURRENT_USER');
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('PATEL_USER_PASSWORDS', JSON.stringify(userPasswords));
  }, [userPasswords]);

  useEffect(() => {
    localStorage.setItem('PATEL_LOGIN_ATTEMPTS', JSON.stringify(failedAttempts));
  }, [failedAttempts]);

  useEffect(() => {
    localStorage.setItem('PATEL_ADMIN_PROFILE', JSON.stringify(adminProfile));
  }, [adminProfile]);

  // Helper to get effective password for a user
  const getEffectivePassword = (userId, mobile) => {
    if (userPasswords[userId]) {
      return String(userPasswords[userId]);
    }
    return getDefaultPassword(mobile);
  };

  // Helper to get failed attempts count
  const getAttemptsCount = (userKey) => {
    return failedAttempts[userKey] || 0;
  };

  const isAccountLocked = (userKey) => {
    return getAttemptsCount(userKey) >= 15;
  };

  // Reset failed attempts for a user
  const resetAttempts = (userKey) => {
    setFailedAttempts((prev) => {
      const next = { ...prev };
      delete next[userKey];
      return next;
    });
  };

  // Record a failed attempt
  const recordFailedAttempt = (userKey) => {
    const current = getAttemptsCount(userKey) + 1;
    setFailedAttempts((prev) => ({
      ...prev,
      [userKey]: current,
    }));
    return current;
  };

  /**
   * Automatically triggered when Marketer's mobile number is changed by Admin.
   * Resets the marketer's password back to the last 4 digits of the new mobile number.
   * Clears old passwords and resets failed attempts.
   */
  const onMarketerMobileChanged = (marketerId, newMobile) => {
    // 1. Remove custom password so it reverts to the last 4 digits of new mobile
    setUserPasswords((prev) => {
      const next = { ...prev };
      delete next[marketerId];
      return next;
    });

    // 2. Reset failed attempts
    resetAttempts(marketerId);

    // 3. If the currently logged in user is this marketer, update their mobile in session
    setCurrentUser((prev) => {
      if (prev && prev.id === marketerId) {
        return {
          ...prev,
          mobile: newMobile,
        };
      }
      return prev;
    });

    // 4. Sync security state to Firestore
    setDocument('systemSettings', `auth_${marketerId}`, {
      userId: marketerId,
      mobile: newMobile,
      hasCustomPassword: false,
      updatedAt: new Date().toISOString(),
    }).catch(() => {});
  };

  /**
   * Login with password
   */
  const loginWithPassword = ({ role, marketerId, marketerMobile, adminEmail, password, marketersList = [] }) => {
    const cleanPass = String(password || '').trim();

    if (role === 'ADMIN') {
      const adminKey = 'admin-1';
      const currentAttempts = getAttemptsCount(adminKey);

      if (currentAttempts >= 15) {
        return {
          success: false,
          isLocked: true,
          attempts: currentAttempts,
          error: 'Security Lock: Maximum 15 failed attempts reached! Please unlock using the Master Password.',
        };
      }

      const inputEmail = String(adminEmail || '').trim().toLowerCase();
      const validAdminEmails = [
        'patelsahabspices@gmail.com',
        (adminProfile.email || '').toLowerCase(),
        (adminProfile.secondaryEmail || '').toLowerCase(),
        'admin@patelsahab.com',
        'admin',
      ];

      if (!validAdminEmails.includes(inputEmail) && inputEmail.length > 0) {
        return {
          success: false,
          isLocked: false,
          attempts: currentAttempts,
          error: 'Invalid Admin Gmail ID. Please enter patelsahabspices@gmail.com.',
        };
      }

      const expectedPassword = getEffectivePassword('admin-1', adminProfile.mobile);

      if (cleanPass === expectedPassword || cleanPass === MASTER_PASSWORD) {
        resetAttempts(adminKey);
        const user = {
          id: 'admin-1',
          name: adminProfile.name,
          role: 'ADMIN',
          email: adminProfile.email,
          mobile: adminProfile.mobile,
        };
        setCurrentUser(user);
        return { success: true, user };
      } else {
        const attempts = recordFailedAttempt(adminKey);
        return {
          success: false,
          isLocked: attempts >= 15,
          attempts,
          remainingAttempts: Math.max(0, 15 - attempts),
          error: `Incorrect Password! Attempt ${attempts} of 15.${attempts >= 15 ? ' Account is now locked.' : ''}`,
        };
      }
    } else {
      // MARKETER LOGIN
      const allMarketers = marketersList.length > 0 ? marketersList : Object.values(INITIAL_MARKETER_ROSTER);
      let targetMarketer = null;

      if (marketerId) {
        targetMarketer = allMarketers.find((m) => m.id === marketerId);
      } else if (marketerMobile) {
        const cleanInputDigits = String(marketerMobile).replace(/\D/g, '');
        targetMarketer = allMarketers.find((m) => {
          const mDigits = String(m.mobile || '').replace(/\D/g, '');
          return mDigits === cleanInputDigits || (cleanInputDigits.length >= 4 && mDigits.endsWith(cleanInputDigits));
        });
      }

      if (!targetMarketer) {
        return {
          success: false,
          isLocked: false,
          attempts: 0,
          error: 'Marketer profile not found. Please check your registered mobile number.',
        };
      }

      const userKey = targetMarketer.id;
      const currentAttempts = getAttemptsCount(userKey);

      if (currentAttempts >= 15) {
        return {
          success: false,
          isLocked: true,
          attempts: currentAttempts,
          targetMarketer,
          error: 'Security Lock: Maximum 15 failed attempts reached! Please unlock using the Master Password.',
        };
      }

      const expectedPassword = getEffectivePassword(targetMarketer.id, targetMarketer.mobile);

      if (cleanPass === expectedPassword || cleanPass === MASTER_PASSWORD) {
        resetAttempts(userKey);
        const user = {
          id: targetMarketer.id,
          name: targetMarketer.name,
          role: 'MARKETER',
          email: targetMarketer.email || `${targetMarketer.id}@patelsahab.com`,
          mobile: targetMarketer.mobile,
        };
        setCurrentUser(user);
        return { success: true, user };
      } else {
        const attempts = recordFailedAttempt(userKey);
        return {
          success: false,
          isLocked: attempts >= 15,
          attempts,
          targetMarketer,
          remainingAttempts: Math.max(0, 15 - attempts),
          error: `Incorrect Password! Attempt ${attempts} of 15.${attempts >= 15 ? ' Account is now locked.' : ''}`,
        };
      }
    }
  };

  /**
   * Unlock account and reset password using Master Password
   */
  const unlockAndResetWithMasterPassword = ({ userKey, masterPassword, newPassword = null, mobile = '' }) => {
    if (String(masterPassword || '').trim() !== MASTER_PASSWORD) {
      return {
        success: false,
        error: 'Invalid Master Password! Please enter the correct Master Password.',
      };
    }

    // Master password verified! Reset attempts
    resetAttempts(userKey);

    if (newPassword && newPassword.length >= 4) {
      setUserPasswords((prev) => ({
        ...prev,
        [userKey]: String(newPassword).trim(),
      }));
    } else {
      // Revert to default password (last 4 digits of mobile)
      setUserPasswords((prev) => {
        const next = { ...prev };
        delete next[userKey];
        return next;
      });
    }

    return {
      success: true,
      message: 'Account successfully unlocked! Password has been reset.',
    };
  };

  /**
   * User change their own password
   */
  const changePassword = (userId, currentPassword, newPassword, userMobile) => {
    const cleanCurrent = String(currentPassword || '').trim();
    const cleanNew = String(newPassword || '').trim();

    if (!cleanNew || cleanNew.length < 4) {
      return { success: false, error: 'New password must be at least 4 characters long.' };
    }

    const expectedCurrent = getEffectivePassword(userId, userMobile);

    if (cleanCurrent !== expectedCurrent && cleanCurrent !== MASTER_PASSWORD) {
      return { success: false, error: 'Current password is incorrect.' };
    }

    setUserPasswords((prev) => ({
      ...prev,
      [userId]: cleanNew,
    }));

    // Optional firestore sync for passwords backup
    setDocument('systemSettings', `auth_${userId}`, {
      userId,
      hasCustomPassword: true,
      updatedAt: new Date().toISOString(),
    }).catch(() => {});

    return { success: true, message: 'Password updated successfully!' };
  };

  /**
   * Admin Reset Marketer Password to Default
   */
  const adminResetMarketerPassword = (marketerId) => {
    setUserPasswords((prev) => {
      const next = { ...prev };
      delete next[marketerId];
      return next;
    });
    resetAttempts(marketerId);
    return { success: true, message: 'Marketer password has been reset to default (last 4 digits of mobile).' };
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('PATEL_CURRENT_USER');
  };

  const updateAdminProfile = (updates) => {
    setAdminProfile((prev) => ({ ...prev, ...updates }));
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        adminProfile,
        userPasswords,
        failedAttempts,
        loginWithPassword,
        unlockAndResetWithMasterPassword,
        changePassword,
        adminResetMarketerPassword,
        onMarketerMobileChanged,
        getEffectivePassword,
        getAttemptsCount,
        isAccountLocked,
        resetAttempts,
        logout,
        updateAdminProfile,
        MASTER_PASSWORD,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
