import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar, MapPin, ShieldCheck, Loader2, AlertTriangle, Lock, Unlock, Eye } from 'lucide-react';
import axios from 'axios';
import API_BASE_URL from '../config';

const TicketPublic = () => {
  const { codeUnique } = useParams();
  const [ticketData, setTicketData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // États de sécurité du QR Code
  const [estJourJ, setEstJourJ] = useState(false);
  const [dejaConsulte, setDejaConsulte] = useState(false);
  const [qrVerrouille, setQrVerrouille] = useState(true);

  useEffect(() => {
    const chargerInfosTicket = async () => {
      setLoading(true);
      setError('');
      try {
        const resBillet = await axios.get(`${API_BASE_URL}/api/billets/public/${codeUnique}`);
        const billet = resBillet.data;
        setTicketData(billet);

        // --- MASQUAGE DE L'URL (MESURE DE SÉCURITÉ N°3) ---
        // Dès que le billet est chargé avec succès dans l'état local (mémoire vive de React),
        // on réécrit l'URL visible dans la barre d'adresse pour camoufler le code unique.
        // L'historique du navigateur est remplacé pour empêcher un retour arrière indiscret.
        window.history.replaceState(null, '', '/ticket/secure-access');

        // --- CALCULS DE SÉCURITÉ DU CADENAS ---
        if (billet.evenement_date) {
          const maintenant = new Date();
          const dateEvenement = new Date(billet.evenement_date);

          // On compare uniquement l'année, le mois et le jour
          const estMemeJour = 
            maintenant.getFullYear() === dateEvenement.getFullYear() &&
            maintenant.getMonth() === dateEvenement.getMonth() &&
            maintenant.getDate() === dateEvenement.getDate();
          
          // Vérifie si l'événement est aujourd'hui ou déjà passé
          const estAujourdhuiOuPasse = estMemeJour || maintenant > dateEvenement;
          setEstJourJ(estAujourdhuiOuPasse);

          // Vérification du localStorage pour savoir si le client a déjà ouvert cette page auparavant
          const cleVisite = `billet_vu_${codeUnique}`;
          const aDejaVisite = localStorage.getItem(cleVisite) === 'true';
          setDejaConsulte(aDejaVisite);

          // LOGIQUE DU CADENAS :
          // Le QR code est déverrouillé SI :
          // C'est le jour J (ou après) OU s'il ne l'a ENCORE JAMAIS ouvert (Première visualisation unique autorisée)
          if (estAujourdhuiOuPasse || !aDejaVisite) {
            setQrVerrouille(false);
            
            // Si c'est sa toute première visite (hors jour J), on enregistre qu'il l'a vu
            // Ainsi, s'il rafraîchit la page, le cadenas se refermera.
            if (!estAujourdhuiOuPasse && !aDejaVisite) {
              localStorage.setItem(cleVisite, 'true');
            }
          } else {
            setQrVerrouille(true);
          }
        }

      } catch (err) {
        setError("Impossible de charger ce billet. Le code est peut-être invalide ou expiré.");
      } finally {
        setLoading(false);
      }
    };

    if (codeUnique) {
      chargerInfosTicket();
    }
  }, [codeUnique]);

  const formatueDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute:'2-digit' });
  };

  if (loading) {
    return (
      <div style={styles.centerContainer}>
        <Loader2 size={40} style={styles.spinner} />
        <p style={{ marginTop: '12px' }}>Génération de votre billet sécurisé en cours...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.centerContainer}>
        <AlertTriangle size={48} color="#ef4444" />
        <h3 style={{ marginTop: '16px', color: '#ef4444' }}>Erreur d'accès</h3>
        <p style={{ color: '#8b949e', textAlign: 'center', maxWidth: '300px' }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={styles.body}>
      <main style={styles.container}>
        <div style={styles.successHeader}>
          <ShieldCheck size={28} color="#22c55e" />
          <h3 style={styles.successTitle}>Billet Officiel Actif</h3>
        </div>

        {/* DESIGN DU BILLET ÉLECTRONIQUE */}
        <div style={styles.ticketContainer}>
          <div style={styles.ticketLeft}>
            <div style={styles.ticketStamp}>ARTI-SYS SECURE</div>
            <div style={styles.ticketValue}>{ticketData?.type_billet}</div>
            <div style={styles.ticketPrice}>{ticketData?.prix} USD</div>
          </div>

          <div style={styles.ticketRight}>
            <div style={styles.ticketHeader}>
              <span style={styles.ticketEvent}>{ticketData?.evenement_titre}</span>
              <span style={styles.ticketDate}>
                <Calendar size={12} style={{ marginRight: '4px' }} />
                {formatueDate(ticketData?.evenement_date)}
              </span>
              <span style={styles.ticketLocation}>
                <MapPin size={12} style={{ marginRight: '4px' }} />
                {ticketData?.evenement_lieu}
              </span>
            </div>
            
            <div style={styles.ticketDetails}>
              <div style={styles.ticketMeta}>
                <span style={styles.metaLabel}>TITULAIRE :</span>
                <span style={styles.metaValue}>{ticketData?.nom_client}</span>
              </div>
              <div style={styles.ticketMeta}>
                <span style={styles.metaLabel}>ID SÉCURISÉ :</span>
                {/* On n'affiche pas le code unique brut en clair s'il est verrouillé */}
                <span style={styles.metaValueCode}>
                  {qrVerrouille ? "••••-••••-SECURE" : ticketData?.code_unique}
                </span>
              </div>
            </div>

            {/* CONTENEUR DE SÉCURITÉ DU QR CODE */}
            <div style={styles.qrContainer}>
              {qrVerrouille ? (
                // --- DESIGN SI LE QR CODE EST VERROUILLÉ ---
                <div style={styles.qrLockedBox}>
                  <Lock size={24} color="#ef4444" />
                  <span style={styles.qrLockedText}>Sécurisé</span>
                </div>
              ) : (
                // --- DESIGN SI LE QR CODE EST DÉVERROUILLÉ ---
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(ticketData?.code_unique || '')}&color=000000`} 
                  alt="QR Code" 
                  style={styles.qrImage}
                />
              )}
              
              <div style={styles.qrTag}>
                {qrVerrouille ? (
                  <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <Lock size={10} /> CADENAS ACTIF
                  </span>
                ) : (
                  <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <Unlock size={10} /> SCAN UNIQUE
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* BANDEAU INFORMATIF SUR LA SÉCURITÉ DU TICKET */}
        <div style={styles.securityBanner(qrVerrouille)}>
          {qrVerrouille ? (
            <>
              <Lock size={18} style={{ marginRight: '8px', flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: '12px' }}>
                <strong>QR Code Verrouillé : </strong> 
                {"Vous l'avez déjà visualisé une fois pour contrôle. Par mesure de sécurité anti-fraude, il se déverrouillera automatiquement le jour de l'événement ("}
                <strong>{formatueDate(ticketData?.evenement_date).split(' à')[0]}</strong>
                {")."}
              </p>
            </>
          ) : (
            <>
              <Eye size={18} style={{ marginRight: '8px', flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: '12px' }}>
                {!estJourJ ? (
                  <span>
                    <strong>Première visualisation : </strong> 
                    {"Attention, le QR code ne s'affiche qu'une fois avant le jour J pour vérification. Si vous quittez ou rafraîchissez cette page, il sera verrouillé jusqu'à l'événement."}
                  </span>
                ) : (
                  <span>
                    <strong>Jour J arrivé : </strong> 
                    {"Votre QR code est déverrouillé et prêt à être scanné à l'entrée de l'événement."}
                  </span>
                )}
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

// Styles optimisés pour smartphone (Mobile First)
const styles = {
  body: {
    backgroundColor: '#0b0c10',
    color: '#f5f5f7',
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    padding: '20px 15px',
    fontFamily: 'system-ui, sans-serif',
  },
  container: {
    width: '100%',
    maxWidth: '500px',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  centerContainer: {
    backgroundColor: '#0b0c10',
    color: '#f5f5f7',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
  },
  spinner: {
    animation: 'spin 1s linear infinite',
    color: '#ef4444',
  },
  successHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: '18px',
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
  },
  ticketLeft: {
    backgroundColor: '#111827',
    color: '#ffffff',
    padding: '15px 10px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    borderRight: '2px dashed #e5e7eb',
    width: '95px',
    textAlign: 'center',
    boxSizing: 'border-box',
  },
  ticketStamp: {
    fontSize: '6px',
    letterSpacing: '0.5px',
    color: '#9ca3af',
    fontWeight: 'bold',
    marginBottom: '10px',
  },
  ticketValue: {
    fontSize: '14px',
    fontWeight: '900',
    color: '#ef4444',
    textTransform: 'uppercase'
  },
  ticketPrice: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginTop: '6px',
  },
  ticketRight: {
    flex: 1,
    padding: '15px',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    gap: '8px',
    boxSizing: 'border-box',
  },
  ticketHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    paddingRight: '65px',
  },
  ticketEvent: {
    fontSize: '14px',
    fontWeight: '800',
    color: '#111827'
  },
  ticketDate: {
    fontSize: '10px',
    color: '#ef4444',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center'
  },
  ticketLocation: {
    fontSize: '10px',
    color: '#4b5563',
    display: 'flex',
    alignItems: 'center'
  },
  ticketDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginTop: '5px',
  },
  ticketMeta: {
    display: 'flex',
    flexDirection: 'column',
  },
  metaLabel: {
    fontSize: '8px',
    color: '#6b7280',
    fontWeight: 'bold',
  },
  metaValue: {
    fontSize: '12px',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metaValueCode: {
    fontSize: '9px',
    fontFamily: 'monospace',
    color: '#374151',
  },
  qrContainer: {
    position: 'absolute',
    right: '12px',
    bottom: '12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
  },
  qrImage: {
    width: '65px',
    height: '65px',
    border: '1px solid #e5e7eb',
    padding: '2px',
    borderRadius: '4px',
  },
  qrLockedBox: {
    width: '65px',
    height: '65px',
    border: '1px solid #fca5a5',
    backgroundColor: '#fef2f2',
    borderRadius: '4px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrLockedText: {
    fontSize: '8px',
    fontWeight: 'bold',
    color: '#ef4444',
    marginTop: '2px',
    textTransform: 'uppercase'
  },
  qrTag: {
    fontSize: '7px',
    fontWeight: 'bold',
  },
  securityBanner: (verrouille) => ({
    display: 'flex',
    alignItems: 'flex-start',
    backgroundColor: verrouille ? '#1f1315' : '#111b14',
    border: `1px solid ${verrouille ? '#4c1d1f' : '#163e26'}`,
    color: verrouille ? '#fca5a5' : '#86efac',
    padding: '12px',
    borderRadius: '8px',
    lineHeight: '1.4',
  })
};

export default TicketPublic;