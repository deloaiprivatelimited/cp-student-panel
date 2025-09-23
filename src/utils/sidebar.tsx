import React, { useState } from "react";
import { Users, FileText, Globe, HelpCircle, LogOut } from "lucide-react";
import { useAuth } from "../_Features/Auth/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";

type NavItem = {
  label: string;
  icon?: React.ReactElement;
  path?: string;
  subItems?: { label: string; path: string }[];
};

const Sidebar: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // derive active path from location (single source of truth)
  const currentPath = location.pathname;

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Sidebar routes
  const navItems: NavItem[] = [
    { label: "Students", icon: <Users />, path: "/students" },
    { label: "Test", icon: <FileText />, path: "/test" },
    {
      label: "Global",
      icon: <Globe />,
      subItems: [
        { label: "MCQ's", path: "/global/mcq" },
        { label: "Rearrange", path: "/global/rearrange" },
        { label: "Coding", path: "/global/coding" },
      ],
    },
    {
      label: "My Q's",
      icon: <HelpCircle />,
      subItems: [
        { label: "MCQ's", path: "/myqs/mcq" },
        { label: "Rearrange", path: "/myqs/rearrange" },
        { label: "Coding", path: "/myqs/coding" },
      ],
    },
  ];

  return (
    <aside className="w-20 h-screen fixed left-0 top-0 bg-white shadow-xl flex flex-col items-center py-6 z-50">
      {/* Logo */}
      <div className="w-12 h-12 bg-gradient-to-br from-[#4CA466] to-[#3d8a54] rounded-xl flex items-center justify-center mb-10 shadow-lg">
        <span className="text-white font-bold text-xl">Cp</span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col space-y-8 flex-1">
        {navItems.map((item) =>
          item.subItems ? (
            <FloatingMenuItem
              key={item.label}
              item={item}
              // active if any subitem matches the current path
              active={item.subItems.some((s) => currentPath === s.path)}
              onNavigate={handleNavigation}
              activeItem={currentPath}
            />
          ) : (
            <SidebarItem
              key={item.label}
              icon={item.icon!}
              label={item.label}
              active={currentPath === item.path}
              onClick={() => handleNavigation(item.path!)}
            />
          )
        )}
      </nav>

      {/* Logout */}
      <div className="mt-auto">
        <SidebarItem
          icon={<LogOut />}
          label="Logout"
          onClick={handleLogout}
          isLogout={true}
        />
      </div>
    </aside>
  );
};

// Regular Sidebar Item
const SidebarItem: React.FC<{
  icon: React.ReactElement;
  label: string;
  active?: boolean;
  onClick: () => void;
  isLogout?: boolean;
}> = ({ icon, label, active, onClick, isLogout = false }) => {
  return (
    <div className="relative group">
      <div
        onClick={onClick}
        className="flex flex-col items-center cursor-pointer transform transition-all duration-300 hover:scale-110"
      >
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 shadow-md
          ${active
            ? "bg-gradient-to-br from-[#4CA466] to-[#3d8a54] shadow-lg"
            : isLogout
            ? "bg-gradient-to-br from-red-400 to-red-500 opacity-70 group-hover:opacity-100"
            : "bg-gray-50 group-hover:bg-gradient-to-br group-hover:from-[#4CA466] group-hover:to-[#3d8a54] group-hover:shadow-lg"
          }`}
        >
          {React.cloneElement(icon, {
            className: `w-6 h-6 transition-all duration-300 ${
              active || isLogout ? "text-white" : "text-gray-500 group-hover:text-white"
            }`,
          })}
        </div>
        <span
          className={`text-xs mt-2 font-semibold transition-all duration-300 ${
            active ? "text-[#4CA466]" : isLogout ? "text-red-500" : "text-gray-500 group-hover:text-[#4CA466]"
          }`}
        >
          {label}
        </span>
      </div>

      {/* Tooltip */}
      <div className="absolute left-20 top-1/2 transform -translate-y-1/2 bg-gray-800 text-white px-3 py-2 rounded-lg text-sm font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap shadow-xl z-50">
        {label}
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-800 rotate-45"></div>
      </div>
    </div>
  );
};

// Floating Menu Item with Hover Submenu
const FloatingMenuItem: React.FC<{
  item: NavItem;
  active: boolean;
  onNavigate: (path: string) => void;
  activeItem: string;
}> = ({ item, active, onNavigate, activeItem }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [timeoutId, setTimeoutId] = useState<number | null>(null);

  const handleMouseEnter = () => {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    const id = window.setTimeout(() => {
      setIsHovered(false);
    }, 300); // 300ms delay before hiding
    setTimeoutId(id);
  };

  return (
    <div className="relative group" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <div className="flex flex-col items-center cursor-pointer transform transition-all duration-300 hover:scale-110">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 shadow-md
          ${active
              ? "bg-gradient-to-br from-[#4CA466] to-[#3d8a54] shadow-lg"
              : `bg-gray-50 ${isHovered ? 'bg-gradient-to-br from-[#4CA466] to-[#3d8a54] shadow-lg' : 'group-hover:bg-gradient-to-br group-hover:from-[#4CA466] group-hover:to-[#3d8a54] group-hover:shadow-lg'}`
          }`}
        >
          {item.icon &&
            React.cloneElement(item.icon, {
              className: `w-6 h-6 transition-all duration-300 ${active || isHovered ? "text-white" : "text-gray-500 group-hover:text-white"}`,
            })}
        </div>
        <span
          className={`text-xs mt-2 font-semibold transition-all duration-300 ${active || isHovered ? "text-[#4CA466]" : "text-gray-500 group-hover:text-[#4CA466]"}`}
        >
          {item.label}
        </span>
      </div>

      {/* Floating Submenu */}
      <div className={`absolute left-20 top-0 bg-white rounded-2xl shadow-2xl border border-gray-100 transform transition-all duration-300 z-50 min-w-48 ${
        isHovered ? 'opacity-100 translate-x-0 pointer-events-auto' : 'opacity-0 translate-x-2 pointer-events-none'
      }`}>
        {/* Arrow */}
        <div className="absolute left-0 top-6 transform -translate-x-2 w-4 h-4 bg-white border-l border-t border-gray-100 rotate-45"></div>

        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-50">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-[#4CA466] to-[#3d8a54] rounded-lg flex items-center justify-center">
              {item.icon && React.cloneElement(item.icon, { className: "w-4 h-4 text-white" })}
            </div>
            <span className="text-sm font-bold text-gray-800">{item.label}</span>
          </div>
        </div>

        {/* Menu Items */}
        <div className="py-2">
          {item.subItems?.map((subItem) => (
            <div
              key={subItem.label}
              onClick={() => onNavigate(subItem.path)}
              className={`px-4 py-3 hover:bg-gradient-to-r hover:from-[#4CA466]/10 hover:to-[#3d8a54]/10 cursor-pointer transition-all duration-200 flex items-center space-x-3 group/item ${
                activeItem === subItem.path ? "bg-gradient-to-r from-[#4CA466]/20 to-[#3d8a54]/20" : ""
              }`}
            >
              <div className={`w-2 h-2 rounded-full transition-all duration-200 ${
                activeItem === subItem.path ? "bg-[#4CA466]" : "bg-gray-300 group-hover/item:bg-[#4CA466]"
              }`}></div>
              <span className={`text-sm font-medium transition-all duration-200 ${
                activeItem === subItem.path ? "text-[#4CA466]" : "text-gray-600 group-hover/item:text-[#4CA466]"
              }`}>
                {subItem.label}
              </span>
              {activeItem === subItem.path && (
                <div className="ml-auto w-1.5 h-1.5 bg-[#4CA466] rounded-full"></div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
