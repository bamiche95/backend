import React, { useState, useCallback, useEffect } from 'react';
import PostCard from './PostCard';
import { useFeed } from '@/hooks/useFeed';
import { getQuestions } from '../api/question';
import { useAuth } from '../context/AuthContext';
import CreatePost from '@/user/CreatePost';
import { Text, Spinner, Box, Button } from '@chakra-ui/react';
import { socket } from '@/user/socket';

function QuestionFeed({ profileUserId, isOwnProfile }) {
    const { user } = useAuth();
    const [editingPost, setEditingPost] = useState(null);
    const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
    const [isSubmittingPost, setIsSubmittingPost] = useState(false);

    const {
        posts: questions,
        loading: feedLoading,
        comments,
        setComments,
        showComments,
        commentText,
        setCommentText,
        mediaFiles,
        setMediaFiles,
        mediaPreview,
        setMediaPreview,
        toggleShowComments,
        handleGenericSubmit,
        handleDeletePost,
        handleSavePost,
        saveError,
        deletionError,
        handleLikePost,
        likeError,
        setPosts: setQuestionsInternal,
        handleLikeToggle,
        handleCommentLikeToggle,
    } = useFeed('question', getQuestions);

    // ✅ Safe filtering to prevent crash
    const filteredQuestions = profileUserId
        ? questions.filter(q => {
            if (q && q.user && q.user.userId !== undefined) {
                return Number(q.user.userId) === Number(profileUserId);
            }
            return false;
        })
        : questions;

    useEffect(() => {
        console.log('🔗 QuestionFeed Socket connected:', socket.id);

        const handleNewQuestion = (newQuestion) => {
            if (!profileUserId || (newQuestion.user && Number(newQuestion.user.userId) === Number(profileUserId))) {
                setQuestionsInternal(prevQuestions => [newQuestion, ...prevQuestions]);
            }
        };

        const handleQuestionUpdated = ({ question }) => {
            setQuestionsInternal(prev => {
                const updated = prev.map(q => (q.id === question.id || q.postId === question.id) ? question : q);
                const exists = updated.some(q => (q.id === question.id || q.postId === question.id));
                if (!exists && (!profileUserId || (question.user && Number(question.user.userId) === Number(profileUserId)))) {
                    updated.unshift(question);
                }
                return updated;
            });
        };

        const handleQuestionDeleted = ({ questionId }) => {
            setQuestionsInternal(prev => prev.filter(q => (q.id !== questionId && q.postId !== questionId)));
        };

        socket.on('newQuestion', handleNewQuestion);
        socket.on('questionUpdated', handleQuestionUpdated);
        socket.on('questionDeleted', handleQuestionDeleted);

        return () => {
            socket.off('newQuestion', handleNewQuestion);
            socket.off('questionUpdated', handleQuestionUpdated);
            socket.off('questionDeleted', handleQuestionDeleted);
        };
    }, [setQuestionsInternal, profileUserId]);

    const handleCommentsRefetchOrUpdate = useCallback(async (postIdToRefresh) => {
        try {
            console.log(`Comments for post ${postIdToRefresh} need to be re-fetched or updated.`);
        } catch (error) {
            console.error(`Error re-fetching comments for post ${postIdToRefresh}:`, error);
        }
    }, [setComments, user]);

    const handleEdit = useCallback((postId) => {
        const postToEdit = questions.find(p => p.postId === postId || p.id === postId);
        if (!postToEdit) return;
        setEditingPost(postToEdit);
        setIsCreatePostModalOpen(true);
    }, [questions]);

    // ✅ Optimistic local deletion in addition to server deletion
    const onDeleteQuestion = useCallback((postId) => {
        handleDeletePost(postId, 'question');
        setQuestionsInternal(prev => prev.filter(q => (q.id !== postId && q.postId !== postId)));
    }, [handleDeletePost, setQuestionsInternal]);

    const onSaveQuestion = useCallback((questionId, receivedPostType, isCurrentlySaved, setIsSaved) => {
        handleSavePost(questionId, 'question', isCurrentlySaved, setIsSaved);
    }, [handleSavePost]);

    const onLikeQuestion = useCallback((questionId, receivedPostType, isCurrentlyLiked, setIsLiked) => {
        handleLikePost(questionId, 'question', isCurrentlyLiked, setIsLiked);
    }, [handleLikePost]);

    // ✅ Safer loading and empty-state handling
    if (feedLoading && (!filteredQuestions || filteredQuestions.length === 0)) {
        return (
            <Box p={4} display="flex" justifyContent="center" alignItems="center" height="200px">
                <Spinner size="xl" />
                <Text ml={4}>Loading questions...</Text>
            </Box>
        );
    }

    return (
        <Box p={4}>
            {deletionError && <Text color="red.500" mb={4}>Error deleting question: {deletionError}</Text>}
            {saveError && <Text color="red.500" mb={4}>{saveError}</Text>}
            {likeError && <Text color="red.500" mb={4}>{likeError}</Text>}

            {isOwnProfile && (
                <Button onClick={() => setIsCreatePostModalOpen(true)} mb={4} colorScheme="blue">
                    Ask a New Question
                </Button>
            )}

            {isCreatePostModalOpen && (
                <CreatePost
                    isOpen={isCreatePostModalOpen}
                    postToEdit={editingPost}
                    isEditing={!!editingPost}
                    closeModal={() => {
                        setIsCreatePostModalOpen(false);
                        setEditingPost(null);
                        setIsSubmittingPost(false);
                    }}
                    groupId={null}
                    setPosts={setQuestionsInternal}
                    setLoading={setIsSubmittingPost}
                    postType="question"
                />
            )}

            {(!feedLoading && filteredQuestions && filteredQuestions.length === 0) ? (
                <Text>No questions found.</Text>
            ) : (
                filteredQuestions.map(q => (
                    <PostCard
                        key={q.postId || q.id}
                        post={{ ...q, id: q.postId || q.id, postType: 'question' }}
                        comments={comments}
                        commentText={commentText}
                        setCommentText={setCommentText}
                        mediaFiles={mediaFiles}
                        setMediaFiles={setMediaFiles}
                        mediaPreview={mediaPreview}
                        setMediaPreview={setMediaPreview}
                        showComments={showComments}
                        toggleShowComments={toggleShowComments}
                        onEdit={() => handleEdit(q.postId || q.id)}
                        //onReport={() => { console.log(`Reporting question ${q.postId || q.id}`); }}
                        onDelete={() => onDeleteQuestion(q.postId || q.id)}
                        onComment={() => toggleShowComments(q.postId || q.id)}
                        onShare={() => { console.log(`Sharing question ${q.postId || q.id}`); }}
                        onSave={onSaveQuestion}
                        onLike={onLikeQuestion}
                        onSendComment={() => handleGenericSubmit(q.postId || q.id)}
                        currentUser={user}
                        postType="question"
                        handleGenericSubmit={handleGenericSubmit}
                        professions={q.professions}
                        onCommentLikeToggle={handleCommentLikeToggle}
                        onCommentsRefetchOrUpdate={handleCommentsRefetchOrUpdate}
                    />
                ))
            )}
        </Box>
    );
}

export default QuestionFeed;
