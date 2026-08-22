import { Routes, Route } from 'react-router-dom';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import WelcomeGate from './components/WelcomeGate.jsx';
import Board from './pages/Board.jsx';
import PostDetail from './pages/PostDetail.jsx';
import RollingPaperDetail from './pages/RollingPaperDetail.jsx';
import UserProfile from './pages/UserProfile.jsx';
import About from './pages/About.jsx';
import Privacy from './pages/Privacy.jsx';
import Terms from './pages/Terms.jsx';
import Admin from './pages/Admin.jsx';
import SignUp from './pages/SignUp.jsx';
import SignIn from './pages/SignIn.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import UpdatePassword from './pages/UpdatePassword.jsx';
import ProfilePage from './pages/ProfilePage.jsx';

export default function App() {
  return (
    <>
      <Header />
      <WelcomeGate />
      <main>
        <Routes>
          <Route path="/" element={<Board />} />
          <Route path="/post/:id" element={<PostDetail />} />
          <Route path="/paper/:id" element={<RollingPaperDetail />} />
          <Route path="/user/:id" element={<UserProfile />} />
          <Route path="/about" element={<About />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/update-password" element={<UpdatePassword />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
