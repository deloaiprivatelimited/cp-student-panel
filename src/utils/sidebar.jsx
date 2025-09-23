// src/components/Sidebar.jsx
import React from "react";
import { Users, FileText, Globe, HelpCircle, LogOut } from "lucide-react";
import { useAuth } from "../_Features/Auth/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";


const Sidebar = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Define logout handler
  const handleLogout = () => {
    logout();           // clears auth context/session
    navigate("/login"); // redirect to login page
  };

  // Define your sidebar routes
  const navItems = [
    { label: "Students", icon: <Users />, path: "/" },
    { label: "Test", icon: <FileText />, path: "/test" },
    { label: "Global", icon: <Globe />, path: "/global" },
    { label: "My Q's", icon: <HelpCircle />, path: "/myqs" },
  ];

  return (
    <aside className="w-20 h-screen fixed left-0 top-0 bg-white shadow-lg flex flex-col items-center py-6 overflow-hidden z-20">
      {/* Logo/Brand */}
      <div className="w-10 h-10 bg-[#4CA466] rounded-lg flex items-center justify-center mb-8">
        <span className="text-white font-bold text-lg">Cp</span>
      </div>

      {/* Navigation Items */}
      <nav className="flex flex-col space-y-6 flex-1">
        {navItems.map((item) => (
          <SidebarItem
            key={item.label}
            icon={item.icon}
            label={item.label}
            active={location.pathname === item.path}
            onClick={() => navigate(item.path)}
          />
        ))}
      </nav>

      {/* Logout Button - fixed at bottom */}
      <div className="mt-auto">
        <SidebarItem icon={<LogOut />} label="Logout" onClick={handleLogout} />
      </div>
    </aside>
  );
};

const SidebarItem = ({ icon, label, active, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="flex flex-col items-center group cursor-pointer"
    >
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200
        ${active ? "bg-[#4CA466]" : "bg-gray-100 group-hover:bg-[#4CA466]"}`}
      >
        {React.cloneElement(icon, {
          className: `w-5 h-5 ${
            active ? "text-white" : "text-gray-500 group-hover:text-white"
          }`,
        })}
      </div>
      <span
        className={`text-xs mt-1 font-medium transition-colors duration-200
        ${active ? "text-[#4CA466]" : "text-gray-600 group-hover:text-[#4CA466]"}`}
      >
        {label}
      </span>
    </div>
  );
};

export default Sidebar;
