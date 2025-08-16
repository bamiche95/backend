// src/components/ShareModal.jsx
import React, { useEffect } from 'react';
import {
    Button,
    Input,
    HStack,
    VStack,
 For,
    Text,
    useClipboard, // This hook is still from @chakra-ui/react
    // Remove 'useToast'
    // Import Dialog components from the correct source (already done based on previous steps)
    Portal,
    Dialog,
    CloseButton,
    Clipboard, IconButton, InputGroup
} from '@chakra-ui/react'; // Assuming common Chakra UI components are still here

// Import the 'toaster' object from your toaster.jsx file
import { toaster} from '@/components/ui/toaster'; // ADJUST THIS PATH TO YOUR ACTUAL toaster.jsx LOCATION
import { Tooltip } from '@/components/ui/tooltip'
import {
    FaCopy,
    FaFacebook,
    FaEnvelope,
    FaWhatsapp,
    FaTwitter,
} from 'react-icons/fa';

const ShareModal = ({ isOpen, onClose, postUrl, postTitle = "Check out this post!" }) => {
    const { onCopy, hasCopied } = useClipboard(postUrl);

    const ClipboardIconButton = () => {
  return (
    <Clipboard.Trigger asChild>
      <IconButton variant="surface" size="xs" me="-2">
        <Clipboard.Indicator />
      </IconButton>
    </Clipboard.Trigger>
  )
}

    useEffect(() => {
        if (hasCopied) {
            // Use the imported 'toaster' object to show the toast
            toaster.success({
                title: "Link copied!",
                description: "The post URL has been copied to your clipboard.",
                duration: 2000,
                // The 'closable' property is handled by your Toaster component's render logic
                // based on toast.meta.closable. You can pass it like this:
                meta: { closable: true },
            });
        }
    }, [hasCopied]); // No 'toast' dependency needed anymore

    const handleShareFacebook = () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`, '_blank');
    };

    const handleShareTwitter = () => {
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(postTitle)}`, '_blank');
    };

    const handleShareWhatsApp = () => {
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(postTitle + " " + postUrl)}`, '_blank');
    };

    const handleShareEmail = () => {
        window.open(`mailto:?subject=${encodeURIComponent(postTitle)}&body=${encodeURIComponent("Check out this post: " + postUrl)}`, '_blank');
    };

    return (

         <HStack wrap="wrap" gap="4">
            <For each={[ "center" ]}>
                 {(placement) => (
        <Dialog.Root
            open={isOpen}
            onOpenChange={(details) => {
                if (!details.open) {
                    onClose();
                }
            }}
            isCentered // Assuming isCentered is a valid prop for Dialog.Root or Dialog.Positioner
            
             key={placement}
            placement={placement}
            size={"lg"}
            motionPreset="slide-in-bottom"
            >
            <Portal>
                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content
                    padding={5}
                    >
                        <Dialog.Header>
                            <Dialog.Title>Share Post</Dialog.Title>
                        </Dialog.Header>
                        <Dialog.Body>
                            <Text mb={2}>Copy link or share directly:</Text>
                            <HStack mb={4}>
                               <Clipboard.Root maxW="300px" value={postUrl}>
      <Clipboard.Label textStyle="label">Post Link</Clipboard.Label>
      <InputGroup width={'500px'} endElement={<ClipboardIconButton />}>
        <Clipboard.Input asChild>
          <Input  padding={'15px'} />
        </Clipboard.Input>
      </InputGroup>
    </Clipboard.Root>
                            </HStack>

                            <VStack spacing={3} align="stretch">
                                <Button
                                    leftIcon={<FaFacebook />}
                                    colorScheme="facebook"
                                    onClick={handleShareFacebook}
                                >
                                    Share on Facebook
                                </Button>
                                <Button
                                    leftIcon={<FaTwitter />}
                                    colorScheme="twitter"
                                    onClick={handleShareTwitter}
                                >
                                    Share on X (Twitter)
                                </Button>
                                <Button
                                    leftIcon={<FaWhatsapp />}
                                    colorScheme="whatsapp"
                                    onClick={handleShareWhatsApp}
                                >
                                    Share on WhatsApp
                                </Button>
                                <Button
                                    leftIcon={<FaEnvelope />}
                                    bg="gray.500"
                                    _hover={{ bg: 'gray.600' }}
                                    color="white"
                                    onClick={handleShareEmail}
                                >
                                    Share via Email
                                </Button>
                            </VStack>
                        </Dialog.Body>

                        <Dialog.Footer>
                            
                        </Dialog.Footer>
                        <Dialog.CloseTrigger asChild>
                            <CloseButton size="sm" />
                        </Dialog.CloseTrigger>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
        )}
</For>
        </HStack>
    );
};

export default ShareModal;