// EventsPage.js
import { React, useState } from 'react';
import SidebarMenu from './SideBarMenu';
import EventFeed from './EventFeed';
import CreateEvent from './CreateEvent';
import { Button } from '@chakra-ui/react';

export const EventsPage = () => {
  const [eventBeingEdited, setEventBeingEdited] = useState(null);
  const [isCreateEventDialogOpen, setIsCreateEventDialogOpen] = useState(false);
  const [refreshEventFeed, setRefreshEventFeed] = useState(0); // New state to trigger EventFeed refresh

  const handleEditEvent = (event) => {
    setEventBeingEdited(event);
    setIsCreateEventDialogOpen(true);
  };

  const handleCloseCreateEventDialog = () => {
    setEventBeingEdited(null);
    setIsCreateEventDialogOpen(false);
  };

  const handleCreateNewEventClick = () => {
    setEventBeingEdited(null);
    setIsCreateEventDialogOpen(true);
  };

  // New handler to be called when an event is successfully saved
  const handleEventSaved = () => {
    // Increment the refreshEventFeed state to trigger a re-render in EventFeed
    setRefreshEventFeed(prev => prev + 1);
    handleCloseCreateEventDialog(); // Close the dialog after saving
  };

  return (
    <div style={{ display: 'flex', width: '100%' }}>
      <div style={{ width: '20%' }}>
        <SidebarMenu />
      </div>

      <div style={{ width: '50%' }}>
        <CreateEvent
          eventToEdit={eventBeingEdited}
          isOpen={isCreateEventDialogOpen}
          onClose={handleCloseCreateEventDialog}
          onEventSaved={handleEventSaved} // Pass the new handler
        />
          <Button variant="outline" size="sm" onClick={handleCreateNewEventClick}>
          Create Event
        </Button>
        <EventFeed onEditEvent={handleEditEvent} refreshKey={refreshEventFeed} /> {/* Pass refreshKey */}
        
      </div>
      <div style={{ width: '30%' }}>right</div>
    </div>
  );
};