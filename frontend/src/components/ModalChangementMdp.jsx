import React, { useState } from 'react';
import { X, KeyRound, Loader2, CheckCircle } from 'lucide-react';
import axios from 'axios';
import API_BASE_URL from '../config';

const ModalChangementMdp = ({ onClose }) => {
  const [ancienMdp, setAncienMdp] = useState('');
  const [nouveauMdp, setNouveauMdp] = useState('');
  const [confirmerMdp, setConfirmerMdp] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (nouveauMdp !== confirmerMdp) {
      setError('Les nouveaux mots de passe ne correspondent pas.');
      return;
    }

    if (nouveauMdp.length < 4) {
      setError('Le nouveau mot de passe doit contenir au moins 4 caractères.');
      return;
    }

    setLoading(true);
    try {
      // Endpoint sécurisé pour l'utilisateur actuellement connecté
      await axios.put(`${API_BASE_URL}/api/mon-compte/modifier-mdp`, {
        ancien_mot_de_passe: ancienMdp,
        nouveau_mot_de_passe: nouveauMdp
      }, {
        headers: {
          // Si tu passes l'identifiant par le localStorage ou un token
          'X-Agent-Id': localStorage.getItem('agent_id') 
        }
      });

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000); // Ferme automatiquement la modal après 2 secondes de succès

    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors de la modification du mot de passe.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalContent}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>
            <KeyRound size={20} style={{ color: '#eb860d' }} /> Sécurité du Compte
          </h3>
          <button onClick={onClose} style={styles.closeModalBtn} disabled={loading}>
            <X size={20} />
          </button>
        </div>

        {success ? (
          <div style={styles.successState}>
            <CheckCircle size={40} color="#22c55e" style={{ animation: 'scaleUp 0.3s' }} />
            <p style={{ color: '#22c55e', fontWeight: '600', marginTop: '10px' }}>Mot de passe modifié avec succès !</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={styles.modalForm}>
            {error && <div style={styles.modalError}>{error}</div>}

            <div style={styles.inputGroup}>
              <label style={styles.label}>Mot de passe actuel</label>
              <input 
                type="password" 
                value={ancienMdp} 
                onChange={(e) => setAncienMdp(e.target.value)} 
                placeholder="••••••••"
                required
                style={styles.input}
                disabled={loading}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Nouveau mot de passe</label>
              <input 
                type="password" 
                value={nouveauMdp} 
                onChange={(e) => setNouveauMdp(e.target.value)} 
                placeholder="Minimum 4 caractères"
                required
                style={styles.input}
                disabled={loading}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Confirmer le nouveau mot de passe</label>
              <input 
                type="password" 
                value={confirmerMdp} 
                onChange={(e) => setConfirmerMdp(e.target.value)} 
                placeholder="••••••••"
                required
                style={styles.input}
                disabled={loading}
              />
            </div>

            <div style={styles.modalActions}>
              <button 
                type="button" 
                onClick={onClose} 
                style={styles.cancelBtn}
                disabled={loading}
              >
                Annuler
              </button>
              <button 
                type="submit" 
                style={{ ...styles.submitBtn, backgroundColor: '#eb860d' }}
                disabled={loading}
              >
                {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : "Mettre à jour"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

const styles = {
  modalOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)', display: 'flex',
    justifyContent: 'center', alignItems: 'center', zIndex: 1100,
    backdropFilter: 'blur(4px)'
  },
  modalContent: {
    backgroundColor: '#161b22', border: '1px solid #30363d',
    borderRadius: '12px', width: '100%', maxWidth: '400px',
    padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
  },
  modalHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '20px', borderBottom: '1px solid #21262d', paddingBottom: '12px'
  },
  modalTitle: { fontSize: '17px', fontWeight: 'bold', color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' },
  closeModalBtn: { background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  modalForm: { display: 'flex', flexDirection: 'column', gap: '16px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: '600', color: '#8b949e' },
  input: {
    backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '6px',
    padding: '10px 12px', fontSize: '14px', color: '#ffffff', outline: 'none'
  },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px', borderTop: '1px solid #21262d', paddingTop: '16px' },
  cancelBtn: { backgroundColor: 'transparent', border: '1px solid #30363d', color: '#c9d1d9', borderRadius: '6px', padding: '8px 16px', fontWeight: '600', cursor: 'pointer' },
  submitBtn: { border: 'none', color: '#ffffff', borderRadius: '6px', padding: '8px 16px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  modalError: { backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#f87171', padding: '10px', borderRadius: '6px', fontSize: '13px' },
  successState: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '30px 0', textCenter: 'center' }
};

export default ModalChangementMdp;
