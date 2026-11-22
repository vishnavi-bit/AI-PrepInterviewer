import { Link, Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "./components/RequireAuth";
import { useAuth } from "./context/AuthContext";
import { Login } from "./pages/Login";
import { Profile } from "./pages/Profile";
import { Register } from "./pages/Register";

export default function App() {
  const { user } = useAuth();

  return (
    <>
      <header className="site-header">
        <Link to={user ? "/profile" : "/login"} className="brand">
          AI PrepInterviewer
        </Link>
        <nav>
          {user ? (
            <Link to="/profile">Profile</Link>
          ) : (
            <>
              <Link to="/login">Log in</Link>
              <Link to="/register">Register</Link>
            </>
          )}
        </nav>
      </header>

      <main className="page">
        <Routes>
          <Route path="/" element={<Navigate to={user ? "/profile" : "/login"} replace />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <Profile />
              </RequireAuth>
            }
          />
          <Route path="*" element={<p>Page not found.</p>} />
        </Routes>
      </main>
    </>
  );
}
