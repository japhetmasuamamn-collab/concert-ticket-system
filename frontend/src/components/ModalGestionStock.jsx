import React, { useState } from 'react';
import { X, Loader2, PlusCircle, Check, AlertCircle } from 'lucide-react';
import axios from 'axios';
import API_BASE_URL from '../config';

const ModalGestionStock = ({ categorie, onClose, onStockMisAJour }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Valeurs du formulaire
  const [methode, setMethode] = useState('ajouter'); // 'ajouter' ou 'definir'
  const [quantite, setQuantite] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const quantiteNum = parseInt(quantite, 10);

    if (isNaN(quantiteNum) || quantiteNum <= 0) {
      setError('Veuillez entrer une quantité valide supérieure à 0.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Construction de la payload pour l'API
      const payload = {
        methode: methode, // "ajouter" ou "definir"
        quantite: quantiteNum
      };

      // Appel de l'API (à adapter selon tes routes FastAPI)
      // Exemple : PUT /api/admin/categories/{id}/stock
      await axios.put(`${API_BASE_URL}/api/admin/categories/${categorie.id}/stock`, payload);

      setSuccess(true);
      setQuantite('');
      
      // Laisser un petit délai pour afficher le message de réussite avant de fermer/rafraîchir
      setTimeout(() => {
        onStockMisAJour(); // Rafraîchit les données du dashboard parent
        onClose();
      }, 1200);

    } catch (err) {
      setError(err.response?.data?.detail || "Une erreur est survenue lors de la mise à jour du stock.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalContent}>
        
        {/* En-tête */}
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>
            <PlusCircle size={20} style={{ color: '#ef4444' }} /> 
            Gérer le Stock : {categorie.nom_type}
          </h3>
          <button onClick={onClose} style={styles.closeModalBtn}>
            <X size={20} />
          </button>
        </div>

        {/* Détails du Stock Actuel */}
        <div style={styles.stockSummary}>
          <div style={styles.stockItem}>
            <span style={styles.stockLabel}>Vendus</span>
            <span style={{ ...styles.stockValue, color: '#ef4444' }}>{categorie.vendus}</span>
          </div>
          <div style={styles.stockItem}>
            <span style={styles.stockLabel}>Stock Total Actuel</span>
            <span style={styles.stockValue}>{categorie.quantite_max}</span>
          </div>
          <div style={styles.stockItem}>
            <span style={styles.stockLabel}>Disponible</span>
            <span style={{ ...styles.stockValue, color: '#22c55e' }}>
              {categorie.quantite_max - categorie.vendus}
            </span>
          </div>
        </div>

        {/* Messages d'erreur et de succès */}
        {error && (
          <div style={styles.errorAlert}>
            <AlertCircle size={16} /> {error}
          </div>
        )}
        
        {success && (
          <div style={styles.successAlert}>
            <Check size={16} /> Opération effectuée avec succès !
          </div>
        )}

        {/* Formulaire */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Action à effectuer</label>
            <div style={styles.radioGroup}>
              <label style={{
                ...styles.radioLabel,
                backgroundColor: methode === 'ajouter' ? 'rgba(239, 68, 68, 0.15)' : '#0d1117',
                borderColor: methode === 'ajouter' ? '#ef4444' : '#30363d'
              }}>
                <input 
                  type="radio" 
                  name="methode" 
                  value="ajouter" 
                  checked={methode === 'ajouter'}
                  onChange={() => setMethode('ajouter')}
                  style={styles.radioInput} 
                />
                Ajouter au stock existant
              </label>

              <label style={{
                ...styles.radioLabel,
                backgroundColor: methode === 'definir' ? 'rgba(59, 130, 246, 0.15)' : '#0d1117',
                borderColor: methode === 'definir' ? '#3b82f6' : '#30363d'
              }}>
                <input 
                  type="radio" 
                  name="methode" 
                  value="definir" 
                  checked={methode === 'definir'}
                  onChange={() => setMethode('definir')}
                  style={styles.radioInput} 
                />
                Définir une nouvelle limite
              </label>
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>
              {methode === 'ajouter' ? "Nombre de billets à ajouter" : "Nouveau stock maximum total"}
            </label>
            <input 
              type="number" 
              value={quantite}
              onChange={(e) => setQuantite(e.target.value)}
              placeholder={methode === 'ajouter' ? "Ex: +50" : "Ex: 500 au total"}
              required
              min="1"
              style={styles.input}
            />
            <span style={styles.helperText}>
              {methode === 'ajouter' 
                ? `Le stock total passera de ${categorie.quantite_max} à ${categorie.quantite_max + (parseInt(quantite) || 0)}.`
                : "Attention : Le nouveau stock total ne doit pas être inférieur au nombre de billets déjà vendus."}
            </span>
          </div>

          {/* Actions */}
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
              style={{
                ...styles.submitBtn,
                backgroundColor: methode === 'ajouter' ? '#ef4444' : '#3b82f6'
              }}
              disabled={loading}
            >
              {loading ? <Loader2 size={16} style={styles.spinner} /> : "Confirmer"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

// --- STYLES INTERNES AU COMPOSANT ---
const styles = {
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
    zIndex: 1100,
    backdropFilter: 'blur(4px)'
  },
  modalContent: {
    backgroundColor: '#161b22',
    border: '1px solid #30363d',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '460px',
    padding: '24px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
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
    alignItems: 'center'
  },
  stockSummary: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '12px',
    backgroundColor: '#0d1117',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #21262d',
    marginBottom: '20px'
  },
  stockItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  stockLabel: {
    fontSize: '11px',
    color: '#8b949e',
    textTransform: 'uppercase',
    fontWeight: 'bold'
  },
  stockValue: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: '4px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#8b949e'
  },
  radioGroup: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px'
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 10px',
    border: '1px solid #30363d',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    color: '#ffffff',
    transition: 'all 0.2s'
  },
  radioInput: {
    accentColor: '#ef4444'
  },
  input: {
    backgroundColor: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: '6px',
    padding: '10px 12px',
    fontSize: '15px',
    color: '#ffffff',
    outline: 'none'
  },
  helperText: {
    fontSize: '11px',
    color: '#8b949e',
    lineHeight: '1.4'
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '8px',
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
  errorAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid #ef4444',
    color: '#f87171',
    padding: '10px',
    borderRadius: '6px',
    fontSize: '13px',
    marginBottom: '15px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  successAlert: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid #22c55e',
    color: '#4ade80',
    padding: '10px',
    borderRadius: '6px',
    fontSize: '13px',
    marginBottom: '15px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  spinner: {
    animation: 'spin 1s linear infinite'
  }
};

export default ModalGestionStock;
