// components/UserProfileCard.jsx
import React from 'react';
import {
  Avatar,
  HStack,
  HoverCard,
  Icon,
  Link,
  Portal,
  Stack,
  Text,
} from "@chakra-ui/react"
import { LuChartLine } from "react-icons/lu"
const UserProfileCard = ({ user }) => {
  

    return (
        <HoverCard.Root size="sm">
      <HoverCard.Trigger asChild>
        <Link href={`/profile/${user.userId}`}>@{user.username}</Link>
      </HoverCard.Trigger>
      <Portal>
        <HoverCard.Positioner>
          <HoverCard.Content>
            <HoverCard.Arrow />
            <Stack gap="4" direction="row">
              <Avatar.Root>
                <Avatar.Image src={user.profilePicture} />
                <Avatar.Fallback name="Chakra UI" />
              </Avatar.Root>
              <Stack gap="3">
                <Stack gap="1">
                  <Text textStyle="sm" fontWeight="semibold">
                    {user.fullName}
                  </Text>
                  <Text textStyle="sm" color="fg.muted">
                   Location: 
                  </Text>
                </Stack>
                <HStack color="fg.subtle">
                  <Icon size="sm">
                    <LuChartLine />
                  </Icon>
                  <Text textStyle="xs">2.5M Downloads</Text>
                </HStack>
              </Stack>
            </Stack>
          </HoverCard.Content>
        </HoverCard.Positioner>
      </Portal>
    </HoverCard.Root>
    );
};

export default UserProfileCard;