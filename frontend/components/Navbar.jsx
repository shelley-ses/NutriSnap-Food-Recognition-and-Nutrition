import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { logoutUser, getMe } from "../services/api";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userInitial, setUserInitial] = useState("U");

  useEffect(() => {
    let active = true;
    getMe()
      .then((res) => {
        if (active && res.ok && res.data && res.data.first_name) {
          setUserInitial(res.data.first_name.charAt(0).toUpperCase());
          localStorage.setItem("nutrisnap_user_name", res.data.first_name);
        }
      })
      .catch((err) => console.error(err));

    const handleOutsideClick = () => setDropdownOpen(false);
    window.addEventListener("click", handleOutsideClick);

    return () => {
      active = false;
      window.removeEventListener("click", handleOutsideClick);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.error("Logout request failed:", err);
    }
    localStorage.removeItem("nutrisnap_logged_in");
    localStorage.removeItem("nutrisnap_user_name");
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="w-full border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-50 font-poppins shadow-sm flex justify-center select-none">
      <div className="w-full max-w-[1200px] px-6 md:px-10 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <Link to="/" className="font-unbounded font-black text-xl text-primary tracking-tight">
            NUTRISNAP
          </Link>
        </div>

        <div className="flex items-center gap-6">
          <Link
            to="/daily-log"
            className={`text-sm font-semibold tracking-wide transition-colors duration-200 ${
              isActive("/daily-log")
                ? "text-primary border-b-2 border-primary pb-1"
                : "text-slate-600 hover:text-primary pb-1"
            }`}
          >
            Daily Log
          </Link>
          <Link
            to="/camera"
            className={`text-sm font-semibold tracking-wide transition-colors duration-200 ${
              isActive("/camera")
                ? "text-primary border-b-2 border-primary pb-1"
                : "text-slate-600 hover:text-primary pb-1"
            }`}
          >
            Camera
          </Link>
          <Link
            to="/saved-meals"
            className={`text-sm font-semibold tracking-wide transition-colors duration-200 ${
              isActive("/saved-meals")
                ? "text-primary border-b-2 border-primary pb-1"
                : "text-slate-600 hover:text-primary pb-1"
            }`}
          >
            Saved Meals
          </Link>

          {/* Profile Dropdown Trigger */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-10 h-10 rounded-full bg-[var(--app-color-surface)] border border-slate-200 text-[var(--app-color-primary-dark)] font-extrabold flex items-center justify-center cursor-pointer hover:border-[var(--app-color-primary)] active:scale-95 transition-all text-sm uppercase outline-none"
            >
              {userInitial}
            </button>
            
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-xl py-2 z-50 font-poppins text-xs">
                <Link
                  to="/profile"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-3 text-slate-700 hover:bg-slate-50 font-bold transition-colors cursor-pointer border-none"
                  style={{ textDecoration: 'none' }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-4 h-4 text-slate-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                  </svg>
                  Profile Settings
                </Link>
                <div className="border-t border-slate-100 my-1" />
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-rose-600 hover:bg-rose-50 font-bold transition-colors cursor-pointer text-left border-none bg-transparent outline-none text-xs"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-4 h-4 text-rose-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
