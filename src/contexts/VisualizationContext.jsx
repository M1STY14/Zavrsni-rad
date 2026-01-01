import React, { createContext, useContext, useState } from 'react';

const VisualizationContext = createContext();

export const VisualizationProvider = ({ children }) => {
  const [cameraState, setCameraState] = useState({
    position: [0, 0, 22],
    target: [0, -2, 0],
    isTransitioning: false
  });

  const [treeData, setTreeData] = useState(null);

  const startZoomTransition = (data) => {
    // Future: trigger camera animation from home to visualizations
    // This will be implemented when adding the zoom transition feature
    setTreeData(data);
    setCameraState(prev => ({ ...prev, isTransitioning: true }));

    // Animation will use @react-spring/three to smoothly transition camera
    // from background position [0, 0, 22] to interactive position [0, 1, 18]
  };

  const resetTransition = () => {
    setCameraState(prev => ({ ...prev, isTransitioning: false }));
  };

  return (
    <VisualizationContext.Provider
      value={{
        cameraState,
        treeData,
        startZoomTransition,
        resetTransition
      }}
    >
      {children}
    </VisualizationContext.Provider>
  );
};

export const useVisualization = () => {
  const context = useContext(VisualizationContext);
  if (!context) {
    throw new Error('useVisualization must be used within a VisualizationProvider');
  }
  return context;
};
