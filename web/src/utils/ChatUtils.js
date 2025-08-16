// utils/ChatUtils.js

/**
 * Generates a consistent chat room ID for a conversation between two entities.
 * The room ID is always the same regardless of the order of the participants.
 * Format: "chat_{sortedParticipant1Type}_{sortedParticipant1Id}_{sortedParticipant2Type}_{sortedParticipant2Id}"
 * @param {number} id1 - ID of the first participant (e.g., user ID, business ID).
 * @param {('user'|'business')} type1 - Type of the first participant.
 * @param {number} id2 - ID of the second participant (e.g., user ID, business ID).
 * @param {('user'|'business')} type2 - Type of the second participant.
 * @returns {string} The unique chat room ID.
 */
export const getChatRoomId = (id1, type1, id2, type2) => {
    // Ensure consistent ordering of IDs and types for predictable room ID
    const participantA = { id: id1, type: type1 };
    const participantB = { id: id2, type: type2 };

    let orderedParticipants;
    // Primary sort by type (e.g., 'business' comes before 'user') then by ID
    // This ensures that 'chat_business_X_user_Y' is always generated, not 'chat_user_Y_business_X'
    if (type1 < type2) { // e.g., 'business' < 'user' is false, 'user' < 'business' is true
        orderedParticipants = [participantA, participantB];
    } else if (type2 < type1) {
        orderedParticipants = [participantB, participantA];
    } else {
        // If types are the same, sort by ID to ensure consistency
        if (id1 < id2) {
            orderedParticipants = [participantA, participantB];
        } else {
            orderedParticipants = [participantB, participantA];
        }
    }

    // Example: chat_business_7_user_1 (if business ID is 7 and user ID is 1)
    return `chat_${orderedParticipants[0].type}_${orderedParticipants[0].id}_${orderedParticipants[1].type}_${orderedParticipants[1].id}`;
};

/**
 * Generates a consistent chat room ID for a conversation between a user and a business,
 * specifically about a particular product.
 * Format: "chat_{sortedParticipant1Type}_{sortedParticipant1Id}_{sortedParticipant2Type}_{sortedParticipant2Id}_product_{productId}"
 * @param {number} userId - The ID of the user.
 * @param {number} businessId - The ID of the business.
 * @param {number} productId - The ID of the product.
 * @returns {string} The unique product-specific chat room ID.
 */
export const getProductChatRoomId = (userId, businessId, productId) => {
    // First, get the base user-business room ID using the existing helper
    // Ensure the types are correct for getChatRoomId (user vs business)
    const baseRoomId = getChatRoomId(userId, 'user', businessId, 'business');
    // Then append the product ID to make it unique for this product
    return `${baseRoomId}_product_${productId}`;
};
