// Example for BusinessMessage (create this file if you don't have it)
// BusinessMessage.js
import React, { useEffect, useState, useRef } from 'react';
import { Box, TextField,  CircularProgress } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { socket } from '../user/Socket';
import { BASE_URL, getToken } from "../config";
import moment from 'moment';
import BusinessUserChatWinbdow from './BusinessUserChatWinbdow';
import {
  Button,
  CloseButton,
  Drawer,
  For,
  HStack,
  Kbd,
  Portal,Avatar, Stack, Text
} from "@chakra-ui/react"

// Utility function for generating consistent room IDs
import { getChatRoomId } from '@/utils/ChatUtils';// We'll create this below

const BusinessMessage = ({ businessId, recipientUserId, currentUser, business }) => {
 
  return (

  <HStack wrap="wrap">
      <For each={[ "md" ]}>
        {(size) => (
          <Drawer.Root key={size} size={size}>
            <Drawer.Trigger asChild>
              <Button variant="outline" size="sm">
                Message Business 
              </Button>
            </Drawer.Trigger>
            <Portal>
              <Drawer.Backdrop />
              <Drawer.Positioner>
                <Drawer.Content>
                  <Drawer.Header>
                    <Drawer.Title>{business.name}
 <Stack gap="8">
      
        <HStack key={business.id} gap="4">
          <Avatar.Root>
            <Avatar.Fallback name={business.name} />
            <Avatar.Image src={business.logo_url} />
          </Avatar.Root>
          <Stack gap="0">
            <Text fontWeight="medium">{business.name}</Text>
            <Text color="fg.muted" textStyle="sm">
              
            </Text>
          </Stack>
        </HStack>
   
    </Stack>

                    </Drawer.Title>
                  </Drawer.Header>
                  <Drawer.Body>
                   <BusinessUserChatWinbdow currentUser={currentUser} recipientUserId={recipientUserId} businessId={businessId} business={business}/>
                  </Drawer.Body>
                  
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

  );
};

export default BusinessMessage;



