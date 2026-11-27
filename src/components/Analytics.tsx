import { useEffect } from 'react';
import { useConsent } from '../context/ConsentContext';
import { loadGa4 } from '../lib/analytics';

/** Google Analytics 4 — только после согласия на необязательные cookies */
export function Analytics() {
  const { consent } = useConsent();
  useEffect(() => {
    if (consent?.optional) loadGa4();
  }, [consent?.optional]);
  return null;
}
