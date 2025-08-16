import react from 'react';
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, HStack, defineStyle } from "@chakra-ui/react";

const ChatWindowHeader = ({ selectedUser, productId, productTitle, productImage, userData }) => {

  const recipient = selectedUser;
  const ringCss = defineStyle({
    outlineWidth: "2px",
    outlineColor: "colorPalette.500",
    outlineOffset: "2px",
    outlineStyle: "solid",
  })
  return (
    <div className="d-flex justify-content-between width-100 p-3">
      <Link to={`/profile/${recipient.userid}`} className="chat-recipient-link">
        <div>
          <HStack>
            <Avatar.Root css={ringCss} colorPalette="pink">
              <Avatar.Fallback name={recipient.firstname} />
              <Avatar.Image src={recipient.profile_picture} />
            </Avatar.Root>
            {recipient.firstname} {recipient.lastname}
          </HStack>
        </div>

      </Link>


      {productImage && productTitle && productId && (
        <Link to={`/products/${productId}`} className="chat-product-link">
          <div className="ChatWindowProduct">
            <img
              src={productImage}
              height="30px"
              width="30px"
              style={{ borderRadius: "23px" }}
              alt="Product"
            />
            <p title={productTitle}>
              {productTitle.length > 20 ? productTitle.slice(0, 20) + "..." : productTitle}
            </p>
          </div>

        </Link>

      )}
    </div>
  );
}

export default ChatWindowHeader;