import React from "react";
import { FiMenu, FiX, FiMessageCircle, FiPlus } from "react-icons/fi";
import { useAuthService } from "../authService";
const Header = ({ setIsOpen, onLogout, isOpen }) => {

    const { logout } = useAuthService();
  return (
    <header className="flex items-center justify-between w-full bg-[#00415a] px-4 py-3 shadow-md sticky top-0 z-50">
      {/* Hamburger Menu Left */}
      <div className="">
      <button
        onClick={() =>{
            (isOpen);
            
            setIsOpen(!isOpen)}}
        className="fixed top-4 left-4 z-50 lg:p-2 py-1 px-1 rounded-lg cursor-pointer transition duration-200"
      >
        <FiMenu className="text-2xl text-white" />
      </button>
      </div>
    


      {/* Center (optional title or logo) */}
      <div className=" text-white lg:block md:block hidden font-semibold text-4xl tracking-wide select-none">
     Medical Assistant
      </div>

      {/* Logout button Right */}
      <div>
      <button
        onClick={()=> logout()}
        className="bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-semibold px-4 py-2 rounded-md shadow-md focus:outline-none focus:ring-2 focus:ring-red-400 transition"
      >
        Logout
      </button>
      </div>
   
    </header>
  );
};

export default Header;
