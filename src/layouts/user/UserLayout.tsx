
import React from 'react';
import { Outlet } from 'react-router-dom';

const UserLayout: React.FC = () => {
  return (
    <div className="user-layout">
      {/* later: User Header / Sidebar */}
      <main>
        <Outlet />
      </main>
    </div>
  );
};

export default UserLayout;
