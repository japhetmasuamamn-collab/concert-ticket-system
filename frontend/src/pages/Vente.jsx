import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Ticket, User, Phone, CheckCircle2, ShieldCheck, Loader2, RefreshCw, Calendar, MapPin, Award, ShoppingBag, Send } from 'lucide-react';
import axios from 'axios';
import API_BASE_URL from '../config'; 
import HistoriqueVentes from '../components/HistoriqueVentes';
import ModalChangementMdp from '../components/ModalChangementMdp';

const Vente = () => {
  const navigate = useNavigate();
  
  const agentNom = localStorage.getItem('agent_nom') || 'Agent de Vente';
  const agentId = localStorage.getItem('agent_id');

  const [typesBillets, setTypesBillets] = useState([]);
  const [loadingBillets, setLoadingBillets] = useState(true);
  const [errorBillets, setErrorBillets] = useState('');

  // États du formulaire
  const [items, setItems] = useState(''); 
  const [nomClient, setNomClient] = useState('');
  const [telephoneClient, setTelephoneClient] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [loadingVente, setLoadingVente] = useState(false);
  const [errorVente, setErrorVente] = useState('');
  const [successData, setSuccessData] = useState(null);

  const [showMdpModal, setShowMdpModal] = useState(false); // État pour ouvrir/fermer la modal

  const [refreshHistoryTrigger, setRefreshHistoryTrigger] = useState(0);

  const chargerTypesBillets = async () => {
    setLoadingBillets(true);
    setErrorBillets('');
    try {
      const response = await axios.get(`${API_BASE_URL}/api/billets/types`);
      setTypesBillets(response.data);
      if (response.data.length > 0) {
        setSelectedType(response.data[0].id.toString());
      }
    } catch (err) {
      setErrorBillets('Impossible de charger les tarifs depuis le serveur.');
    } finally {
      setLoadingBillets(false);
    }
  };

  useEffect(() => {
    chargerTypesBillets();
  }, []);

  const handleVendre = async (e) => {
    e.preventDefault();
    if (!selectedType) return;
    
    setLoadingVente(true);
    setErrorVente('');
    setSuccessData(null);

    const payload = {
      items: items || null,
      nom_client: nomClient,
      telephone_client: telephoneClient || null,
      type_billet_id: parseInt(selectedType)
    };

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/billets/vendre?agent_id=${agentId}`, 
        payload
      );
      
      const fullTypeBillet = typesBillets.find(t => t.id === parseInt(selectedType));
      
      setSuccessData({
        ...response.data,
        avantages: fullTypeBillet?.avantages || []
      });
      
      setItems(''); 
      setNomClient('');
      setTelephoneClient('');
      setRefreshHistoryTrigger(prev => prev + 1);
    } catch (err) {
      setErrorVente(err.response?.data?.detail || 'Une erreur est survenue lors de la validation du billet.');
    } finally {
      setLoadingVente(false);
    }
  };

  const formatueDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase();
  };

  const handleDeconnexion = () => {
    localStorage.clear();
    navigate('/');
  };

  // FONCTION DE GÉNÉRATION DU MESSAGE WHATSAPP DYNAMIQUE
  // FONCTION DE GÉNÉRATION DU MESSAGE WHATSAPP DYNAMIQUE
  const redirigerVersWhatsApp = () => {
    if (!successData) return;

    let telephone = successData.telephone_client || "";
    
    if (telephone.startsWith('0')) {
      telephone = '243' + telephone.substring(1);
    }

    // --- CORRECTION ICI : On force l'URL vers le serveur 1 (Backend FastAPI) ---
    const urlTrackingBillet = `https://concert-ticket-system-1.onrender.com/ticket/${successData.code_unique}`;

    // Construction du message pré-rempli
    const message = `Bonjour *${successData.nom_client}*,\n\nVoici votre billet électronique pour l'événement *${successData.evenement_titre}* du ${formatueDate(successData.evenement_date)}.\n\n🎫 *Type de billet :* ${successData.type_billet}\n📍 *Lieu :* ${successData.evenement_lieu}\n\n🔗 *Accéder à votre billet électronique :*\n${urlTrackingBillet}\n\n⚠️ *CONSIGNE DE SÉCURITÉ :*\nConservez précieusement ce lien et ce billet. Ce billet comporte un scan unique. S'il est transféré ou partagé à un tiers, l'accès pourra vous être refusé lors de l'événement.\n\nMerci pour votre confiance !`;

    // Encodage pour les espaces et caractères spéciaux d'une URL
    const messageEncode = encodeURIComponent(message);

    // Ouverture de WhatsApp
    window.open(`https://api.whatsapp.com/send?phone=${telephone}&text=${messageEncode}`, '_blank');
  };

  return (
    <div style={styles.body}>
      {/* INJECTION DES MEDIA QUERIES & ANIMATIONS POUR LE RESPONSIVE SANS CSS EXTERNE */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        /* RESPONSIVE DESIGN */
        @media (max-width: 900px) {
          .responsive-grid {
            grid-template-columns: 1fr !important;
            gap: 20px !important;
          }
          .responsive-container {
            padding: 15px 15px !important;
          }
          .responsive-header {
            padding: 12px 15px !important;
            flex-direction: column !important;
            gap: 12px !important;
            align-items: flex-start !important;
          }
          .responsive-header-info {
            width: 100% !important;
            justify-content: space-between !important;
          }
          .responsive-hero {
            padding: 20px !important;
          }
          .responsive-hero h1 {
            font-size: 24px !important;
          }
          .responsive-card {
            padding: 20px !important;
          }
          .responsive-ticket {
            flex-direction: column !important;
          }
          .responsive-ticket-left {
            width: 100% !important;
            border-right: none !important;
            border-bottom: 2px dashed #e5e7eb !important;
            padding: 20px !important;
          }
          .responsive-ticket-right {
            padding: 20px !important;
            min-height: auto !important;
          }
          .responsive-qr-container {
            position: static !important;
            margin-top: 20px !important;
            align-self: center !important;
          }
          .responsive-avantages {
            max-width: 100% !important;
          }
        }
      `}</style>

      {/* HEADER */}
      <header style={styles.header} className="responsive-header">
        <div style={styles.brandContainer}>
          <span style={styles.brandArti}>Arena BUSINESS</span>
          <span style={styles.brandSys}>Sys</span>
          <span style={styles.brandTagline}>| Art Life System</span>
        </div>
        <div style={styles.agentInfo} className="responsive-header-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={styles.avatar}>
              <User size={16} color="#ffffff" />
            </div>
            <span style={styles.agentNom}>{agentNom}</span>
          </div>
          <button onClick={handleDeconnexion} style={styles.logoutBtn} title="Se déconnecter">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main style={styles.container} className="responsive-container">
        <div style={styles.heroSection}>
          <div style={styles.heroOverlay} className="responsive-hero">
            <span style={styles.badgeLive}>CENTRALISATION ACTUELLE</span>
            <h1 style={styles.heroTitle} className="responsive-hero h1">PANNEAU DE VENTE DIRECTE</h1>
            <p style={styles.heroSubtitle}>Générez des tickets sécurisés reliés aux événements et avantages correspondants.</p>
          </div>
        </div>

        <div style={styles.grid} className="responsive-grid">
          {/* FORMULAIRE */}
          <section style={styles.card} className="responsive-card">
            <h2 style={styles.cardTitle}>
              <Ticket size={22} style={styles.titleIcon} /> Nouvelle Vente
            </h2>
            <p style={styles.cardSubtitle}>Enregistrez l'achat en direct dans la base de données.</p>

            {errorVente && <div style={styles.errorAlert}>{errorVente}</div>}

            <form onSubmit={handleVendre} style={styles.form}>
              
              <div style={styles.inputGroup}>
                <label style={styles.label}>Articles / Options</label>
                <div style={styles.inputWrapper}>
                  <ShoppingBag size={16} style={styles.inputIcon} />
                  <input
                    type="text"
                    placeholder="076"
                    value={items}
                    onChange={(e) => setItems(e.target.value)}
                    style={styles.inputWithIcon}
                  />
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Nom complet du client *</label>
                <input
                  type="text"
                  placeholder="Ex: Jean Mukendi"
                  value={nomClient}
                  onChange={(e) => setNomClient(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Téléphone du client (Optionnel - Pour WhatsApp)</label>
                <div style={styles.inputWrapper}>
                  <Phone size={16} style={styles.inputIcon} />
                  <input
                    type="tel"
                    placeholder="Ex: 0820000000"
                    value={telephoneClient}
                    onChange={(e) => setTelephoneClient(e.target.value)}
                    style={styles.inputWithIcon}
                  />
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Catégorie de Billet *</label>
                {loadingBillets ? (
                  <div style={styles.loadingWrapper}>
                    <Loader2 size={20} style={styles.spinner} />
                    <span>Chargement des tarifs...</span>
                  </div>
                ) : errorBillets ? (
                  <div style={styles.errorText}>
                    {errorBillets} 
                    <button type="button" onClick={chargerTypesBillets} style={styles.retryBtn}>
                      <RefreshCw size={14} />
                    </button>
                  </div>
                ) : (
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    style={styles.select}
                    required
                  >
                    {typesBillets.map((b) => (
                      <option key={b.id} value={b.id}>
                        🎫 Billet {b.nom_type} — {b.prix} USD
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <button type="submit" disabled={loadingVente || loadingBillets} style={styles.submitBtn}>
                {loadingVente ? <Loader2 size={20} style={styles.spinner} /> : "Générer & Enregistrer le Billet"}
              </button>
            </form>
          </section>

          {/* APERÇU BILLET DYNAMIQUE */}
          <section style={styles.card} className="responsive-card">
            {successData ? (
              <div style={styles.ticketSuccess}>
                <div style={styles.successHeader}>
                  <CheckCircle2 size={36} color="#22c55e" />
                  <h3 style={styles.successTitle}>Billet Vendu avec Succès !</h3>
                </div>

                {/* BOUTON D'ENVOI WHATSAPP DIRECT */}
                <button 
                  onClick={redirigerVersWhatsApp} 
                  style={styles.whatsappBtn}
                  disabled={!successData.telephone_client}
                  title={!successData.telephone_client ? "Veuillez renseigner un numéro de téléphone pour envoyer via WhatsApp" : ""}
                >
                  <Send size={18} style={{ marginRight: '8px' }} />
                  Envoyer le Billet via WhatsApp
                </button>

                {!successData.telephone_client && (
                  <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '-12px', marginBottom: '16px', textAlign: 'center' }}>
                    ⚠️ Aucun numéro saisi. Renseignez un numéro de téléphone à gauche pour activer l'envoi WhatsApp.
                  </p>
                )}

                <div style={styles.ticketContainer} className="responsive-ticket">
                  <div style={styles.ticketLeft} className="responsive-ticket-left">
                    <div style={styles.ticketStamp}>ARTI-SYS SECURE</div>
                    <div style={styles.ticketValue}>{successData.type_billet}</div>
                    <div style={styles.ticketPrice}>
                    {successData.prix !== undefined ? successData.prix : "?"} USD
                    </div>
                    {successData.taille_table > 1 && (
                      <div style={styles.ticketTableSize}>Table de {successData.taille_table} Pers.</div>
                    )}
                  </div>

                  <div style={styles.ticketRight} className="responsive-ticket-right">
                    <div style={styles.ticketHeader}>
                      <span style={styles.ticketEvent}>{successData.evenement_titre}</span>
                      <span style={styles.ticketDate}>
                        <Calendar size={12} style={{ marginRight: '4px' }} />
                        {formatueDate(successData.evenement_date)}
                      </span>
                      <span style={styles.ticketLocation}>
                        <MapPin size={12} style={{ marginRight: '4px' }} />
                        {successData.evenement_lieu}
                      </span>
                    </div>
                    
                    <div style={styles.ticketDetails}>
                      <div style={styles.ticketMeta}>
                        <span style={styles.metaLabel}>TITULAIRE :</span>
                        <span style={styles.metaValue}>{successData.nom_client}</span>
                      </div>
                      <div style={styles.ticketMeta}>
                        <span style={styles.metaLabel}>ID BILLET :</span>
                        <span style={styles.metaValueCode}>{successData.code_unique}</span>
                      </div>
                    </div>

                    {/* SECTION DES AVANTAGES INCLUS */}
                    {successData.avantages && successData.avantages.length > 0 && (
                      <div style={styles.avantagesContainer} className="responsive-avantages">
                        <div style={styles.avantagesTitle}>
                          <Award size={12} style={{ marginRight: '4px' }} /> AVANTAGES INCLUS :
                        </div>
                        <ul style={styles.avantagesList}>
                          {successData.avantages.map((av) => (
                            <li key={av.id} style={styles.avantageItem}>
                              • {av.description_avantage} {av.est_optionnel ? '(Optionnel)' : ''}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div style={styles.qrContainer} className="responsive-qr-container">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(successData.code_unique)}&color=000000`} 
                        alt="QR Code Billet" 
                        style={styles.qrImage}
                      />
                      <div style={styles.qrTag}>
                        <ShieldCheck size={12} color="#22c55e" /> SCAN UNIQUE
                      </div>
                    </div>
                  </div>
                </div>

                <p style={styles.printInstruction}>Le billet a été validé dans la DB. Prêt à être scanné ou imprimé.</p>
              </div>
            ) : (
              <div style={styles.emptyState}>
                <Ticket size={48} style={styles.emptyIcon} />
                <h3 style={styles.emptyTitle}>En attente de transaction</h3>
                <p style={styles.emptyText}>Remplissez le formulaire de gauche pour générer un billet officiel anti-fraude avec ses spécifications et avantages dynamiques.</p>
              </div>
            )}
          </section>

          <div style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
            <HistoriqueVentes 
                agentId={agentId} 
                refreshTrigger={refreshHistoryTrigger} 
                onReafficherTicket={(ticket) => {
                  const fullType = typesBillets.find(t => t.nom_type === ticket.type_billet);
                  setSuccessData({
                    ...ticket,
                    avantages: fullType?.avantages || []
                  });
                }} 
            />
          </div>
        </div>
      </main>

      {showMdpModal && <ModalChangementMdp onClose={() => setShowMdpModal(false)} />}
      
      <footer style={styles.footer}>
        <p>© 2026 - Conçu et Sécurisé par <strong>ArtiSys (Art Life System)</strong>. Tous droits réservés.</p>
      </footer>
    </div>
  );
};

// Styles étendus conservant l'harmonie du projet
const styles = {
  body: {
    backgroundColor: '#0b0c10',
    color: '#f5f5f7',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    backgroundColor: '#161b22',
    borderBottom: '2px solid #ef4444',
    padding: '16px 40px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'all 0.3s ease',
  },
  brandContainer: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '4px',
  },
  brandArti: {
    fontSize: '22px',
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: '1px',
  },
  brandSys: {
    fontSize: '22px',
    fontWeight: 'bold',
    color: '#ef4444',
    letterSpacing: '1px',
  },
  brandTagline: {
    fontSize: '13px',
    color: '#8b949e',
    marginLeft: '8px',
  },
  agentInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatar: {
    backgroundColor: '#ef4444',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  agentNom: {
    fontWeight: '500',
    fontSize: '14px',
  },
  logoutBtn: {
    background: 'none',
    border: 'none',
    color: '#8b949e',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    transition: 'color 0.2s, background-color 0.2s',
  },
  container: {
    flex: 1,
    padding: '30px 40px',
    maxWidth: '1280px',
    margin: '0 auto',
    width: '100%',
    boxSizing: 'border-box',
    transition: 'all 0.3s ease',
  },
  heroSection: {
    background: 'linear-gradient(135deg, #111 0%, #300 100%)',
    borderRadius: '12px',
    border: '1px solid #330000',
    marginBottom: '30px',
    overflow: 'hidden',
    position: 'relative',
  },
  heroOverlay: {
    padding: '32px',
    background: 'radial-gradient(circle at right, rgba(239, 68, 68, 0.15) 0%, transparent 70%)',
  },
  badgeLive: {
    backgroundColor: '#ef4444',
    color: '#ffffff',
    fontSize: '10px',
    fontWeight: 'bold',
    padding: '4px 8px',
    borderRadius: '4px',
    letterSpacing: '1px',
    display: 'inline-block',
    marginBottom: '12px',
  },
  heroTitle: {
    fontSize: '32px',
    fontWeight: '900',
    margin: '0 0 6px 0',
    letterSpacing: '2px',
    color: '#ffffff',
  },
  heroSubtitle: {
    fontSize: '16px',
    color: '#c9d1d9',
    margin: 0,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '30px',
  },
  card: {
    backgroundColor: '#161b22',
    border: '1px solid #30363d',
    borderRadius: '12px',
    padding: '30px',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
  },
  cardTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    margin: '0 0 6px 0',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  cardSubtitle: {
    fontSize: '14px',
    color: '#8b949e',
    margin: '0 0 24px 0',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#c9d1d9',
  },
  input: {
    backgroundColor: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: '8px',
    padding: '12px 16px',
    color: '#ffffff',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box',
    width: '100%',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: '100%',
  },
  inputIcon: {
    position: 'absolute',
    left: '14px',
    color: '#8b949e',
  },
  inputWithIcon: {
    backgroundColor: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: '8px',
    padding: '12px 16px 12px 42px',
    color: '#ffffff',
    fontSize: '15px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  select: {
    backgroundColor: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: '8px',
    padding: '12px 16px',
    color: '#ffffff',
    fontSize: '15px',
    outline: 'none',
    cursor: 'pointer',
    width: '100%',
    boxSizing: 'border-box',
  },
  submitBtn: {
    backgroundColor: '#ef4444',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '14px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: '10px',
    width: '100%',
  },
  // NOUVEAU STYLE POUR LE BOUTON WHATSAPP
  whatsappBtn: {
    backgroundColor: '#25D366',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '14px',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'background-color 0.2s, opacity 0.2s',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '20px',
    width: '100%',
    '&:disabled': {
      backgroundColor: '#1f2d24',
      color: '#8b949e',
      cursor: 'not-allowed',
      opacity: 0.6
    }
  },
  errorAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid #ef4444',
    color: '#f87171',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '20px',
  },
  loadingWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#8b949e',
    fontSize: '14px',
    padding: '12px',
  },
  errorText: {
    color: '#f87171',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  retryBtn: {
    background: 'none',
    border: 'none',
    color: '#ef4444',
    cursor: 'pointer',
  },
  spinner: {
    animation: 'spin 1s linear infinite',
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px',
    textAlign: 'center',
    border: '2px dashed #30363d',
    borderRadius: '12px',
    minHeight: '350px',
  },
  emptyIcon: {
    color: '#30363d',
    marginBottom: '16px',
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#c9d1d9',
    margin: '0 0 8px 0',
  },
  emptyText: {
    fontSize: '14px',
    color: '#8b949e',
    maxWidth: '320px',
    margin: 0,
    lineHeight: '1.5',
  },
  ticketSuccess: {
    animation: 'fadeIn 0.5s ease',
  },
  successHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '24px',
  },
  successTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#22c55e',
    margin: 0,
  },
  ticketContainer: {
    display: 'flex',
    backgroundColor: '#ffffff',
    color: '#000000',
    borderRadius: '12px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
    overflow: 'hidden',
    border: '1px solid #d1d5db',
    minHeight: '250px',
  },
  ticketLeft: {
    backgroundColor: '#111827',
    color: '#ffffff',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    borderRight: '2px dashed #e5e7eb',
    position: 'relative',
    width: '130px',
    textAlign: 'center',
    boxSizing: 'border-box',
  },
  ticketStamp: {
    position: 'absolute',
    top: '12px',
    fontSize: '8px',
    letterSpacing: '1px',
    color: '#9ca3af',
    fontWeight: 'bold',
  },
  ticketValue: {
    fontSize: '20px',
    fontWeight: '900',
    letterSpacing: '1px',
    color: '#ef4444',
    textTransform: 'uppercase'
  },
  ticketPrice: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginTop: '6px',
  },
  ticketTableSize: {
    fontSize: '10px',
    color: '#9ca3af',
    marginTop: '8px',
    borderTop: '1px solid #374151',
    paddingTop: '4px'
  },
  ticketRight: {
    flex: 1,
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    position: 'relative',
    gap: '10px',
    boxSizing: 'border-box',
  },
  ticketHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  ticketEvent: {
    fontSize: '16px',
    fontWeight: '800',
    letterSpacing: '0.5px',
    color: '#111827'
  },
  ticketDate: {
    fontSize: '11px',
    color: '#ef4444',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center'
  },
  ticketLocation: {
    fontSize: '11px',
    color: '#4b5563',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center'
  },
  ticketDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    margin: '5px 0',
  },
  ticketMeta: {
    display: 'flex',
    flexDirection: 'column',
  },
  metaLabel: {
    fontSize: '9px',
    color: '#6b7280',
    fontWeight: 'bold',
  },
  metaValue: {
    fontSize: '14px',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metaValueCode: {
    fontSize: '11px',
    fontFamily: 'monospace',
    color: '#374151',
  },
  avantagesContainer: {
    marginTop: '8px',
    borderTop: '1px solid #f3f4f6',
    paddingTop: '8px',
    maxWidth: 'calc(100% - 110px)',
  },
  avantagesTitle: {
    fontSize: '10px',
    fontWeight: 'bold',
    color: '#4b5563',
    display: 'flex',
    alignItems: 'center',
    marginBottom: '4px'
  },
  avantagesList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  avantageItem: {
    fontSize: '11px',
    color: '#1f2937',
    fontWeight: '500'
  },
  qrContainer: {
    position: 'absolute',
    right: '24px',
    bottom: '20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  qrImage: {
    width: '85px',
    height: '85px',
    border: '1px solid #e5e7eb',
    padding: '4px',
    borderRadius: '4px',
  },
  qrTag: {
    fontSize: '8px',
    fontWeight: 'bold',
    color: '#10b981',
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
  },
  printInstruction: {
    fontSize: '13px',
    color: '#8b949e',
    textAlign: 'center',
    marginTop: '20px',
    lineHeight: '1.5',
  },
  passwordTriggerBtn: {
    background: 'none',
    border: 'none',
    color: '#8b949e',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    transition: 'color 0.2s, background-color 0.2s',
    '&:hover': {
      color: '#eb860d', // Un petit effet orange au survol
    }
  },
  footer: {
    backgroundColor: '#0d1117',
    borderTop: '1px solid #21262d',
    padding: '20px 40px',
    textAlign: 'center',
    fontSize: '13px',
    color: '#8b949e',
  }
};

export default Vente;
