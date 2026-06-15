
import { Link } from "react-router-dom";
import { PlusIcon, Sun, Moon, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useState, useRef, useEffect } from "react";

const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="bg-base-300/50 backdrop-blur-sm border-b border-base-content/10 sticky top-0 z-50">
      <div className="mx-auto max-w-6xl p-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link
            to="/"
            // className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent font-mono tracking-tight hover:opacity-80 transition-opacity"
            className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-sky-400 bg-clip-text text-transparent font-mono tracking-tight hover:opacity-80 transition-opacity"
          >
            ThinkBoard
          </Link>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2">
                <Link 
                  to="/create" 
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  <PlusIcon size={16} />
                  <span>New Note</span>
                </Link>
                <button
                  onClick={logout}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-850 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors"
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link 
                  to="/login" 
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <PlusIcon className="size-5" />
                  <span>New Note</span>
                </Link>

                {/* User Avatar with Dropdown */}
                <div className="relative ml-5" ref={dropdownRef}>
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}

                    className={`
                        w-11 h-11 rounded-full
                         bg-gradient-to-r from-blue-600 to-sky-400
                       text-white font-bold text-lg flex items-center justify-center
                        shadow-lg hover:scale-105 hover:shadow-xl
                         transition-all duration-300 focus:outline-none focus:ring-3 focus:ring-primary/50
                           ${isDropdownOpen ? 'ring-2 ring-primary scale-105' : ''}
                      `}
                  >
                    {getFirstLetter()}
                  </button>

                  {/* Dropdown Menu - Beautiful Design */}
                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-3 w-72 bg-base-100 rounded-2xl shadow-2xl border border-base-200/50 backdrop-blur-sm animate-in fade-in zoom-in duration-200 z-50">
                      {/* User Info Section */}
                      <div className="p-5 border-b border-base-200/50">
                        <div className="flex items-center gap-3">
                          {/* Small Avatar in dropdown */}
                          <div className={`
                            w-12 h-12 rounded-full bg-gradient-to-r ${getAvatarColor()} 
                            text-white font-bold text-xl flex items-center justify-center shadow-md
                          `}>
                            {getFirstLetter()}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-base-content text-lg">
                              {user?.name || "User"}
                            </p>
                            <p className="text-sm text-base-content/60 mt-0.5">
                              {user?.email}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="p-2">
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-3 px-4 py-3 w-full text-left text-error rounded-xl hover:bg-error/10 transition-all duration-200 group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-error/10 flex items-center justify-center group-hover:bg-error/20 transition-colors">
                            <LogOut className="size-4" />
                          </div>
                          <span className="font-medium">Logout</span>
                        </button>
                      </div>

                      {/* Footer */}
                      <div className="px-5 pb-4 pt-1">
                        <p className="text-xs text-base-content/40 text-center">
                          Signed in as {user?.email?.split('@')[0]}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost">
                  Login
                </Link>
                <Link to="/signup" className="btn btn-primary">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;