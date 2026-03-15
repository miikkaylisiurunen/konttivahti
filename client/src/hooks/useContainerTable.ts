import { useContext } from 'react';
import {
  ContainerTableContext,
  type ContainerTableContextType,
} from '../contexts/ContainerTableContext';

export function useContainerTable(): ContainerTableContextType {
  const context = useContext(ContainerTableContext);

  if (context === undefined) {
    throw new Error('useContainerTable must be used within ContainerTableProvider');
  }

  return context;
}
