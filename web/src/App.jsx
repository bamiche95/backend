// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './components/FlashMessage.css';
import GroupPage from './groups/GroupPage';
import CreateGroupForm from './groups/CreateGroupForm';
import GroupList from './groups/GroupList';
import Home from './pages/Home';
import Login from './pages/Login';
import { FlashMessageProvider } from './context/FlashMessageContext';
import Feeds from './user/Feeds';
import FlashMessage from './components/FlashMessage';
import { AuthProvider } from './context/AuthContext';
import RequireAuth from './components/RequireAuth';
import Profile from './user/profile';
import AuthenticatedLayout from './components/AuthenticatedLayout';
import ProductPage from './Products/ProductPage';
import ViewProduct from './Products/ViewProducts';
import EditProduct from './Products/EditProduct';
import InboxPage from './Inbox/InboxPage';
import RegistrationForm from './pages/RegistrationForm';
import ChatMessage from './components/Chatmessage';
import PostCardShowcase from './components/PostCardShowcase';
import QuestionFeed from './components/QuestionsFeeds';
import AlertFeeds from './components/AlertFeed';
import TipForm from './components/TipForm';
import TipFeed from './components/TipFeed';
import PostCard from './components/PostCard';
import DiscussionFeed from './components/DiscussionFeed';
import GroupFeed from './components/GroupFeed';
import Notifications from './components/Notifications';
import {NotificationCountProvider} from '@/context/NotificationCountContext'
import { EnvironmentProvider } from '@chakra-ui/react';
import { Toaster } from './components/ui/toaster';
import { UnreadMessageCountProvider } from '@/context/UnreadMessageCountContext';
// ---------------------- NEW COMPONENT (YOU'LL CREATE THIS) ----------------------
import PostDetailPage from './components/PostDetailPage'; // <-- Assuming you create this
import { EventsPage } from './components/EventsPage';
import BusinessDiscoveryPage from './components/BusinessDiscoveryPage';
import BusinessView from './components/BusinessView';
import MyAddressForm from './components/MyAddressForm';
// ---------------------------------------------------------------------------------

function App() {
  return (
    <Router>
      <EnvironmentProvider>
        <AuthProvider>
          <FlashMessageProvider>
             <NotificationCountProvider>
              <UnreadMessageCountProvider>
            <FlashMessage />
            <Toaster />
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/Register" element={<RegistrationForm />} />

              {/* Protected routes with shared layout */}
              <Route element={<RequireAuth />}>
                <Route element={<AuthenticatedLayout />}>
                  <Route path="/feeds" element={<Feeds />} />
                  <Route path="/groups" element={<GroupList />} />
                  <Route path="/group/:groupId" element={<GroupPage />} />
                  <Route path="/create-group" element={<CreateGroupForm />} />
                  <Route path="/profile/:userId" element={<Profile />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/sale-free" element={<ProductPage />} />
                  <Route path="/products/:id/edit" element={<EditProduct />} />
                  <Route path="/InboxPage" element={<InboxPage />} />
                  <Route path="/messageDemo" element={<ChatMessage />} />
                  <Route path="/products/:id" element={<ViewProduct />} />
                  <Route path="/postCard" element={<PostCardShowcase />} />
                  <Route path="/questions" element={<QuestionFeed />} />
                  <Route path="/alerts" element={<AlertFeeds />} />
                  <Route path="/tipform" element={<TipForm />} />
                  <Route path="/tipfeed" element={<TipFeed />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/biz" element={<BusinessDiscoveryPage />} />
                  <Route path="/business-profile/:id" element={<BusinessView />} />

                  <Route path="/address" element={<MyAddressForm/>} />





                  {/* ---------------------- UPDATED/NEW ROUTES FOR INDIVIDUAL POSTS ---------------------- */}
                  {/* General feed route */}
                  <Route path="/discussion" element={<DiscussionFeed/>} />
                  {/* Specific discussion post route */}
                  <Route path="/discussions/:postId" element={<PostDetailPage postType="discussion" />} />

                  {/* General question feed route */}
                  <Route path="/questions" element={<QuestionFeed />} />
                  {/* Specific question post route */}
                  <Route path="/questions/:postId" element={<PostDetailPage postType="question" />} />

                  {/* General alert feed route */}
                  <Route path="/alerts" element={<AlertFeeds />} />
                  {/* Specific alert post route */}
                  <Route path="/alerts/:postId" element={<PostDetailPage postType="alert" />} />

                  {/* General tip feed route */}
                  <Route path="/tipfeed" element={<TipFeed />} />
                  {/* Specific tip post route */}
                  <Route path="/tips/:postId" element={<PostDetailPage postType="tip" />} />
                  {/* ----------------------------------------------------------------------------------------- */}
                      <Route path="/events" element={<EventsPage />} />
                  <Route path="/groupfeed" element={<GroupFeed/>} />
                  <Route path="/card" element={<PostCard/>} />
                </Route>
              </Route>
            </Routes>
            </UnreadMessageCountProvider>
            </NotificationCountProvider>
          </FlashMessageProvider>
        </AuthProvider>
      </EnvironmentProvider>
    </Router>
  );
}

export default App;