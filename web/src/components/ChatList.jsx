import React, { useState, useMemo } from "react";
import {
  HStack,
  Avatar,
  defineStyle,
  Stack,
  Text,
  Image,
  Input,
  InputGroup
} from "@chakra-ui/react";
import { LuSearch } from "react-icons/lu";
import './ChatWindow.css';

const ringCss = defineStyle({
  outlineWidth: "2px",
  outlineColor: "colorPalette.500",
  outlineOffset: "2px",
  outlineStyle: "solid",
});

const ChatList = ({ conversations, onSelect, selectedUser }) => {
  const [search, setSearch] = useState("");

  const filteredConversations = useMemo(() => {
    const lower = search.toLowerCase();
    return conversations.filter(user => {
      return (
        user.firstname?.toLowerCase().includes(lower) ||
        user.lastname?.toLowerCase().includes(lower) ||
        user.username?.toLowerCase().includes(lower) ||
        user.business_name?.toLowerCase().includes(lower) ||
        user.product_title?.toLowerCase().includes(lower)
      );
    });
  }, [search, conversations]);


  //console.log("ChatList rendering");
filteredConversations.forEach(user => {
  console.log(`[${user.room_id}] unread: ${user.unread_count}, selected: ${selectedUser?.room_id === user.room_id}`);
});



  return (
    <div>
      <h5 className="mb-3">Messages</h5>
      <div className="mb-3">
        <InputGroup startElement={<LuSearch />}>
          <Input
            placeholder="Search"
            size="sm"
            variant="filled"
            borderRadius="md"
            borderWidth="1px"
            borderColor="gray.300"
            colorPalette="yellow"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </InputGroup>
      </div>

      <ul className="list-group">
        {filteredConversations.map((user) => {
          const isSelected =
            selectedUser?.userid === user.userid &&
            selectedUser?.product_id === user.product_id;

          const displayName =
            user.firstname || user.lastname
              ? `${user.firstname || ""} ${user.lastname || ""}`
              : user.business_name || "Unknown";

          const displayUsername = user.username
            ? `@${user.username}`
            : user.business_name
              ? "@business"
              : "";

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
                <HStack gap="3" justify="space-between">
                  <HStack gap="3">
                    <Avatar.Root css={ringCss} colorPalette="pink">
                      <Avatar.Fallback name={displayName} />
                      <Avatar.Image src={user.profile_picture} />
                    </Avatar.Root>
                    <Stack gap="0">
                      <Text fontWeight="medium">{displayName}</Text>
                      <Text color="fg.muted" textStyle="sm">
                        {displayUsername}
                      </Text>

                      {user.product_id && (
                        <>
                          <Text color="fg.muted" fontSize="xs">
                            🛒 Product: {user.product_title}
                          </Text>
                          <Image
                            src={user.product_image}
                            boxSize="40px"
                            borderRadius="md"
                            objectFit="cover"
                          />
                        </>
                      )}
                    </Stack>
                  </HStack>

                  {/* Show unread badge */}
                  {user.unread_count > 0 &&
                    !(selectedUser?.room_id === user.room_id) && (
                      <Text
                        bg="red.500"
                        color="white"
                        fontSize="xs"
                        px="2"
                        py="0.5"
                        borderRadius="full"
                        minW="20px"
                        textAlign="center"
                      >
                        {user.unread_count}
                      </Text>
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

export default ChatList;
