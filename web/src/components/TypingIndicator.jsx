import { Box, HStack, Text } from "@chakra-ui/react";
import { motion } from "framer-motion";

const TypingIndicator = () => {
  return (
    <HStack spacing="2" alignItems="center" px="3" py="2" width="80%" bg="gray.200" rounded="lg">
      <Text fontSize="sm" color="gray.600">Typing</Text>
      <motion.div
        style={{ display: "flex", gap: "4px" }}
        animate={{ 
          opacity: [0.3, 1, 0.3], 
          y: [0, -5, 0] 
        }}
        transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
      >
        <Box bg="gray.600" rounded="full" width="8px" height="8px" />
        <Box bg="gray.600" rounded="full" width="8px" height="8px" />
        <Box bg="gray.600" rounded="full" width="8px" height="8px" />
      </motion.div>
    </HStack>
  );
};
export default TypingIndicator;