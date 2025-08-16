import React from 'react';
import {
  Box, Text, HStack, Stack, Avatar, Image, VStack,
  Input
} from '@chakra-ui/react';
import { MessageSquareText, SendHorizontal } from 'lucide-react';
import Answer from './Answer';

const CommentBlock = ({
  postId,
  comments = [],
  showComments,
  toggleComments,
  commentText,
  setCommentText,
  onSubmit,
  postType,
  user,
  placeholder = 'Write your response...'
}) => {

  return (
    <Box>
      <HStack spacing={4} mb={4}>
        <HStack spacing={1} onClick={() => toggleComments(postId, postType)} style={{ cursor: 'pointer' }}>
          <MessageSquareText size={16} />
          <Text fontSize="sm">{comments.length}</Text>
        </HStack>
      </HStack>

      {showComments && (
        comments.length > 0 ? (
          <VStack align="start" spacing={4} mb={4} px={2}>
            {comments.map(comment => (
              <Box key={comment.commentId} w="100%" p={3} borderWidth="1px" borderRadius="md">
                <HStack gap="4">
                  <Avatar.Root>
                    <Avatar.Fallback name={comment.user?.fullname || 'Anonymous'} />
                    <Avatar.Image src={comment.user?.profilePicture || '/default-profile.png'} />
                  </Avatar.Root>
                  <Stack spacing={0}>
                    <Text fontWeight="medium">{comment.user?.fullname}</Text>
                    <Text fontSize="sm" color="gray">@{comment.user?.username}</Text>
                  </Stack>
                </HStack>
                <Text mt={2}>{comment.content}</Text>

                <Answer answer={comment} postId={postId} />
              </Box>
            ))}
          </VStack>
        ) : (
          <Text color="gray" px={2} mb={4} fontStyle="italic">No comments yet. Be the first.</Text>
        )
      )}

      <Box>
        <HStack>
          <Avatar.Root>
            <Avatar.Image src={user?.profilePic || '/default-profile.png'} />
            <Avatar.Fallback name={user?.fullName || 'Anonymous'} />
          </Avatar.Root>

          <Input
            placeholder={placeholder}
            value={commentText[postId] || ''}
            onChange={(e) => setCommentText(postId, e.target.value)}
          />
        </HStack>

        <HStack>
          <SendHorizontal
            onClick={() => onSubmit(postId, commentText)}
            style={{
              cursor: commentText[postId] ? 'pointer' : 'not-allowed',
              opacity: commentText[postId] ? 1 : 0.5,
            }}
          />
        </HStack>
      </Box>
    </Box>
  );
};

export default CommentBlock;
