import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
//import { FlashMessageProvider } from './context/FlashMessageContext';
import { Provider } from "./components/ui/provider"
createRoot(document.getElementById('root')).render(
  <StrictMode>
           <Provider> <App /></Provider>
     
   
  
  </StrictMode>,
)
