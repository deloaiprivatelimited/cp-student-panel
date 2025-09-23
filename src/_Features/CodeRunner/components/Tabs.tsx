import React from 'react';

interface TabsProps {
  children: React.ReactNode;
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

interface TabsTriggerProps {
  children: React.ReactNode;
  value: string;
  className?: string;
  style?: React.CSSProperties;
}

interface TabsContentProps {
  children: React.ReactNode;
  value: string;
  className?: string;
  style?: React.CSSProperties;
}

const TabsContext = React.createContext<{
  value: string;
  onValueChange: (value: string) => void;
}>({
  value: '',
  onValueChange: () => {},
});

export function Tabs({ children, defaultValue, value, onValueChange, className = '' }: TabsProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
   
  const currentValue = value !== undefined ? value : internalValue;
  const handleValueChange = onValueChange || setInternalValue;

  return (
    <TabsContext.Provider value={{ value: currentValue, onValueChange: handleValueChange }}>
      <div className={className}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className = '' }: TabsListProps) {
  return (
    <div className={`flex border-b border-gray-700 ${className}`} style={{ backgroundColor: '#1f1f1f' }}>
      {children}
    </div>
  );
}

export function TabsTrigger({ children, value, className = '', style }: TabsTriggerProps) {
  const { value: currentValue, onValueChange } = React.useContext(TabsContext);
  const isActive = currentValue === value;

  return (
    <button
      className={`px-4 h-15 py-2 text-sm font-medium transition-colors duration-200 border-b-2 ${
        isActive
          ? 'text-[#4CA466] border-[#4CA466]'
          : 'text-gray-400 border-transparent hover:text-[#4CA466] hover:border-gray-600'
      } ${className}`}
      style={{
        backgroundColor: isActive ? '#2f2f2f' : '#1f1f1f',
        ...style
      }}
      onClick={() => onValueChange(value)}
    >
      {children}
    </button>
  );
}

export function TabsContent({ children, value, className = '', style }: TabsContentProps) {
  const { value: currentValue } = React.useContext(TabsContext);
   
  if (currentValue !== value) {
    return null;
  }

  return (
    <div 
      className={className}
      style={{ backgroundColor: '#1f1f1f', ...style }}
    >
      {children}
    </div>
  );
}