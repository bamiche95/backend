import React from 'react';
import { Box, Image, Text } from '@chakra-ui/react';
import Masonry from 'react-masonry-css';
import { ImagePlus } from 'lucide-react';

const breakpointColumnsObj = {
  default: 4,
  700: 3,
  500: 2,
  300: 1,
};

const MediaUploadForm = ({
  mediaFiles,
  mediaPreview,
  setMediaFiles,
  setMediaPreview,
  postId
}) => {
  return (
    <Box mt={2}>
      {mediaPreview?.length > 0 && (
        <Masonry
          breakpointCols={breakpointColumnsObj}
          className="my-masonry-grid"
          columnClassName="my-masonry-grid_column"
        >
          {mediaPreview.map((url, idx) => (
            <Box key={`${postId}-${idx}-${url}`} position="relative" mb={2}>
              {url.includes('video') ? (
                <video src={url} style={{ width: '100%' }} muted loop />
              ) : (
                <Image src={url} alt={`Preview-${idx}`} style={{ width: '100%' }} />
              )}
              <Text
                position="absolute"
                top="2px"
                right="2px"
                bg="red"
                color="white"
                fontSize="xs"
                px={1}
                borderRadius="full"
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setMediaPreview(prev => prev.filter((_, i) => i !== idx));
                  setMediaFiles(prev => prev.filter((_, i) => i !== idx));
                }}
              >
                ✕
              </Text>
            </Box>
          ))}
        </Masonry>
      )}

      <label>
        <ImagePlus style={{ cursor: 'pointer' }} />
        <input
          type="file"
          accept="image/*,video/*"
          hidden
          multiple
          onChange={(e) => {
            const files = Array.from(e.target.files);
            const previews = files.map(file => URL.createObjectURL(file));
            setMediaFiles(prev => [...(prev || []), ...files]);
            setMediaPreview(prev => [...(prev || []), ...previews]);
          }}
        />
      </label>
    </Box>
  );
};

export default MediaUploadForm;
