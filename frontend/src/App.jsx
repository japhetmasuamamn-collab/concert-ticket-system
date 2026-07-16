import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Vente from './pages/Vente';
import AdminDashboard from './pages/AdminDashboard';
// 1. IMPORTATION DU COMPOSANT PUBLIC
import TicketPublic from './pages/TicketPublic'; 

// Version simplifiée pour débloquer l'écran blanc
const RouteProtegee = ({ children }) => {
  const agentId = localStorage.getItem('agent_id');
  if (!agentId) {
    return <Navigate to="/" replace />;
  }
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        
        <Route 
          path="/vente" 
          element={
            <RouteProtegee>
              <Vente />
            </RouteProtegee>
          } 
        />
        
        <Route 
          path="/admin" 
          element={
            <RouteProtegee>
              <AdminDashboard />
            </RouteProtegee>
          } 
        />

        {/* 2. AJOUT DE LA ROUTE PUBLIQUE POUR LE CLIENT (Pas de RouteProtegee ici) */}
        <Route path="/ticket/:codeUnique" element={<TicketPublic />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;