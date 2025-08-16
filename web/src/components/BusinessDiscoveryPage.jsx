import React, { useState } from 'react';
import Box from '@mui/material/Box'; // Keep MUI Box for layout, as requested
import Button from '@mui/material/Button'; // Keep MUI Button for consistency
import SidebarMenu from './SideBarMenu';
import BusinessList from './BusinessList';

// Import your new modal components
import Modal from './Modal';
import CreateBusinessModal from './CreateBusinessModal'; // Your renamed form component

const BusinessDiscoveryPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false); // State to control modal visibility

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);

  return (
    <Box
      sx={{
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between'
      }}
    >
      <Box sx={{ width: '20%' }}>
        <SidebarMenu />
      </Box>

      <Box sx={{ width: '60%' }}>
        {/* Button to open the modal */}
        <Button onClick={handleOpenModal} variant="contained" color="primary">
          Create New Business
        </Button>
        <BusinessList />
      </Box>

      <Box sx={{ width: '20%' }}>
        <Box>Groups you belong</Box>
        <Box>Sales near you</Box>
      </Box>

      {/* Render the Modal component */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Register New Business">
        <CreateBusinessModal onClose={() => setIsModalOpen(false)} isEditMode={false} />
      </Modal>
    </Box>
  );
};

export default BusinessDiscoveryPage;