import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, Users, DollarSign, Ticket, LayoutDashboard, 
  LogOut, RefreshCw, Loader2, UserPlus, X, Search, CheckCircle2, KeyRound, HelpCircle
} from 'lucide-react';
import axios from 'axios';
import API_BASE_URL from '../config';

import DetailsVentesAgent from '../components/DetailsVentesAgent';
import ModalGestionStock from '../components/ModalGestionStock';
import ModalChangementMdp from '../components/ModalChangementMdp';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const adminNom = localStorage.getItem('agent_nom') || 'Administrateur';

  // États dynamiques (initiaux vides ou à zéro)
  const [statsGlobales, setStatsGlobales] = useState({ total_recettes: 0, total_vendus: 0, total_stock: 0 });
  const [categoriesBillets, setCategoriesBillets] = useState([]);
  const [performanceAgents, setPerformanceAgents] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // --- ÉTATS POUR L'INTERACTION ET LA MODAL AGENT ---
  const [isHoveredAgents, setIsHoveredAgents] = useState(false); 
  const [isModalOpen, setIsModalOpen] = useState(false); 
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  
  // Champs du formulaire du nouvel agent
  const [nouveauNom, setNouveauNom] = useState('');
  const [nouveauTelephone, setNouveauTelephone] = useState('');
  const [nouveauMdp, setNouveauMdp] = useState('');

  // --- NOUVEAUX ÉTATS POUR LA MODAL DES CLIENTS ---
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [listeClients, setListeClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [rechercheClient, setRechercheClient] = useState('');

  const [agentSelectionne, setAgentSelectionne] = useState(null);
  const [categoriePourStock, setCategoriePourStock] = useState(null);

  const [isMdpModalOpen, setIsMdpModalOpen] = useState(false);

  // Fonction unique de chargement de toutes les APIs en parallèle
  const chargerDonneesDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const [resStats, resCategories, resAgents] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/admin/stats`),
        axios.get(`${API_BASE_URL}/api/admin/categories`),
        axios.get(`${API_BASE_URL}/api/admin/agents`)
      ]);

      setStatsGlobales(resStats.data); 
      setCategoriesBillets(resCategories.data); 
      setPerformanceAgents(resAgents.data); 

    } catch (err) {
      setError(err.response?.data?.detail || 'Impossible de synchroniser les données du terrain.');
    } finally {
      setLoading(false);
    }
  };

  // Charger la liste des clients payés
  const chargerClientsPayes = async () => {
    setClientsLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/admin/clients-payes`);
      setListeClients(res.data);
    } catch (err) {
      console.error("Erreur lors de la récupération des clients", err);
    } finally {
      setClientsLoading(false);
    }
  };

  // Déclencheur d'ouverture de la liste des clients
  const ouvrirModalClients = () => {
    setIsClientModalOpen(true);
    chargerClientsPayes();
  };

  // Filtrage en temps réel des clients
  const clientsFiltres = listeClients.filter(client => 
    client.nom_client.toLowerCase().includes(rechercheClient.toLowerCase()) ||
    client.telephone_client.includes(rechercheClient) ||
    client.categorie_billet.toLowerCase().includes(rechercheClient.toLowerCase())
  );

  // Chargement automatique au montage du composant
  useEffect(() => {
    const role = localStorage.getItem('agent_role');
    if (role !== 'admin') {
      navigate('/');
      return;
    }
    
    chargerDonneesDashboard();
  }, [navigate]);

  const handleDeconnexion = () => {
    localStorage.clear();
    navigate('/');
  };

  // --- FONCTION DE CRÉATION DE L'AGENT ---
  const handleCreerAgent = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError('');

    try {
      await axios.post(`${API_BASE_URL}/api/admin/agents`, {
        nom: nouveauNom,
        telephone: nouveauTelephone,
        mot_de_passe: nouveauMdp
      });

      setNouveauNom('');
      setNouveauTelephone('');
      setNouveauMdp('');
      setIsModalOpen(false);

      await chargerDonneesDashboard();

    } catch (err) {
      setModalError(err.response?.data?.detail || "Une erreur est survenue lors de la création de l'agent.");
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div style={styles.body}>
      {/* HEADER */}
      <header style={styles.header}>
        <div style={styles.brandContainer}>
          <span style={styles.brandArti}>Arena BUSINESS</span>
          <span style={styles.brandSys}>Sys</span>
          <span style={styles.brandTagline}>| ESPACE ADMIN</span>
        </div>
        <div style={styles.adminInfo}>
          <span style={styles.adminNom}>👑 {adminNom}</span>
          <button onClick={chargerDonneesDashboard} style={styles.refreshBtn} title="Actualiser les données" disabled={loading}>
            <RefreshCw size={16} style={loading ? styles.spinner : {}} />
          </button>
          <button onClick={handleDeconnexion} style={styles.logoutBtn} title="Se déconnecter">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main style={styles.container}>
        {/* TITRE DE LA PAGE */}
        <div style={styles.pageHeader}>
          <div>
            <h1 style={styles.pageTitle}>
              <LayoutDashboard size={28} style={{color: '#ef4444'}} /> 
              Tableau de Bord Superviseur
            </h1>
            <p style={styles.pageSubtitle}>Suivi financier et contrôle des ventes en temps réel sur le terrain.</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            {/* BOUTON VOIR LES CLIENTS ACHETEURS */}
            <button onClick={() => setIsMdpModalOpen(true)} style={styles.secondaryActionBtn} title="Modifier mon mot de passe de sécurité">
              <KeyRound size={16} style={{ color: '#eb860d' }} /> Sécurité
            </button>
            <button onClick={ouvrirModalClients} style={styles.secondaryActionBtn}>
              <Users size={16} /> Voir les acheteurs
            </button>
            <button onClick={chargerDonneesDashboard} style={styles.actionBtn} disabled={loading}>
              {loading ? <Loader2 size={16} style={styles.spinner} /> : "Actualiser les flux"}
            </button>
          </div>
        </div>

        {error && <div style={styles.errorAlert}>{error}</div>}

        {/* CARTES DES STATS GLOBALES DYNAMIQUES */}
        <div style={styles.kpiGrid}>
          <div style={styles.kpiCard}>
            <div style={styles.kpiHeader}>
              <span style={styles.kpiTitle}>RECETTES TOTALES</span>
              <DollarSign size={20} color="#22c55e" />
            </div>
            <div style={{...styles.kpiValue, color: '#22c55e'}}>
              {Number(statsGlobales.total_recettes || 0).toLocaleString()} USD
            </div>
            <p style={styles.kpiSubText}>Fonds collectés en direct</p>
          </div>

          <div style={styles.kpiCard}>
            <div style={styles.kpiHeader}>
              <span style={styles.kpiTitle}>BILLETS VENDUS</span>
              <Ticket size={20} color="#ef4444" />
            </div>
            <div style={styles.kpiValue}>{statsGlobales.total_vendus || 0}</div>
            <p style={styles.kpiSubText}>Flux total d'acheteurs</p>
          </div>

          <div style={styles.kpiCard}>
            <div style={styles.kpiHeader}>
              <span style={styles.kpiTitle}>STOCK DISPONIBLE</span>
              <BarChart3 size={20} color="#3b82f6" />
            </div>
            <div style={styles.kpiValue}>{statsGlobales.total_stock || 0}</div>
            <p style={styles.kpiSubText}>Places restantes en vente</p>
          </div>
        </div>

        {/* SECTION PRINCIPALE */}
        <div style={styles.mainGrid}>
          
          {/* COMPTEUR PAR CATEGORIE DE BILLET */}
          <section style={styles.card}>
            <h2 style={styles.cardTitle}><Ticket size={20} color="#ef4444" /> État des Stocks & Tarifs</h2>
            <p style={styles.cardSubtitle}>Volume des ventes par catégorie de billets.</p>
            
            <div style={styles.tableResponsive}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Catégorie</th>
                    <th style={styles.th}>Prix Unit.</th>
                    <th style={styles.th}>Vendus</th>
                    <th style={styles.th}>Disponible</th>
                  </tr>
                </thead>
                <tbody>
                  {categoriesBillets.length === 0 ? (
                    <tr><td colSpan="4" style={styles.emptyTableTd}>Aucune donnée disponible</td></tr>
                  ) : (
                    categoriesBillets.map((cat) => (
                      <tr key={cat.id} style={styles.tr}>
                        <td style={{...styles.td, fontWeight: 'bold'}}>{cat.nom_type}</td>
                        <td style={styles.td}>{cat.prix} USD</td>
                        <td style={styles.td}>{cat.vendus}</td>
                        <td style={styles.td}>
                          {/* Le badge est maintenant interactif et ouvre la modal au clic */}
                          <span 
                            onClick={() => setCategoriePourStock(cat)}
                            style={{
                              ...((cat.quantite_max - cat.vendus) < 15 ? styles.badgeDanger : styles.badgeSuccess),
                              cursor: 'pointer',
                              display: 'inline-flex',
                              gap: '6px',
                              alignItems: 'center',
                              userSelect: 'none'
                            }}
                            title="Cliquer pour gérer ou ajouter du stock pour cette catégorie"
                          >
                            {cat.quantite_max - cat.vendus} / {cat.quantite_max}
                            <span style={{ fontSize: '11px', opacity: 0.8 }}>⚙️</span>
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* FLUX DE CAISSE PAR AGENT */}
          <section 
            style={styles.card}
            onMouseEnter={() => setIsHoveredAgents(true)}
            onMouseLeave={() => setIsHoveredAgents(false)}
          >
            <div style={styles.cardHeaderWithAction}>
              <div>
                <h2 style={styles.cardTitle}><Users size={20} color="#3b82f6" /> Ventes par Agent (Terrain)</h2>
                <p style={styles.cardSubtitle}>Suivi des caisses physiques de chaque vendeur.</p>
              </div>
              
              <button 
                onClick={() => setIsModalOpen(true)}
                style={{
                  ...styles.addAgentBtn,
                  opacity: isHoveredAgents ? 1 : 0,
                  transform: isHoveredAgents ? 'translateX(0)' : 'translateX(10px)',
                  visibility: isHoveredAgents ? 'visible' : 'hidden'
                }}
                title="Ajouter un nouvel agent"
              >
                <UserPlus size={16} /> Ajouter agent
              </button>
            </div>
            
            <div style={styles.tableResponsive}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Agent Vendeur</th>
                    <th style={styles.th}>Billets Émis</th>
                    <th style={styles.th}>Caisse Attendue</th>
                  </tr>
                </thead>
                <tbody>
                  {performanceAgents.length === 0 ? (
                    <tr><td colSpan="3" style={styles.emptyTableTd}>Aucun agent actif détecté</td></tr>
                  ) : (
                    performanceAgents.map((agent) => (
                      <tr key={agent.id} style={styles.tr}>
                         <td 
                            style={{ cursor: 'pointer', color: '#ef4444' }} 
                            onClick={() => setAgentSelectionne(agent)}
                          >
                            {agent.nom}
                          </td>
                        <td style={styles.td}>{agent.billets_vendus} billets</td>
                        <td style={{...styles.td, color: '#22c55e', fontWeight: '600'}}>
                          {Number(agent.total_encaisse || 0).toLocaleString()} USD
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

        </div>
      </main>

      {/* --- FENÊTRE MODAL D'AJOUT D'AGENT --- */}
      {isModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                <UserPlus size={20} style={{ color: '#3b82f6' }} /> Enregistrer un Nouvel Agent
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={styles.closeModalBtn}>
                <X size={20} />
              </button>
            </div>

            {modalError && <div style={styles.modalError}>{modalError}</div>}

            <form onSubmit={handleCreerAgent} style={styles.modalForm}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Nom complet du vendeur</label>
                <input 
                  type="text" 
                  value={nouveauNom} 
                  onChange={(e) => setNouveauNom(e.target.value)} 
                  placeholder="Ex: Christian Kabeya"
                  required
                  style={styles.input}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Numéro de Téléphone (Identifiant)</label>
                <input 
                  type="tel" 
                  value={nouveauTelephone} 
                  onChange={(e) => setNouveauTelephone(e.target.value)} 
                  placeholder="Ex: +243812345678"
                  required
                  style={styles.input}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Mot de passe d'accès</label>
                <input 
                  type="password" 
                  value={nouveauMdp} 
                  onChange={(e) => setNouveauMdp(e.target.value)} 
                  placeholder="••••••••"
                  required
                  style={styles.input}
                />
              </div>

              <div style={styles.modalActions}>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  style={styles.cancelBtn}
                  disabled={modalLoading}
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  style={styles.submitBtn}
                  disabled={modalLoading}
                >
                  {modalLoading ? <Loader2 size={16} style={styles.spinner} /> : "Créer le compte"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- NOUVELLE FENÊTRE MODAL : CLIENTS AYANT PAYÉ --- */}
      {isClientModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={{...styles.modalContent, maxWidth: '850px', width: '90%'}}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                <Users size={22} style={{ color: '#ef4444' }} /> Liste des Clients (Billets Payés)
              </h3>
              <button onClick={() => setIsClientModalOpen(false)} style={styles.closeModalBtn}>
                <X size={20} />
              </button>
            </div>

            {/* Barre de recherche */}
            <div style={styles.searchBarContainer}>
              <Search size={18} style={styles.searchIcon} />
              <input 
                type="text" 
                placeholder="Rechercher par nom, téléphone, catégorie de billet..."
                value={rechercheClient}
                onChange={(e) => setRechercheClient(e.target.value)}
                style={styles.searchInput}
              />
            </div>

            {/* Corps de la liste avec défilement */}
            <div style={styles.modalScrollArea}>
              {clientsLoading ? (
                <div style={styles.modalLoadingState}>
                  <Loader2 size={32} style={styles.spinner} />
                  <p>Chargement du registre des acheteurs...</p>
                </div>
              ) : clientsFiltres.length === 0 ? (
                <div style={styles.modalEmptyState}>
                  <p>Aucun acheteur ne correspond à cette recherche.</p>
                </div>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Date d'achat</th>
                      <th style={styles.th}>Acheteur</th>
                      <th style={styles.th}>Contact</th>
                      <th style={styles.th}>Type de billet</th>
                      <th style={styles.th}>Prix</th>
                      <th style={styles.th}>Vendu par</th>
                      <th style={styles.th}>Statut Porte</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientsFiltres.map((client) => (
                      <tr key={client.billet_id} style={styles.tr}>
                        <td style={styles.td}>
                          {new Date(client.date_achat).toLocaleDateString('fr-FR', {
                            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                          })}
                        </td>
                        <td style={{...styles.td, fontWeight: 'bold', color: '#ffffff'}}>{client.nom_client}</td>
                        <td style={styles.td}>{client.telephone_client}</td>
                        <td style={styles.td}>
                          <span style={styles.clientTicketBadge}>{client.categorie_billet}</span>
                        </td>
                        <td style={{...styles.td, color: '#22c55e', fontWeight: 'bold'}}>{client.prix_paye} USD</td>
                        <td style={styles.td}>{client.vendu_par}</td>
                        <td style={styles.td}>
                          {client.statut_scan ? (
                            <span style={{...styles.badgeSuccess, display: 'inline-flex', alignItems: 'center', gap: '4px'}}>
                              <CheckCircle2 size={12} /> Scanné
                            </span>
                          ) : (
                            <span style={{...styles.badgePending, display: 'inline-flex', alignItems: 'center', gap: '4px'}}>
                              <HelpCircle size={12} /> Non scanné
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={styles.modalActions}>
              <span style={{ color: '#8b949e', fontSize: '13px', marginRight: 'auto', alignSelf: 'center' }}>
                Total : {clientsFiltres.length} acheteur(s) trouvé(s)
              </span>
              <button 
                onClick={() => setIsClientModalOpen(false)} 
                style={styles.cancelBtn}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {agentSelectionne && (
        <DetailsVentesAgent 
          agent={agentSelectionne} 
          onClose={() => setAgentSelectionne(null)} 
        />
      )}

      {categoriePourStock && (
        <ModalGestionStock 
          categorie={categoriePourStock} 
          onClose={() => setCategoriePourStock(null)} 
          onStockMisAJour={chargerDonneesDashboard} 
        />
      )}

      {/* --- AJOUT DE LA MODAL DE CHANGEMENT DE MOT DE PASSE --- */}
      {isMdpModalOpen && (
        <ModalChangementMdp onClose={() => setIsMdpModalOpen(false)} />
      )}

      <footer style={styles.footer}>
        <p>© 2026 - Panneau Superviseur Sécurisé par <strong>ArtiSys</strong>. Tous droits réservés.</p>
      </footer>
    </div>
  );
};

// --- STYLES MODERNES COMPORTANT LES AJOUTS DES RECHERCHES ET STATUTS ---
const styles = {
  body: {
    backgroundColor: '#0b0c10',
    color: '#f5f5f7',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
  },
  header: {
    backgroundColor: '#161b22',
    borderBottom: '2px solid #ef4444',
    padding: '16px 40px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandContainer: { display: 'flex', alignItems: 'center', gap: '4px' },
  brandArti: { fontSize: '22px', fontWeight: 'bold', color: '#ffffff' },
  brandSys: { fontSize: '22px', fontWeight: 'bold', color: '#ef4444' },
  brandTagline: { fontSize: '13px', color: '#8b949e', marginLeft: '8px', fontWeight: '600' },
  adminInfo: { display: 'flex', alignItems: 'center', gap: '16px' },
  adminNom: { fontSize: '14px', fontWeight: '600' },
  refreshBtn: { background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  logoutBtn: { background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  container: {
    flex: 1,
    padding: '30px 40px',
    maxWidth: '1280px',
    margin: '0 auto',
    width: '100%',
    boxSizing: 'border-box',
  },
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
  pageTitle: { fontSize: '26px', fontWeight: '800', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '12px', margin: 0 },
  pageSubtitle: { fontSize: '14px', color: '#8b949e', margin: '4px 0 0 0' },
  actionBtn: {
    backgroundColor: '#ef4444',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 18px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  secondaryActionBtn: {
    backgroundColor: 'transparent',
    color: '#ffffff',
    border: '1px solid #30363d',
    borderRadius: '8px',
    padding: '10px 18px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'background 0.2s',
    ':hover': {
      backgroundColor: '#21262d'
    }
  },
  kpiGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '30px' },
  kpiCard: { backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '12px', padding: '24px' },
  kpiHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  kpiTitle: { fontSize: '12px', fontWeight: '700', color: '#8b949e', letterSpacing: '0.5px' },
  kpiValue: { fontSize: '32px', fontWeight: '900', color: '#ffffff' },
  kpiSubText: { fontSize: '12px', color: '#8b949e', margin: '4px 0 0 0' },
  mainGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' },
  card: { backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '12px', padding: '24px', position: 'relative' },
  cardHeaderWithAction: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' },
  cardTitle: { fontSize: '18px', fontWeight: 'bold', margin: '0 0 6px 0', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' },
  cardSubtitle: { fontSize: '13px', color: '#8b949e', margin: '0 0 20px 0' },
  tableResponsive: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '12px', borderBottom: '1px solid #30363d', color: '#8b949e', fontSize: '13px', fontWeight: '600' },
  tr: { borderBottom: '1px solid #21262d' },
  td: { padding: '14px 12px', fontSize: '14px', color: '#c9d1d9' },
  emptyTableTd: { padding: '30px', textAlign: 'center', color: '#8b949e', fontSize: '14px' },
  badgeSuccess: { backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '600' },
  badgePending: { backgroundColor: 'rgba(235, 134, 13, 0.1)', color: '#eb860d', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '600' },
  badgeDanger: { backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '600' },
  errorAlert: { backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#f87171', padding: '12px', borderRadius: '8px', marginBottom: '20px' },
  footer: { backgroundColor: '#0d1117', borderTop: '1px solid #21262d', padding: '20px', textAlign: 'center', fontSize: '13px', color: '#8b949e', marginTop: '40px' },
  spinner: { animation: 'spin 1s linear infinite' },

  addAgentBtn: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(4px)'
  },
  modalContent: {
    backgroundColor: '#161b22',
    border: '1px solid #30363d',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '450px',
    padding: '24px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    borderBottom: '1px solid #21262d',
    paddingBottom: '12px'
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#ffffff',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  closeModalBtn: {
    background: 'none',
    border: 'none',
    color: '#8b949e',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    borderRadius: '4px'
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#8b949e'
  },
  input: {
    backgroundColor: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: '6px',
    padding: '10px 12px',
    fontSize: '14px',
    color: '#ffffff',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '10px',
    borderTop: '1px solid #21262d',
    paddingTop: '16px'
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    border: '1px solid #30363d',
    color: '#c9d1d9',
    borderRadius: '6px',
    padding: '8px 16px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  submitBtn: {
    backgroundColor: '#3b82f6',
    border: 'none',
    color: '#ffffff',
    borderRadius: '6px',
    padding: '8px 16px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  modalError: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid #ef4444',
    color: '#f87171',
    padding: '10px',
    borderRadius: '6px',
    fontSize: '13px',
    marginBottom: '15px'
  },

  // --- STYLES SPÉCIFIQUES POUR LA RECHERCHE DE CLIENTS ---
  searchBarContainer: {
    position: 'relative',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center'
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    color: '#8b949e'
  },
  searchInput: {
    width: '100%',
    backgroundColor: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: '8px',
    padding: '12px 12px 12px 40px',
    fontSize: '14px',
    color: '#ffffff',
    outline: 'none',
    boxSizing: 'border-box'
  },
  modalScrollArea: {
    maxHeight: '400px',
    overflowY: 'auto',
    border: '1px solid #30363d',
    borderRadius: '8px',
    backgroundColor: '#0d1117'
  },
  modalLoadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    padding: '40px',
    color: '#8b949e'
  },
  modalEmptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#8b949e',
  },
  clientTicketBadge: {
    backgroundColor: '#21262d',
    color: '#f5f5f7',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    border: '1px solid #30363d'
  }
};

export default AdminDashboard;
