import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import ClinicWorkspace from './components/ClinicWorkspace';
import PublicBookingPage from './components/PublicBookingPage';
import API from './api';

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const publicBookClinicId = params.get('book');

  const [clinic, setClinic] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('clinicflow_clinic') || 'null');
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (publicBookClinicId) return;
    const token = localStorage.getItem('clinicflow_token');
    if (token && navigator.onLine) {
      API.get('/auth/me')
        .then((res) => {
          setClinic(res.data);
          localStorage.setItem('clinicflow_clinic', JSON.stringify(res.data));
        })
        .catch(() => {
          localStorage.removeItem('clinicflow_token');
          localStorage.removeItem('clinicflow_clinic');
          setClinic(null);
        });
    }
  }, [publicBookClinicId]);

  if (publicBookClinicId) {
    return <PublicBookingPage clinicId={publicBookClinicId} />;
  }

  const handleLogout = () => {
    localStorage.removeItem('clinicflow_token');
    localStorage.removeItem('clinicflow_clinic');
    setClinic(null);
  };

  if (clinic) {
    return <ClinicWorkspace clinic={clinic} onLogout={handleLogout} />;
  }

  return <LandingPage onAuthSuccess={(c) => setClinic(c)} />;
}
