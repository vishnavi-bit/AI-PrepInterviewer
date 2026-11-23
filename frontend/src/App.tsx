import { Link, Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "./components/RequireAuth";
import { useAuth } from "./context/AuthContext";
import { InterviewConfigurationPage } from "./pages/InterviewConfiguration";
import { InterviewRoomPage } from "./pages/InterviewRoom";
import { Login } from "./pages/Login";
import { Profile } from "./pages/Profile";
import { Register } from "./pages/Register";
import { Resume } from "./pages/Resume";
import { RoleRecommendation } from "./pages/RoleRecommendation";

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
            <>
              <Link to="/resume">Resume</Link>
              <Link to="/roles">Job roles</Link>
              <Link to="/interview">Interview setup</Link>
              <Link to="/interview/room">Interview room</Link>
              <Link to="/profile">Profile</Link>
            </>
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
          <Route
            path="/resume"
            element={
              <RequireAuth>
                <Resume />
              </RequireAuth>
            }
          />
          <Route
            path="/roles"
            element={
              <RequireAuth>
                <RoleRecommendation />
              </RequireAuth>
            }
          />
          <Route
            path="/interview"
            element={
              <RequireAuth>
                <InterviewConfigurationPage />
              </RequireAuth>
            }
          />
          <Route
            path="/interview/room"
            element={
              <RequireAuth>
                <InterviewRoomPage />
              </RequireAuth>
            }
          />
          <Route path="*" element={<p>Page not found.</p>} />
        </Routes>
      </main>
    </>
  );
}
