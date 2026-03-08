import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../../components/layout/Sidebar/Sidebar';
import styles from './AdminLayout.module.css';

const AdminLayout: React.FC = () => {
  return (
    <div className={styles.dashboard}>
      <div className={styles.dashboardBg} />
      <Sidebar />
      <div className={styles.main}>
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;
