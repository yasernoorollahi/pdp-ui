import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import styles from './PublicLayout.module.css';

const PublicLayout: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className={styles.publicLayout}>
      {/* Top Navigation */}
      <nav className={styles.topNav}>
        <a href="/" className={styles.navLogo}>PDP</a>

        <div className={styles.navLinks}>
          <NavLink
            to="/"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
            }
            end
          >
            Home
          </NavLink>
          <NavLink
            to="/about"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
            }
          >
            About
          </NavLink>
          <NavLink
            to="/services"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
            }
          >
            Services
          </NavLink>
          <NavLink
            to="/contact"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
            }
          >
            Contact
          </NavLink>
        </div>

        <button className={styles.loginBtn} onClick={() => navigate('/login')}>
          Sign In
        </button>
      </nav>

      <main className={styles.mainContent}>
        <Outlet />
      </main>

      <footer className={styles.siteFooter}>
        <div className={styles.footerLinks}>
          <a href="/privacy" className={styles.footerLink}>Privacy Policy</a>
          <a href="/terms" className={styles.footerLink}>Terms of Service</a>
          <a href="/contact" className={styles.footerLink}>Contact</a>
          <a href="/blog" className={styles.footerLink}>Blog</a>
        </div>
        <p>© 2024 Personal Data Platform — Empowering Your Digital Self</p>
      </footer>
    </div>
  );
};

export default PublicLayout;
