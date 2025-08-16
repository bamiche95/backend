"use client";

import {
  Button,
  CloseButton,
  Drawer,
  Portal,
} from "@chakra-ui/react";
import { useRef } from "react";
import ChatWindow from "./ChatWindow";

const ProductMessage = ({ recipient, currentUser, productId }) => {
  const triggerRef = useRef(null);
//console.log ('this is the recipient:', recipient);
//console.log ('this is the Current User:', currentUser);

  return (
    <Drawer.Root>
      <Drawer.Trigger asChild>
        <Button variant="outline" size="sm" ref={triggerRef}>
          Message
        </Button>
      </Drawer.Trigger>

      <Portal>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content maxWidth="100%" width="500px">
            <Drawer.Context>
              {(store) => (
                <>
                  <Drawer.Body p="0" h="100%">
                    <ChatWindow recipient={recipient} currentUser={currentUser} productId={productId} />

                  </Drawer.Body>

                  <Drawer.CloseTrigger asChild>
                    <CloseButton
                      size="sm"
                      position="absolute"
                      top="10px"
                      right="10px"
                      onClick={() => store.setOpen(false)}
                    />
                  </Drawer.CloseTrigger>
                </>
              )}
            </Drawer.Context>
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  );
};

export default ProductMessage;
