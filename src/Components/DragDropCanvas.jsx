import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import Xarrow, { useXarrow, Xwrapper } from 'react-xarrows';
import PropTypes from 'prop-types';

const ResizeHandle = ({ cardId, card, updateCardSize, setIsResizing }) => {
  const handleMouseDown = (e) => {
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = card.size.width;
    const startHeight = card.size.height;

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      updateCardSize(cardId, {
        width: Math.max(150, startWidth + deltaX), // Minimum width
        height: Math.max(150, startHeight + deltaY) // Minimum height
      });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      setIsResizing(false);
    };

    setIsResizing(true);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div 
      className="resize-handle se" 
      onMouseDown={handleMouseDown}
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

const DragDropCanvas = () => {
    const [cards, setCards] = useState([]);
    const [connections, setConnections] = useState([]);
    const [connecting, setConnecting] = useState(false);
    const [connectionStart, setConnectionStart] = useState(null);
    const [isResizing, setIsResizing] = useState(false);
    const canvasRef = useRef(null);
    const updateXarrow = useXarrow();
  
    useEffect(() => {
      const handleScroll = () => updateXarrow();
      const currentCanvasRef = canvasRef.current;
      currentCanvasRef.addEventListener('scroll', handleScroll);
      return () => currentCanvasRef.removeEventListener('scroll', handleScroll);
    }, [updateXarrow]);

  const addCard = () => {
    const newCard = {
      id: `card-${Date.now()}`,
      text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
      position: { x: 0, y: 0 },
      size: { width: 200, height: 200 },
      showMore: false,
    };
    setCards([...cards, newCard]);
  };

  const updateCardPosition = (id, position) => {
    setCards(cards.map(card => 
      card.id === id ? { ...card, position } : card
    ));
    updateXarrow();
  };

  const updateCardSize = (id, size) => {
    setCards(cards.map(card =>
      card.id === id ? {
        ...card,
        size: {
          width: Math.max(150, size.width), // Minimum width
          height: Math.max(100, size.height), // Minimum height
        }
      } : card
    ));
    updateXarrow();
  };

  const toggleShowMore = (id) => {
    setCards(cards.map(card =>
      card.id === id ? { ...card, showMore: !card.showMore } : card
    ));
  };

  const startConnecting = (cardId, e) => {
    e.stopPropagation();
    if (connecting) {
      if (connectionStart === cardId) {
        // If the connection start card is the same as the current card, cancel the connection
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
      // Check if the connection already exists
      const existingConnection = connections.find(
        conn => (conn.start === connectionStart && conn.end === cardId) ||
                (conn.start === cardId && conn.end === connectionStart)
      );

      if (existingConnection) {
        // If the connection exists, remove it
        setConnections(connections.filter(conn => conn !== existingConnection));
      } else {
        // If the connection doesn't exist, add it
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

  return (
    <div className="canvas-container">
      <div>
        <h1>Canvas Assignment</h1>
      </div>
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
              <p>
                {card.showMore ? card.text : `${card.text.slice(0, 50)}...`}
              </p>
              <button onClick={() => toggleShowMore(card.id)}>
                {card.showMore ? 'Show Less' : 'Show More'}
              </button>
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
            />
          ))}
        </div>
      </Xwrapper>
    </div>
  );
};

export default DragDropCanvas;