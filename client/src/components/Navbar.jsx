import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated || !user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <nav className="top-navbar" style={styles.navbar}>
      <div style={styles.content}>
        <div style={styles.branding}>
          <span style={styles.logoIcon}>💼</span>
          <span style={styles.logoText}>JobTrackr</span>
        </div>

        <div style={styles.userControls}>
          <div style={styles.profileBadge}>
            <span style={styles.userName}>{user.name || user.email}</span>
            <span
              style={
                user.role === 'admin' ? styles.adminBadge : styles.roleBadge
              }
            >
              {user.role || 'user'}
            </span>
          </div>

          <button
            onClick={handleLogout}
            style={styles.logoutButton}
            title="Sign out of your account"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

const styles = {
  navbar: {
    backgroundColor: '#0f172a',
    borderBottom: '1px solid #334155',
    padding: '12px 20px',
    position: 'sticky',
    top: 0,
    zIndex: 50,
  },
  content: {
    maxWidth: '1280px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  branding: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  logoIcon: {
    fontSize: '1.4rem',
  },
  logoText: {
    fontSize: '1.2rem',
    fontWeight: '700',
    color: '#f8fafc',
    letterSpacing: '-0.02em',
  },
  userControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  profileBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  userName: {
    fontSize: '0.9rem',
    color: '#cbd5e1',
    fontWeight: '500',
  },
  roleBadge: {
    fontSize: '0.75rem',
    padding: '2px 8px',
    borderRadius: '12px',
    backgroundColor: '#1e293b',
    border: '1px solid #475569',
    color: '#94a3b8',
    textTransform: 'lowercase',
    fontWeight: '600',
  },
  adminBadge: {
    fontSize: '0.75rem',
    padding: '2px 8px',
    borderRadius: '12px',
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    border: '1px solid #6366f1',
    color: '#a5b4fc',
    textTransform: 'lowercase',
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#334155',
    color: '#f8fafc',
    border: '1px solid #475569',
    borderRadius: '6px',
    padding: '6px 14px',
    fontSize: '0.85rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s, border-color 0.2s',
  },
};

export default Navbar;
