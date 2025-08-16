import React from 'react';

const SuggestionsNearYou = () => {
  return (
    <div style={{
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 0px 4px rgba(0, 0, 0, 0.18)',
      marginBottom: '20px'
    }}>
      <h5>Suggestions near you</h5>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex' }}>
              <img
                src="https://picsum.photos/200/300"
                alt="Suggestion 1"
                style={{
                  borderRadius: '50%',
                  marginBottom: '10px',
                  width: '80px',
                  height: '80px'
                }}
              />
              <div>
                <p style={{ marginLeft: '10px' }}>FullName</p>
                <p style={{ marginLeft: '10px' }}>Location</p>
              </div>
            </div>
            <button>Make friend</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuggestionsNearYou;
