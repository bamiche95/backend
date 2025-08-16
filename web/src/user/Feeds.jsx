// Feeds.jsx (Updated)
import React, { useState, useEffect } from 'react';

import LeftSidebar from './leftSideBar';
import RightSidebar from './RightSideBar';
import './Feeds.css';
import CreatePost from '@/user/CreatePost'; // Ensure this path is correct relative to Feeds.jsx
import DiscussionFeed from '../components/DiscussionFeed';
// import Modal from '../components/Modal'; // You will no longer need this import if CreatePost handles its own modal

import useGroupPage from '../groups/hooks/useGroupPage';
import AskLocals from '../components/AskLocals';
import AllProducts from '../components/AllProducts';
import QuestionFeed from '../components/QuestionsFeeds';
import AlertFeed from '../components/AlertFeed';
import TipFeed from '../components/TipFeed';


const Feeds = () => {
    const [activeTab, setActiveTab] = useState('for-you');
    const [isModalOpen, setIsModalOpen] = useState(false); // This state now controls if CreatePost is rendered at all
    const [postToEdit, setPostToEdit] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [posts, setPosts] = useState([]); // This state is likely for DiscussionFeed, etc.
    const [loading, setLoading] = useState(true); // This state is likely for feed loading, not CreatePost submission

    const openModal = () => {
        setIsModalOpen(true);
        setIsEditing(false);
        setPostToEdit(null);
    };

    const openEditModal = (post) => {
        setPostToEdit(post);
        setIsEditing(true);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setIsEditing(false);
        setPostToEdit(null);
    };

    // These states are only used in CreatePost, remove them from Feeds if not used elsewhere in Feeds
    const [commentText, setCommentText] = useState({});
    const [mediaFiles, setMediaFiles] = useState([]);
    const [mediaPreview, setMediaPreview] = useState([]);


    const handleTabClick = (tab) => {
        setActiveTab(tab);
    };

    const renderActiveTabContent = () => {
        switch (activeTab) {
            case 'for-you':
                return (<DiscussionFeed />);
            case 'ask-local':
                return <QuestionFeed />;
            case 'local-market':
                return <AllProducts />;
            case 'tips':
                return <TipFeed CurrentUser />;
            case 'alerts':
                return <AlertFeed />;
            default:
                return null;
        }
    };


    return (
        <div >
            <div className="container-fluid">
                <div className="row">
                    <div className="col-md-3" id="left-sidebar-container">
                        <LeftSidebar />
                    </div>

                    <div className="col-md-5 middle-column">
                        <div className="tabs d-flex justify-content-around mb-3">
                            <div className={`tab ${activeTab === 'for-you' ? 'active' : ''}`} onClick={() => handleTabClick('for-you')}>
                                <i className="bi bi-star"></i>
                                <span>For You</span>
                            </div>
                            <div className={`tab ${activeTab === 'ask-local' ? 'active' : ''}`} onClick={() => handleTabClick('ask-local')}>
                                <i className="bi bi-fire"></i>
                                <p>Ask Locals</p>
                            </div>
                            <div className={`tab ${activeTab === 'local-market' ? 'active' : ''}`} onClick={() => handleTabClick('local-market')}>
                                <i className="bi bi-person"></i>
                                <p>Local Market</p>
                            </div>
                            <div className={`tab ${activeTab === 'tips' ? 'active' : ''}`} onClick={() => handleTabClick('tips')}>
                                <i className="bi bi-clock"></i>
                                <p>Local Tips</p>
                            </div>
                            <div className={`tab ${activeTab === 'alerts' ? 'active' : ''}`} onClick={() => handleTabClick('alerts')}>
                                <i className="bi bi-clock"></i>
                                <p>Alerts</p>
                            </div>
                            <div className="tab post-tab" onClick={openModal}>
                                <i className="bi bi-plus"></i>
                                <p>Post</p>
                            </div>
                        </div>

                        {/* Render active tab content */}
                        {renderActiveTabContent()}

                    </div>

                    <div className="col-md-3" id="right-sidebar-container">
                        <RightSidebar />
                    </div>
                </div>
            </div>

            {/* Conditionally render CreatePost directly, since it contains its own Modal */}
            {isModalOpen && (
                <CreatePost
                    isOpen={isModalOpen} // Pass isOpen to CreatePost, as it will use it internally for its own Modal
                    closeModal={closeModal}
                    setPosts={setPosts} // Ensure setPosts and setLoading are handled correctly for global feed updates
                    setLoading={setLoading}
                    postToEdit={postToEdit}
                    isEditing={isEditing}
                    // You might need to specify a default postType here if it's not always 'discussion'
                    // For example, if 'Post' button can create different types:
                    // postType={determinePostTypeBasedOnContext()}
                />
            )}
        </div>
    );
};

export default Feeds;