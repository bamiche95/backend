import { Tabs } from "@chakra-ui/react"
import { LuFolder, LuSquareCheck, LuUser } from "react-icons/lu"
import DiscussionFeed from "./DiscussionFeed"
import TipFeed from "./TipFeed"
import AlertFeed from "./AlertFeed"
import QuestionFeed from "./QuestionsFeeds"


const ProfilePostTabs = ({ profileUserId, currentLoggedInUserId }) => {
  // Determine if the profile being viewed belongs to the logged-in user
  const isOwnProfile = profileUserId === currentLoggedInUserId;

  return (
    <Tabs.Root defaultValue="Discussion" variant="plain" colorPalette="orange">
      <Tabs.List bg="bg.muted" rounded="l3" p="1">
        <Tabs.Trigger value="Discussion">
          <LuUser />
          {/* Pass the profileUserId to DiscussionFeed */}
          Discussion
        </Tabs.Trigger>
        <Tabs.Trigger value="Tips">
          <LuFolder />
          Tips
        </Tabs.Trigger>
        <Tabs.Trigger value="Alerts">
          <LuSquareCheck />
          Alerts
        </Tabs.Trigger>
          <Tabs.Trigger value="Questions">
          <LuSquareCheck />
          Questions
        </Tabs.Trigger>
        <Tabs.Indicator rounded="l2" />
      </Tabs.List>
      <Tabs.Content value="Discussion">
    <DiscussionFeed profileUserId={profileUserId} isOwnProfile={isOwnProfile} />
      </Tabs.Content>
      <Tabs.Content value="Tips"><TipFeed profileUserId={profileUserId} isOwnProfile={isOwnProfile} /></Tabs.Content>
      <Tabs.Content value="Alerts">
       <AlertFeed profileUserId={profileUserId} isOwnProfile={isOwnProfile} />
      </Tabs.Content>
      <Tabs.Content value="Questions">
         <QuestionFeed profileUserId={profileUserId} isOwnProfile={isOwnProfile} />
      </Tabs.Content>
    </Tabs.Root>
  )
}

export default ProfilePostTabs;