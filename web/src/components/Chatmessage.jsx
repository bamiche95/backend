import react from 'react'
import './ChatWindow';
const ChatMessage = ({  }) => {




    return (
            <div>

                <div className='messageCard'>
                <div className='messageTextheader'>
                    <span>Message text or Big emoji</span> <span className='text-muted'>menuIcon</span>
                </div>
                
                <div className='Messagefooter'>
                    <div>Emoji</div>
                    <div>time</div>
                    
                </div>


                </div>


            </div>
        
    );
}

export default ChatMessage;