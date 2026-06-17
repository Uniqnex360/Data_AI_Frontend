import { useState, useEffect } from 'react';

export function useImpersonation() {
  const [tick, setTick] = useState(0);
  
  useEffect(() => {
    const handleChange = () => setTick(t => t + 1);
    window.addEventListener('impersonation-changed', handleChange);
    return () => window.removeEventListener('impersonation-changed', handleChange);
  }, []);
  
  const impersonatedId = typeof window !== 'undefined' 
    ? localStorage.getItem('impersonated_user_id') 
    : null;
  
  return { 
    tick,              
    impersonatedId    
  };
}