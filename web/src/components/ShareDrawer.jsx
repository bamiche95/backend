import react from 'react';
import { Icon } from "@chakra-ui/react"
import { HiHeart } from "react-icons/hi"
import {SendHorizontal, LocateFixed, ImagePlay, Ellipsis, HeartPlus, Share, MessageSquareMore} from 'lucide-react'
import {
  Button,
  CloseButton,
  Drawer,
  For,
  HStack,
  Portal,
} from "@chakra-ui/react"

const ShareDrawer = () => {
  return (
    <HStack wrap="wrap">
      <For each={["bottom"]}>
        {(placement) => (
          <Drawer.Root key={placement} placement={placement}>
            <Drawer.Trigger asChild>
              
              <Icon size="lg">
                <Share />
            </Icon>
            </Drawer.Trigger>
            <Portal>
              <Drawer.Backdrop />
              <Drawer.Positioner>
                <Drawer.Content
                  roundedTop={placement === "bottom" ? "l3" : undefined}
                
                >
                  <Drawer.Header>
                    <Drawer.Title>Share Post with Neighbours and Friends</Drawer.Title>
                  </Drawer.Header>
                  <Drawer.Body>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed
                    do eiusmod tempor incididunt ut labore et dolore magna
                    aliqua.
                  </Drawer.Body>
                  <Drawer.Footer>
                    <Drawer.ActionTrigger asChild>
                      <Button variant="outline">Cancel</Button>
                    </Drawer.ActionTrigger>
                    <Button>Save</Button>
                  </Drawer.Footer>
                  <Drawer.CloseTrigger asChild>
                    <CloseButton size="sm" />
                  </Drawer.CloseTrigger>
                </Drawer.Content>
              </Drawer.Positioner>
            </Portal>
          </Drawer.Root>
        )}
      </For>
    </HStack>
  )
}
export default ShareDrawer