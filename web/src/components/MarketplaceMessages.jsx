import React from "react";
import { Avatar, HStack, defineStyle, Stack, Text, Image, Badge } from "@chakra-ui/react";

const ringCss = defineStyle({
  outlineWidth: "2px",
  outlineColor: "colorPalette.500",
  outlineOffset: "2px",
  outlineStyle: "solid",
});

const MarketplaceMessages = ({ onSelect, selectedUser, conversations }) => {
  const productChats = conversations.filter(conv => conv.product_id);

  return (
    <div>
      <h5 className="mb-3">Product Chats</h5>
      <ul className="list-group">
        {productChats.map(chat => (
          <li
            key={`${chat.userid}-${chat.product_id}`}
            className={`list-group-item list-group-item-action mb-3 border ${
              selectedUser?.userid === chat.userid && selectedUser?.product_id === chat.product_id ? "active" : ""
            }`}
            onClick={() => onSelect(chat)}
            style={{ cursor: "pointer" }}
          >
            <Stack gap="0">
              <HStack justify="space-between">
                <HStack gap="3" flex="1">
                  <Avatar.Root css={ringCss} colorPalette="pink">
                    <Avatar.Fallback name={chat.name} />
                    <Avatar.Image src={chat.profile_picture} />
                  </Avatar.Root>
                  <Stack gap="0" flex="1">
                    <Text fontWeight="medium">
                      {chat.firstname} {chat.lastname}
                    </Text>
                    <Text color="fg.muted" textStyle="sm">@{chat.username}</Text>
                    <Text color="fg.subtle" fontSize="xs" mt="1">{chat.product_title}</Text>
                  </Stack>
                  {chat.product_image && (
                    <Image
                      src={chat.product_image}
                      alt="product"
                      boxSize="40px"
                      borderRadius="md"
                      objectFit="cover"
                    />
                  )}
                </HStack>
                {chat.unread_count > 0 && (
                  <Badge colorScheme="red" borderRadius="full" px="2">
                    {chat.unread_count}
                  </Badge>
                )}
              </HStack>
            </Stack>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MarketplaceMessages;
