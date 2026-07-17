import React, { useState, useEffect } from 'react';
import { Calendar, Search, User, Phone, Ticket, CalendarDays, X, Loader2, Trash2, Eye } from 'lucide-react';
import axios from 'axios';
import API_BASE_URL from '../config';

const DetailsVentesAgent = ({ agent, onClose }) => {
  const [billets, setBillets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null); // Pour afficher un loader sur le billet en cours d'annulation
  
  // États pour les filtres
  const [filtreNom, setFiltreNom] = useState('');
  const [filtreDate, setFiltreDate] = useState('');

  // État pour afficher visuellement un QR Code dans une micro-modale / popover
  const [qrCodeZoom, setQrCodeZoom] = useState(null); // Contiendra le code unique sélectionné

  const chargerVentesAgent = async () => {
    if (!agent) return;
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API_BASE_URL}/api/billets/agent/${agent.id}`);
      setBillets(response.data);
    } catch (err) {
      setError("Impossible de charger l'historique des ventes de cet agent.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    chargerVentesAgent();
  }, [agent]);

  // Fonction d'annulation sécurisée
  const gererAnnulationBillet = async (ticketId, codeUnique, prixBillet) => {
    // 1. Demande de confirmation avec mot de passe de sécurité
    const motDePasse = prompt(
      `⚠️ ATTENTION : Vous allez annuler le billet ${codeUnique} (${prixBillet} USD).\n` +
      `Cette action est irréversible. Pour confirmer, saisissez le mot de passe d'annulation :`
    );

    if (!motDePasse) return; // Annulation de l'action si prompt vide ou annulé

    if (motDePasse !== "Mage2026") {
      alert("❌ Mot de passe incorrect. Annulation refusée.");
      return;
    }

    // 2. Appel API pour supprimer/annuler le billet
    setActionLoadingId(ticketId);
    try {
      // Ajuste cette URL selon la structure exacte de ton API FastAPI
      await axios.delete(`${API_BASE_URL}/api/billets/${ticketId}`);
      
      // Notification de succès
      alert(`✅ Le billet ${codeUnique} a été annulé avec succès. Les quotas et les montants ont été réajustés.`);
      
      // Rafraîchir la liste localement pour faire disparaître le billet annulé
      setBillets(prev => prev.filter(b => b.ticket_id !== ticketId));
    } catch (err) {
      const messageErreur = err.response?.data?.detail || "Une erreur est survenue lors de l'annulation.";
      alert(`❌ Échec de l'annulation : ${messageErreur}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  if (!agent) return null;

  // Filtrage dynamique côté client
  const billetsFiltres = billets.filter((b) => {
    const correspondNom = b.nom_client.toLowerCase().includes(filtreNom.toLowerCase());
    
    let correspondDate = true;
    if (filtreDate) {
      const dateAchatStr = new Date(b.date_achat).toISOString().split('T')[0];
      correspondDate = dateAchatStr === filtreDate;
    }

    return correspondNom && correspondDate;
  });

  const formaterDateHeure = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalContainer}>
        {/* Header Modal */}
        <div style={styles.modalHeader}>
          <div>
            <h3 style={styles.modalTitle}>Ventes de l'Agent : {agent.nom}</h3>
            <p style={styles.modalSubtitle}>Consultez, visualisez les QR codes ou annulez des transactions.</p>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>
            <X size={20} />
          </button>
        </div>

        {/* Barre de Filtres */}
        <div style={styles.filterBar}>
          <div style={styles.inputWrapper}>
            <Search size={16} style={styles.inputIcon} />
            <input
              type="text"
              placeholder="Rechercher un client..."
              value={filtreNom}
              onChange={(e) => setFiltreNom(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.inputWrapper}>
            <Calendar size={16} style={styles.inputIcon} />
            <input
              type="date"
              value={filtreDate}
              onChange={(e) => setFiltreDate(e.target.value)}
              style={styles.inputDate}
            />
            {filtreDate && (
              <button 
                onClick={() => setFiltreDate('')} 
                style={styles.clearDateBtn}
                title="Effacer la date"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Contenu principal */}
        <div style={styles.contentScroll}>
          {loading ? (
            <div style={styles.centerWrapper}>
              <Loader2 size={24} style={styles.spinner} />
              <span style={{ marginLeft: 8 }}>Chargement des données...</span>
            </div>
          ) : error ? (
            <div style={styles.errorAlert}>{error}</div>
          ) : billetsFiltres.length === 0 ? (
            <div style={styles.emptyState}>
              <Ticket size={36} style={{ color: '#30363d', marginBottom: 12 }} />
              <p style={{ margin: 0 }}>Aucun billet ne correspond à vos critères.</p>
            </div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Date & Heure</th>
                    <th style={styles.th}>Client</th>
                    <th style={styles.th}>Téléphone</th>
                    <th style={styles.th}>Catégorie</th>
                    <th style={styles.th}>Prix</th>
                    <th style={styles.th}>Code Unique</th>
                    <th style={styles.th} style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {billetsFiltres.map((b) => (
                    <tr key={b.ticket_id} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={styles.iconFlex}>
                          <CalendarDays size={14} style={{ color: '#ef4444' }} />
                          {formaterDateHeure(b.date_achat)}
                        </div>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.iconFlex}>
                          <User size={14} style={{ color: '#8b949e' }} />
                          <strong>{b.nom_client}</strong>
                        </div>
                      </td>
                      <td style={styles.td}>
                        {b.telephone_client ? (
                          <div style={styles.iconFlex}>
                            <Phone size={14} style={{ color: '#8b949e' }} />
                            {b.telephone_client}
                          </div>
                        ) : (
                          <span style={{ color: '#8b949e', fontStyle: 'italic' }}>N/A</span>
                        )}
                      </td>
                      <td style={styles.td}>
                        <span style={styles.badgeBillet}>{b.type_billet}</span>
                      </td>
                      <td style={styles.td}>
                        <strong style={{ color: '#22c55e' }}>{parseFloat(b.prix).toFixed(2)} USD</strong>
                      </td>
                      <td style={styles.td}>
                        <code style={styles.codeText}>{b.code_unique}</code>
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          {/* Bouton Voir QR Code */}
                          <button
                            onClick={() => setQrCodeZoom(b.code_unique)}
                            style={styles.actionBtnView}
                            title="Visualiser le QR Code"
                          >
                            <Eye size={14} />
                          </button>

                          {/* Bouton Annuler Vente */}
                          <button
                            onClick={() => gererAnnulationBillet(b.ticket_id, b.code_unique, b.prix)}
                            disabled={actionLoadingId === b.ticket_id}
                            style={styles.actionBtnDelete}
                            title="Annuler cette vente"
                          >
                            {actionLoadingId === b.ticket_id ? (
                              <Loader2 size={14} style={styles.spinner} />
                            ) : (
                              <Trash2 size={14} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* POPUP DE VISUALISATION EXPRESS DU QR CODE */}
      {qrCodeZoom && (
        <div style={styles.qrPopoverOverlay} onClick={() => setQrCodeZoom(null)}>
          <div style={styles.qrPopoverContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.qrPopoverHeader}>
              <span style={{ fontWeight: 'bold', color: '#ffffff', fontSize: '14px' }}>Aperçu Billet : {qrCodeZoom}</span>
              <button onClick={() => setQrCodeZoom(null)} style={styles.qrPopoverClose}>
                <X size={16} />
              </button>
            </div>
            <div style={styles.qrPopoverBody}>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrCodeZoom)}&color=000000`} 
                alt="QR Code" 
                style={styles.qrPopoverImage}
              />
              <span style={styles.qrPopoverTag}>✓ SCAN DE SECOURS ADMIN</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Styles enrichis et cohérents avec ton thème existant
const styles = {
  // ... Tes styles existants inchangés ...
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modalContainer: {
    backgroundColor: '#161b22',
    border: '1px solid #30363d',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '950px', // Légèrement élargi pour accueillir la nouvelle colonne d'actions
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
    animation: 'fadeIn 0.3s ease',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '20px 24px',
    borderBottom: '1px solid #30363d',
  },
  modalTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalSubtitle: {
    margin: '4px 0 0 0',
    fontSize: '13px',
    color: '#8b949e',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#8b949e',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    transition: 'color 0.2s',
  },
  filterBar: {
    display: 'flex',
    gap: '16px',
    padding: '16px 24px',
    backgroundColor: '#0d1117',
    borderBottom: '1px solid #30363d',
    flexWrap: 'wrap',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    flex: 1,
    minWidth: '200px',
  },
  inputIcon: {
    position: 'absolute',
    left: '12px',
    color: '#8b949e',
  },
  input: {
    backgroundColor: '#161b22',
    border: '1px solid #30363d',
    borderRadius: '6px',
    padding: '8px 12px 8px 36px',
    color: '#ffffff',
    fontSize: '14px',
    outline: 'none',
    width: '100%',
  },
  inputDate: {
    backgroundColor: '#161b22',
    border: '1px solid #30363d',
    borderRadius: '6px',
    padding: '8px 12px 8px 36px',
    color: '#ffffff',
    fontSize: '14px',
    outline: 'none',
    width: '100%',
    cursor: 'pointer',
  },
  clearDateBtn: {
    position: 'absolute',
    right: '10px',
    backgroundColor: '#ef4444',
    border: 'none',
    color: '#ffffff',
    fontSize: '11px',
    padding: '2px 6px',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  contentScroll: {
    overflowY: 'auto',
    padding: '24px',
    flex: 1,
  },
  centerWrapper: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px 0',
    color: '#8b949e',
  },
  spinner: {
    animation: 'spin 1s linear infinite',
  },
  errorAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid #ef4444',
    color: '#f87171',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '14px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px 0',
    color: '#8b949e',
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: '14px',
  },
  th: {
    borderBottom: '2px solid #30363d',
    padding: '12px',
    color: '#8b949e',
    fontWeight: '600',
  },
  tr: {
    borderBottom: '1px solid #30363d',
    transition: 'background-color 0.2s',
  },
  td: {
    padding: '12px',
    color: '#c9d1d9',
    verticalAlign: 'middle'
  },
  iconFlex: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  badgeBillet: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: '#ef4444',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  codeText: {
    fontFamily: 'monospace',
    color: '#8b949e',
    fontSize: '12px',
  },

  // --- NOUVEAUX STYLES POUR LES ACTIONS ET LE POPOVER QR ---
  actionBtnView: {
    backgroundColor: '#21262d',
    border: '1px solid #30363d',
    color: '#58a6ff',
    borderRadius: '6px',
    padding: '6px 10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
  actionBtnDelete: {
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    border: '1px solid rgba(248, 113, 113, 0.2)',
    color: '#f87171',
    borderRadius: '6px',
    padding: '6px 10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
  qrPopoverOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1100,
  },
  qrPopoverContent: {
    backgroundColor: '#161b22',
    border: '1px solid #30363d',
    borderRadius: '12px',
    padding: '16px',
    maxWidth: '280px',
    width: '100%',
    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
    textAlign: 'center',
  },
  qrPopoverHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '14px',
    borderBottom: '1px solid #30363d',
    paddingBottom: '8px',
  },
  qrPopoverClose: {
    background: 'none',
    border: 'none',
    color: '#8b949e',
    cursor: 'pointer',
    padding: '2px',
    display: 'flex',
  },
  qrPopoverBody: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: '#ffffff',
    padding: '20px 10px',
    borderRadius: '8px',
  },
  qrPopoverImage: {
    width: '160px',
    height: '160px',
  },
  qrPopoverTag: {
    color: '#ef4444',
    fontSize: '11px',
    fontWeight: 'bold',
    letterSpacing: '0.5px',
  }
};

export default DetailsVentesAgent;
