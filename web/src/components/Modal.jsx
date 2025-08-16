// Modal.jsx
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Modal = ({ isOpen, onClose, title, children }) => {
  const [hasMounted, setHasMounted] = useState(false);
  const isMobile = typeof window !== 'undefined'
    ? window.matchMedia('(max-width: 768px)').matches
    : false;

  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose();
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', esc);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', esc);
    };
  }, [isOpen, onClose]);

  useEffect(() => setHasMounted(true), []);
  if (!hasMounted) return null;

 const mobileVariants = {
  hidden: { y: '100%' },              // start off-screen below
  visible: { y: 0, transition: { duration: 0.5, ease: 'easeOut' } },  // slide in slower
  exit: { y: '100%', transition: { duration: 0.4, ease: 'easeIn' } },  // slide out
};

  const desktopVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible:{ opacity: 1, scale: 1, transition: { duration: 0.35 } },
    exit:   { opacity: 0, scale: 0.9, transition: { duration: 0.25 } }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="custom-modal-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className={`custom-modal-panel ${isMobile ? 'custom-modal-mobile' : 'custom-modal-desktop'}`}
            variants={isMobile ? mobileVariants : desktopVariants}
            initial="hidden" animate="visible" exit="exit"
            drag={isMobile ? 'y' : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            onDragEnd={(e, info) => {
              if (isMobile && info.offset.y > 120) onClose();
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="custom-modal-drag-bar" />
            <div className="custom-modal-header">
              <h5>{title}</h5>
              <button className="custom-modal-close-btn" onClick={onClose}>×</button>
            </div>
            <div className="custom-modal-body">{children}</div>
          </motion.div>

          <style >{`
            .custom-modal-backdrop {
              position: fixed;
              inset: 0;
              background: rgba(0,0,0,0.5);
              z-index: 1040;
            }

            .custom-modal-panel {
              position: fixed;
              z-index: 1050;
              background: #fff;
              box-shadow: 0 0 20px rgba(0,0,0,.2);
              border-radius: 16px;
              overflow: hidden;
              display: flex;
              flex-direction: column;
            }

            /* desktop layout */
.custom-modal-desktop {
  position: fixed !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  width: 90% !important;
  max-width: 700px !important;
  max-height: 90vh !important;
  background-color: white !important;
  border-radius: 8px !important;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.2) !important;
  transition: transform 0.4s ease, opacity 0.3s ease !important;
}

.custom-modal-mobile {
  position: fixed;  /* no !important */
  left: 0;          /* override left */
  right: 0;         /* override right */
  bottom: 0;        /* override bottom */
  top: auto;        /* override top */
  width: 100%;      /* full width */
  height: 100vh;    /* full height */
  border-radius: 16px 16px 0 0;
  
  max-width: none !important;  /* no max width */
  max-height: none !important; /* no max height */
  box-shadow: none !important; /* remove shadow if needed */
}


            .custom-modal-drag-bar {
              width: 40px;
              height: 5px;
              background: #ccc;
              border-radius: 5px;
              margin: 10px auto 6px;
            }

            .custom-modal-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 0.75rem 1rem;
              border-bottom: 1px solid #eee;
            }

            .custom-modal-body {
              padding: 1rem;
              overflow-y: auto;
              max-height: calc(100vh - 120px);
            }

            .custom-modal-close-btn {
              font-size: 1.5rem;
              background: none;
              border: none;
              cursor: pointer;
              line-height: 1;
            }
          `}</style>
        </>
      )}
    </AnimatePresence>
  );
};

export default Modal;
