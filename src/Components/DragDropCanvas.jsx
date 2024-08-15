import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Xarrow, { useXarrow, Xwrapper } from 'react-xarrows';
import PropTypes from 'prop-types';
import debounce from 'lodash/debounce';

const ResizeHandle = ({ cardId, card, updateCardSize, setIsResizing }) => {
  const handleStart = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    const startY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
    const startWidth = card.size.width;
    const startHeight = card.size.height;

    const handleMove = (moveEvent) => {
      const currentX = moveEvent.type.includes('mouse') ? moveEvent.clientX : moveEvent.touches[0].clientX;
      const currentY = moveEvent.type.includes('mouse') ? moveEvent.clientY : moveEvent.touches[0].clientY;
      const deltaX = currentX - startX;
      const deltaY = currentY - startY;
      updateCardSize(cardId, {
        width: Math.max(100, startWidth + deltaX),
        height: Math.max(80, startHeight + deltaY)
      });
    };

    const handleEnd = () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
      setIsResizing(false);
    };

    setIsResizing(true);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove);
    document.addEventListener('touchend', handleEnd);
  };

  return (
    <div 
      className="resize-handle se" 
      onMouseDown={handleStart}
      onTouchStart={handleStart}
    />
  );
};

ResizeHandle.propTypes = {
  cardId: PropTypes.string.isRequired,
  card: PropTypes.shape({
    size: PropTypes.shape({
      width: PropTypes.number.isRequired,
      height: PropTypes.number.isRequired,
    }).isRequired,
  }).isRequired,
  updateCardSize: PropTypes.func.isRequired,
  setIsResizing: PropTypes.func.isRequired,
};

const Popup = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-content" onClick={(e) => e.stopPropagation()}>
        {children}
        <button className="close-popup" onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

Popup.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
};

const DragDropCanvas = () => {
  const [cards, setCards] = useState([]);
  const [connections, setConnections] = useState([]);
  const [connecting, setConnecting] = useState(false);
  const [connectionStart, setConnectionStart] = useState(null);
  const [isResizing, setIsResizing] = useState(false);
  const [popupContent, setPopupContent] = useState(null);
  const canvasRef = useRef(null);
  const updateXarrow = useXarrow();
  
  const debouncedUpdateXarrow = debounce(updateXarrow, 100);

  useEffect(() => {
    const handleScroll = () => debouncedUpdateXarrow();
    const currentCanvasRef = canvasRef.current;
    currentCanvasRef.addEventListener('scroll', handleScroll);
    return () => currentCanvasRef.removeEventListener('scroll', handleScroll);
  }, [debouncedUpdateXarrow]);

  const addCard = () => {
    const newCard = {
      id: `card-${Date.now()}`,
      text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
      position: { x: 0, y: 0 },
      size: { width: 200, height: 200 },
    };
    setCards([...cards, newCard]);
  };

  const updateCardPosition = (id, position) => {
    setCards(cards.map(card => 
      card.id === id ? { ...card, position } : card
    ));
    debouncedUpdateXarrow();
  };

  const updateCardSize = (id, size) => {
    setCards(cards.map(card =>
      card.id === id ? {
        ...card,
        size: {
          width: Math.max(180, size.width),
          height: Math.max(190, size.height),
        }
      } : card
    ));
    debouncedUpdateXarrow();
  };

  const showPopup = (content) => {
    setPopupContent(content);
  };

  const closePopup = () => {
    setPopupContent(null);
  };

  const startConnecting = (cardId, e) => {
    e.stopPropagation();
    if (connecting) {
      if (connectionStart === cardId) {
        cancelConnecting();
      } else {
        finishConnecting(cardId);
      }
    } else {
      setConnecting(true);
      setConnectionStart(cardId);
    }
  };

  const cancelConnecting = () => {
    setConnecting(false);
    setConnectionStart(null);
  };

  const finishConnecting = (cardId) => {
    if (connectionStart && connectionStart !== cardId) {
      const existingConnection = connections.find(
        conn => (conn.start === connectionStart && conn.end === cardId) ||
                (conn.start === cardId && conn.end === connectionStart)
      );

      if (existingConnection) {
        setConnections(connections.filter(conn => conn !== existingConnection));
      } else {
        setConnections([...connections, { start: connectionStart, end: cardId }]);
      }
    }
    cancelConnecting();
  };

  const deleteCard = (id, e) => {
    e.stopPropagation();
    setCards(cards.filter(card => card.id !== id));
    setConnections(connections.filter(conn => conn.start !== id && conn.end !== id));
  };

  const removeConnection = (start, end) => {
    setConnections(connections.filter(conn => conn.start !== start || conn.end !== end));
  };

  return (
    <div className="canvas-container">
      <button onClick={addCard}>Add Card</button>
      <Xwrapper>
        <div className="canvas" ref={canvasRef}>
          {cards.map(card => (
            <motion.div
              key={card.id}
              id={card.id}
              className="card"
              drag={!isResizing}
              dragMomentum={false}
              onDragEnd={(e, info) => updateCardPosition(card.id, info.point)}
              style={{
                width: card.size.width,
                height: card.size.height,
                x: card.position.x,
                y: card.position.y,
              }}
            >
              <p>{`${card.text.slice(0, 50)}...`}</p>
              <button onClick={() => showPopup(card.text)}>Show More</button>
              <div className="card-buttons">
                <button onClick={(e) => startConnecting(card.id, e)}>
                  {connecting && connectionStart === card.id ? 'Cancel' : 'Connect'}
                </button>
                <button onClick={(e) => deleteCard(card.id, e)} className="delete-btn">Delete</button>
              </div>
              <ResizeHandle 
                cardId={card.id} 
                card={card} 
                updateCardSize={updateCardSize} 
                setIsResizing={setIsResizing} 
              />
            </motion.div>
          ))}
          {connections.map((connection, index) => (
            <Xarrow
              key={index}
              start={connection.start}
              end={connection.end}
              path="smooth"
              onClick={() => removeConnection(connection.start, connection.end)}
            />
          ))}
        </div>
      </Xwrapper>
      <AnimatePresence>
        {popupContent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Popup isOpen={!!popupContent} onClose={closePopup}>
              <p>{popupContent}</p>
            </Popup>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DragDropCanvas;