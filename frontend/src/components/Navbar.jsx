
import { Link, useNavigate } from "react-router-dom";
import { PlusIcon, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useState, useRef, useEffect } from "react";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Get first letter from user name
  const getFirstLetter = () => {
    if (user?.name) {
      return user.name.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "U";
  };

  // Get random but consistent color based on name
  const getAvatarColor = () => {
    const name = user?.name || user?.email || "User";

    const colors = [
      "from-blue-600 to-sky-400",
      "from-blue-500 to-cyan-500",
      "from-sky-500 to-blue-700",
      "from-cyan-400 to-blue-600",
      "from-blue-400 to-indigo-500",
      "from-sky-400 to-cyan-600",
      "from-blue-500 to-sky-300",
      "from-indigo-500 to-blue-500"
    ];
    const index = name.length % colors.length;
    return colors[index];
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
    setIsDropdownOpen(false);
  };

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
              <>
                {/* New Note Button */}
                <Link
                  to="/create"
                  className="btn btn-primary gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300"
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