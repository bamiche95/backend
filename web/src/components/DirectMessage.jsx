import React from "react";
import {
  Avatar,
  HStack,
  defineStyle,
  Stack,
  Text,
  Badge,
} from "@chakra-ui/react";

const ringCss = defineStyle({
  outlineWidth: "2px",
  outlineColor: "colorPalette.500",
  outlineOffset: "2px",
  outlineStyle: "solid",
});

// Rename 'conversations' prop to 'directConversations' for clarity
const DirectMessage = ({ onSelect, selectedUser, conversations: directConversations }) => {
  // No need for filtering here anymore, it's done in the parent
  // const directMessages = conversations.filter(
  //   (conv) =>
  //     conv.sender_type === "user" &&
  //     conv.recipient_type === "user"
  // );

  return (
    <div>
      <h5 className="mb-3">Direct Messages</h5>
      <ul className="list-group">
        {directConversations.map((user) => { // Use directConversations directly
          const isSelected = selectedUser?.room_id === user.room_id;

          return (
            <li
              key={user.room_id}
              className={`list-group-item list-group-item-action mb-3 border ${
                isSelected ? "active" : ""
              }`}
              onClick={() => onSelect(user)}
              style={{ cursor: "pointer" }}
            >
              <Stack gap="0">
                <HStack justify="space-between">
                  <HStack gap="3">
                    <Avatar.Root css={ringCss} colorPalette="pink">
                      <Avatar.Fallback name={user.firstname + " " + user.lastname} /> {/* Use first and last name for fallback */}
                      <Avatar.Image src={user.profile_picture} />
                    </Avatar.Root>
                    <Stack gap="0">
                      <Text fontWeight="medium">
                        {user.firstname} {user.lastname}
                      </Text>
                      <Text color="fg.muted" textStyle="sm">@{user.username}</Text>
                    </Stack>
                  </HStack>
                  {user.unread_count > 0 && (
                    <Badge colorPalette="red" borderRadius="full" px="2">
                      {user.unread_count}
                    </Badge>
                  )}
                </HStack>
              </Stack>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default DirectMessage;