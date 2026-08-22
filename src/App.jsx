import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import WelcomeGate from './components/WelcomeGate.jsx';
import RestrictionBanner from './components/RestrictionBanner.jsx';
import Board from './pages/Board.jsx';

const PostDetail = lazy(() => import('./pages/PostDetail.jsx'));
const RollingPaperDetail = lazy(() => import('./pages/RollingPaperDetail.jsx'));
const UserProfile = lazy(() => import('./pages/UserProfile.jsx'));
const About = lazy(() => import('./pages/About.jsx'));
const Privacy = lazy(() => import('./pages/Privacy.jsx'));
const Terms = lazy(() => import('./pages/Terms.jsx'));
const ContentPolicy = lazy(() => import('./pages/ContentPolicy.jsx'));
const Contact = lazy(() => import('./pages/Contact.jsx'));
const Notices = lazy(() => import('./pages/Notices.jsx'));
const Admin = lazy(() => import('./pages/Admin.jsx'));
const SignUp = lazy(() => import('./pages/SignUp.jsx'));
const SignIn = lazy(() => import('./pages/SignIn.jsx'));
const ResetPassword = lazy(() => import('./pages/ResetPassword.jsx'));
const UpdatePassword = lazy(() => import('./pages/UpdatePassword.jsx'));
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));

export default function App() {
  return (
    <>
      <Header />
      <WelcomeGate />
      <RestrictionBanner />
      <main>
        <Suspense fallback={<div className="empty">불러오는 중...</div>}>
          <Routes>
            <Route path="/" element={<Board />} />
            <Route path="/post/:id" element={<PostDetail />} />
            <Route path="/paper/:id" element={<RollingPaperDetail />} />
            <Route path="/user/:id" element={<UserProfile />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/content-policy" element={<ContentPolicy />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/notices" element={<Notices />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/update-password" element={<UpdatePassword />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
