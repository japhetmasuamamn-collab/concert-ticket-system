// src/components/ModalAllocationStockAgent.jsx
import React, { useState, useEffect } from 'react';
import { X, User, Phone, Ticket, Layers, Loader2, CheckCircle, Edit2, Check, Plus, Minus, Briefcase, ShieldAlert, UserCheck, UserX } from 'lucide-react';
import axios from 'axios';
import API_BASE_URL from '../config';

const ModalAllocationStockAgent = ({ agent: initialAgent, onClose, onAllocationReussie }) => {
  const [categories, setCategories] = useState([]);
  const [allocationsGlobales, setAllocationsGlobales] = useState({}); // Stock bloqué chez l'ensemble des agents
  const [loadingCategories, setLoadingCategories] = useState(true);
  
  const [largeurEcran, setLargeurEcran] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  useEffect(() => {
    const handleResize = () => setLargeurEcran(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const estMobile = largeurEcran <= 768; // Seuil adapté pour passer en mode PC (tablettes larges et PC bénéficient du split-screen)

  // Gestion dynamique des infos de l'agent en local
  const [agent, setAgent] = useState(initialAgent);
  const [editNom, setEditNom] = useState(false);
  const [editPhone, setEditPhone] = useState(false);
  const [valeurNom, setValeurNom] = useState(initialAgent?.nom || '');
  const [valeurPhone, setValeurPhone] = useState(initialAgent?.telephone || '');
  const [updatingAgent, setUpdatingAgent] = useState(false);
  const [toggleStatusLoading, setToggleStatusLoading] = useState(false);

  // Un dictionnaire pour stocker les quantités sélectionnées par catégorie { [catId]: quantite }
  const [allocations, setAllocations] = useState({});
  
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const chargerDonneesDistribution = async () => {
      setLoadingCategories(true);
      setError('');
      try {
        const [resCategories, resAllocations] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/admin/categories`),
          axios.get(`${API_BASE_URL}/api/admin/agents/allocations-globales`)
        ]);

        setCategories(resCategories.data);
        setAllocationsGlobales(resAllocations.data);
        
        const initialAllocations = {};
        resCategories.data.forEach(cat => {
          initialAllocations[cat.id] = 0;
        });
        setAllocations(initialAllocations);
      } catch (err) {
        setError('Impossible de charger les catégories de billets ou les stocks alloués.');
      } finally {
        setLoadingCategories(false);
      }
    };

    if (agent) chargerDonneesDistribution();
  }, [agent]);

  const sauvegarderModifAgent = async (champ) => {
    setUpdatingAgent(true);
    setError('');
    try {
      await axios.put(`${API_BASE_URL}/api/admin/agents/${agent.id}`, { 
        nom: valeurNom, 
        telephone: valeurPhone 
      });
      
      setAgent(prev => ({ ...prev, nom: valeurNom, telephone: valeurPhone }));
      setEditNom(false);
      setEditPhone(false);
      
      if (onAllocationReussie) onAllocationReussie(); 
    } catch (err) {
      setError("Erreur lors de la mise à jour des coordonnées de l'agent.");
    } finally {
      setUpdatingAgent(false);
    }
  };

  // NOUVELLE FONCTION : Désactiver / Activer l'agent
  const handleToggleStatusAgent = async () => {
    if (!window.confirm(`Êtes-vous sûr de vouloir ${agent.actif ? 'désactiver' : 'réactiver'} le compte de cet agent ?`)) {
      return;
    }

    setToggleStatusLoading(true);
    setError('');
    try {
      const response = await axios.put(`${API_BASE_URL}/api/admin/agents/${agent.id}/toggle-status`);
      
      // On met à jour l'état de l'agent localement
      setAgent(prev => ({ ...prev, actif: response.data.actif }));
      
      if (onAllocationReussie) onAllocationReussie(); // Rafraîchit la liste en arrière plan
    } catch (err) {
      setError("Erreur lors du changement de statut de l'agent.");
    } finally {
      setToggleStatusLoading(false);
    }
  };

  const ajusterQuantiteSpecifique = (catId, valeur, maxDisponible) => {
    setAllocations(prev => {
      const qteActuelle = prev[catId] || 0;
      const nouvelleQte = Math.max(0, qteActuelle + valeur);
      return {
        ...prev,
        [catId]: nouvelleQte > maxDisponible ? maxDisponible : nouvelleQte
      };
    });
  };

  const handleChangerInputQuantite = (catId, valeur, maxDisponible) => {
    const v = parseInt(valeur || 0);
    setAllocations(prev => ({
      ...prev,
      [catId]: v > maxDisponible ? maxDisponible : (v < 0 ? 0 : v)
    }));
  };

  const calculerMontantTotalGlobal = () => {
    return categories.reduce((total, cat) => {
      const qte = allocations[cat.id] || 0;
      return total + (qte * cat.prix);
    }, 0);
  };

  const aDesAllocationsAValider = Object.values(allocations).some(qte => qte > 0);

  const handleSoumettreToutesAllocations = async (e) => {
    e.preventDefault();
    
    const allocationsAEnvoyer = Object.entries(allocations)
      .filter(([_, qte]) => qte > 0)
      .map(([catId, qte]) => ({
        categorie_billet_id: parseInt(catId),
        quantite: qte
      }));

    if (allocationsAEnvoyer.length === 0) return;

    setSubmitLoading(true);
    setError('');
    setSuccess(false);

    try {
      await Promise.all(
        allocationsAEnvoyer.map(item => 
          axios.post(`${API_BASE_URL}/api/admin/agents/allouer-stock`, {
            agent_id: agent.id,
            categorie_billet_id: item.categorie_billet_id,
            quantite: item.quantite
          })
        )
      );

      setSuccess(true);
      
      // Optimisation UX : On met à jour le portefeuille de l'agent localement pour refléter les ajouts
      setAgent(prev => {
        const majAllocations = [...(prev.allocations || [])];
        allocationsAEnvoyer.forEach(nouvelAjout => {
          const indexExistante = majAllocations.findIndex(a => a.categorie_billet_id === nouvelAjout.categorie_billet_id);
          if (indexExistante !== -1) {
            majAllocations[indexExistante].quantite += nouvelAjout.quantite;
          } else {
            const deatailCat = categories.find(c => c.id === nouvelAjout.categorie_billet_id);
            majAllocations.push({
              id: Date.now() + Math.random(),
              categorie_billet_id: nouvelAjout.categorie_billet_id,
              quantite: nouvelAjout.quantite,
              categorie: deatailCat ? { nom_type: deatailCat.nom_type } : null
            });
          }
        });
        return { ...prev, allocations: majAllocations };
      });

      // Réinitialiser les inputs d'ajout
      const resetAllocations = {};
      categories.forEach(cat => { resetAllocations[cat.id] = 0; });
      setAllocations(resetAllocations);

      if (onAllocationReussie) {
        onAllocationReussie(); // Notifie le composant parent en tâche de fond
      }

      // On laisse souffler l'utilisateur sans fermer brutalement s'il veut continuer
      setTimeout(() => {
        setSuccess(false);
      }, 2500);

    } catch (err) {
      setError(err.response?.data?.detail || "Une erreur est survenue lors de l'octroi global.");
    } finally {
      setSubmitLoading(false);
    }
  };

  if (!agent) return null;

  return (
    <div style={styles.modalOverlay}>
      <div style={{
        ...styles.modalContent,
        width: estMobile ? '92%' : '85%',
        maxWidth: estMobile ? '460px' : '900px',
        padding: estMobile ? '16px' : '24px',
        margin: '10px'
      }}>
        
        {/* HEADER */}
        <div style={styles.modalHeader}>
          <div>
            <h3 style={styles.modalTitle}>
              <Layers size={18} style={{ color: '#ef4444' }} /> Distribution Panachée
            </h3>
            <p style={{ fontSize: '11px', color: '#8b949e', margin: '4px 0 0 0' }}>Attribuez plusieurs types de billets simultanément</p>
          </div>
          <button onClick={onClose} style={styles.closeModalBtn}>
            <X size={20} />
          </button>
        </div>

        {/* MESSAGES RETOURS */}
        {error && <div style={styles.modalError}>{error}</div>}
        {success && (
          <div style={styles.modalSuccess}>
            <CheckCircle size={16} /> Attributions validées avec succès ! Le portefeuille de l'agent a été mis à jour.
          </div>
        )}

        {/* CORPS SPLITTE SUR PC / BLOCK SUR MOBILE */}
        <div style={{
          ...styles.modalBodyLayout,
          flexDirection: estMobile ? 'column' : 'row',
          gap: estMobile ? '16px' : '24px'
        }}>
          
          {/* COLONNE GAUCHE : INFOS & PORTEFEUILLE ACTUEL */}
          <div style={{ ...styles.sidebarColumn, width: estMobile ? '100%' : '35%' }}>
            {/* PROFIL AGENT */}
            <div style={styles.agentProfileCard}>
              <div style={styles.profileRow}>
                <User size={15} color="#ef4444" />
                {editNom ? (
                  <div style={styles.inlineEditGroup}>
                    <input 
                      value={valeurNom} 
                      onChange={(e) => setValeurNom(e.target.value)} 
                      style={{ ...styles.inlineInput, width: '70%' }}
                      autoFocus
                    />
                    <button type="button" onClick={() => sauvegarderModifAgent('nom')} style={styles.inlineSaveBtn}>
                      {updatingAgent ? <Loader2 size={12} style={styles.spinner} /> : <Check size={12} />}
                    </button>
                  </div>
                ) : (
                  <div style={styles.clickableTextRow} onClick={() => setEditNom(true)}>
                    <span style={styles.profileText}><strong>Agent :</strong> {agent.nom}</span>
                    <Edit2 size={12} style={styles.editIconHint} />
                  </div>
                )}
              </div>

              <div style={styles.profileRow}>
                <Phone size={13} color="#8b949e" />
                {editPhone ? (
                  <div style={styles.inlineEditGroup}>
                    <input 
                      value={valeurPhone} 
                      onChange={(e) => setValeurPhone(e.target.value)} 
                      style={{ ...styles.inlineInput, width: '70%' }}
                      autoFocus
                    />
                    <button type="button" onClick={() => sauvegarderModifAgent('phone')} style={styles.inlineSaveBtn}>
                      {updatingAgent ? <Loader2 size={12} style={styles.spinner} /> : <Check size={12} />}
                    </button>
                  </div>
                ) : (
                  <div style={styles.clickableTextRow} onClick={() => setEditPhone(true)}>
                    <span style={{ ...styles.profileText, color: '#8b949e' }}>{agent.telephone || 'Aucun numéro'}</span>
                    <Edit2 size={12} style={styles.editIconHint} />
                  </div>
                )}
              </div>

              {/* STATUT BADGE DYNAMIQUE */}
              <div style={styles.profileRow}>
                <ShieldAlert size={14} color={agent.actif ? '#22c55e' : '#ef4444'} />
                <span style={{ fontSize: '12px', color: agent.actif ? '#22c55e' : '#ef4444', fontWeight: 'bold' }}>
                  {agent.actif ? "Compte Actif" : "Compte Désactivé"}
                </span>
              </div>
            </div>

            {/* ACTION DÉSACTIVATION / RÉACTIVATION */}
            <button
              type="button"
              onClick={handleToggleStatusAgent}
              disabled={toggleStatusLoading}
              style={{
                ...styles.toggleStatusBtn,
                backgroundColor: agent.actif ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                border: agent.actif ? '1px solid #ef4444' : '1px solid #22c55e',
                color: agent.actif ? '#f87171' : '#4ade80'
              }}
            >
              {toggleStatusLoading ? (
                <Loader2 size={14} style={styles.spinner} />
              ) : agent.actif ? (
                <>
                  <UserX size={14} /> Désactiver le compte
                </>
              ) : (
                <>
                  <UserCheck size={14} /> Réactiver le compte
                </>
              )}
            </button>

            {/* BLOC : PORTEFEUILLE ACTUEL DE L'AGENT */}
            <div style={styles.walletSection}>
              <div style={styles.walletHeader}>
                <Briefcase size={14} color="#22c55e" />
                <span style={styles.walletTitle}>Portefeuille de l'agent</span>
              </div>
              <div style={styles.walletGrid}>
                {agent.allocations && agent.allocations.length > 0 ? (
                  agent.allocations.map((alloc) => (
                    <div key={alloc.id} style={styles.walletBadge}>
                      <span style={styles.walletBadgeName}>
                        {alloc.categorie?.nom_type || `Billet Type #${alloc.categorie_billet_id}`}
                      </span>
                      <span style={styles.walletBadgeQty}>{alloc.quantite}</span>
                    </div>
                  ))
                ) : (
                  <p style={styles.walletEmptyText}>Aucun billet détenu.</p>
                )}
              </div>
            </div>
          </div>

          {/* COLONNE DROITE : GRILLE DES NOUVELLES DOTATIONS */}
          <div style={{ ...styles.mainContentColumn, width: estMobile ? '100%' : '65%' }}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Ajustez les nouvelles quantités à ajouter</label>
              {loadingCategories ? (
                <div style={styles.miniLoader}><Loader2 size={16} style={styles.spinner} /> Chargement...</div>
              ) : (
                <div style={{ 
                  ...styles.categoriesGrid, 
                  gridTemplateColumns: estMobile ? '1fr' : '1fr 1fr' 
                }}>
                  {categories.map((cat) => {
                    const qteAttribuee = allocations[cat.id] || 0;
                    const estActif = qteAttribuee > 0;
                    
                    const dejaAlloueAuGlobal = allocationsGlobales[cat.id] || 0;
                    const restant = cat.quantite_max - dejaAlloueAuGlobal;
                    
                    const sousTotal = qteAttribuee * cat.prix;

                    return (
                      <div 
                        key={cat.id}
                        style={{
                          ...styles.categoryCard,
                          borderColor: estActif ? '#ef4444' : '#30363d',
                          backgroundColor: estActif ? 'rgba(239, 68, 68, 0.03)' : '#0d1117',
                          transform: estActif ? 'scale(1.01)' : 'scale(1)',
                          padding: '14px',
                          transition: 'all 0.2s ease-in-out'
                        }}
                      >
                        <div style={styles.cardMainRow}>
                          <div style={styles.cardHeader}>
                            <Ticket size={16} color={estActif ? '#ef4444' : '#8b949e'} />
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>{cat.nom_type}</span>
                          </div>
                          <div style={styles.cardPrice}>{cat.prix} USD</div>
                        </div>

                        <div style={styles.cardSubRow}>
                          <span style={{ fontSize: '11px', color: '#8b949e' }}>
                            Dispo gén. : <strong style={{ color: '#c9d1d9' }}>{restant}</strong>
                          </span>
                          {estActif && (
                            <span style={styles.subTotalBadge}>
                              +{sousTotal} USD
                            </span>
                          )}
                        </div>

                        <div style={styles.innerQuantityWrapper}>
                          <button type="button" onClick={() => ajusterQuantiteSpecifique(cat.id, -1, restant)} style={styles.innerStepBtn}>
                            <Minus size={12} />
                          </button>
                          
                          <input 
                            type="number" 
                            min="0"
                            max={restant}
                            value={qteAttribuee === 0 ? '' : qteAttribuee}
                            placeholder="Ajouter 0"
                            onChange={(e) => handleChangerInputQuantite(cat.id, e.target.value, restant)}
                            style={styles.innerQuantityInput}
                          />

                          <button type="button" onClick={() => ajusterQuantiteSpecifique(cat.id, 1, restant)} style={styles.innerStepBtn}>
                            <Plus size={12} />
                          </button>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            {aDesAllocationsAValider && (
              <div style={styles.globalSummaryBox}>
                <span style={{ fontSize: '13px', color: '#8b949e' }}>Coût de la nouvelle dotation :</span>
                <span style={{ fontSize: '18px', fontWeight: '800', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {calculerMontantTotalGlobal()} USD
                </span>
              </div>
            )}
          </div>

        </div>

        {/* FOOTER ACTIONS */}
        <div style={{
          ...styles.modalActions,
          flexDirection: estMobile ? 'column-reverse' : 'row',
          gap: estMobile ? '8px' : '12px',
          marginTop: '20px'
        }}>
          <button type="button" onClick={onClose} style={{ ...styles.cancelBtn, width: estMobile ? '100%' : 'auto', textAlign: 'center' }}>
            Fermer la fenêtre
          </button>
          <button 
            type="button"
            onClick={handleSoumettreToutesAllocations} 
            style={{ 
              ...styles.submitBtn, 
              width: estMobile ? '100%' : 'auto',
              justifyContent: 'center',
              backgroundColor: aDesAllocationsAValider ? '#ef4444' : '#21262d',
              color: aDesAllocationsAValider ? '#fff' : '#8b949e'
            }}
            disabled={submitLoading || !aDesAllocationsAValider}
          >
            {submitLoading ? <Loader2 size={16} style={styles.spinner} /> : "Confirmer l'ajout au portefeuille"}
          </button>
        </div>

      </div>
    </div>
  );
};

const styles = {
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1050, backdropFilter: 'blur(5px)' },
  modalContent: { backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '16px', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)', display: 'flex', flexDirection: 'column' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', borderBottom: '1px solid #21262d', paddingBottom: '12px' },
  modalTitle: { fontSize: '16px', fontWeight: '700', color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' },
  closeModalBtn: { background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', padding: 0 },
  
  modalBodyLayout: { display: 'flex', width: '100%' },
  sidebarColumn: { display: 'flex', flexDirection: 'column', gap: '12px' },
  mainContentColumn: { display: 'flex', flexDirection: 'column' },

  agentProfileCard: { backgroundColor: '#0d1117', border: '1px solid #21262d', borderTopLeftRadius: '10px', borderTopRightRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: 'none' },
  profileRow: { display: 'flex', alignItems: 'center', gap: '10px', height: '28px' },
  clickableTextRow: { display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', width: '100%' },
  profileText: { fontSize: '13px', color: '#c9d1d9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  editIconHint: { color: '#8b949e', opacity: 0.5 },
  inlineEditGroup: { display: 'flex', alignItems: 'center', gap: '6px', width: '100%' },
  inlineInput: { backgroundColor: '#1f242c', border: '1px solid #444c56', borderRadius: '4px', padding: '4px 6px', fontSize: '13px', color: '#fff', outline: 'none' },
  inlineSaveBtn: { backgroundColor: '#238636', border: 'none', color: '#fff', padding: '5px 8px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  
  // NOUVEAU STYLE DU BOUTON DE CHANGEMENT DE STATUT
  toggleStatusBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease', outline: 'none' },

  walletSection: { backgroundColor: '#090d13', border: '1px solid #21262d', borderBottomLeftRadius: '10px', borderBottomRightRadius: '10px', padding: '12px' },
  walletHeader: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' },
  walletTitle: { fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#8b949e', letterSpacing: '0.5px' },
  walletGrid: { display: 'grid', gridTemplateColumns: '1fr', gap: '6px' },
  walletBadge: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.15)', padding: '6px 10px', borderRadius: '6px' },
  walletBadgeName: { fontSize: '11px', fontWeight: '600', color: '#c9d1d9' },
  walletBadgeQty: { fontSize: '11px', fontWeight: 'bold', color: '#22c55e', backgroundColor: 'rgba(34, 197, 94, 0.15)', padding: '1px 6px', borderRadius: '4px' },
  walletEmptyText: { fontSize: '12px', color: '#8b949e', fontStyle: 'italic', margin: 0 },

  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', fontWeight: '600', color: '#8b949e', marginBottom: '4px' },
  categoriesGrid: { display: 'grid', gap: '12px' },
  
  categoryCard: { border: '1px solid #30363d', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px' },
  cardMainRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardSubRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed #21262d', paddingBottom: '8px' },
  cardHeader: { display: 'flex', alignItems: 'center', gap: '6px' },
  cardPrice: { fontSize: '14px', fontWeight: '800', color: '#ffffff' },
  subTotalBadge: { fontSize: '11px', color: '#22c55e', backgroundColor: 'rgba(34, 197, 94, 0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' },

  innerQuantityWrapper: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0d1117', border: '1px solid #21262d', borderRadius: '6px', padding: '4px' },
  innerStepBtn: { backgroundColor: '#21262d', border: 'none', color: '#c9d1d9', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  innerQuantityInput: { flex: 1, backgroundColor: 'transparent', border: 'none', textAlign: 'center', fontSize: '14px', fontWeight: '700', color: '#ffffff', outline: 'none', padding: '2px', width: '40px' },

  globalSummaryBox: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', padding: '12px', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '10px' },

  modalActions: { display: 'flex', borderTop: '1px solid #21262d', paddingTop: '14px', justifyContent: 'flex-end' },
  cancelBtn: { backgroundColor: 'transparent', border: '1px solid #30363d', color: '#c9d1d9', borderRadius: '8px', padding: '10px 18px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  submitBtn: { border: 'none', borderRadius: '8px', padding: '10px 18px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' },
  modalError: { backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#f87171', padding: '10px', borderRadius: '6px', fontSize: '12px', marginBottom: '12px' },
  modalSuccess: { backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid #22c55e', color: '#22c55e', padding: '10px', borderRadius: '6px', fontSize: '12px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' },
  miniLoader: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#8b949e', padding: '6px 0' },
  spinner: { animation: 'spin 1s linear infinite' }
};

export default ModalAllocationStockAgent;
