import React, { useState, useEffect } from 'react';
import { Search, Eye, RefreshCw, Loader2, Calendar, DollarSign } from 'lucide-react';
import axios from 'axios';
import API_BASE_URL from '../config';

const HistoriqueVentes = ({ agentId, refreshTrigger, onReafficherTicket }) => {
  const [ventes, setVentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recherche, setRecherche] = useState('');

  const chargerVentes = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API_BASE_URL}/api/billets/agent/${agentId}`);
      setVentes(response.data);
    } catch (err) {
      setError("Impossible de charger votre historique de ventes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (agentId) {
      chargerVentes();
    }
  }, [agentId, refreshTrigger]);

  const ventesFiltrees = ventes.filter(v => 
    v.nom_client.toLowerCase().includes(recherche.toLowerCase()) ||
    (v.telephone_client && v.telephone_client.includes(recherche)) ||
    v.code_unique.toLowerCase().includes(recherche.toLowerCase())
  );

  const totalVentes = ventes.reduce((sum, v) => sum + parseFloat(v.prix || 0), 0);

  return (
    <div style={styles.card}>
      <div style={styles.headerRow}>
        <div>
          <h2 style={styles.cardTitle}>Mon Historique de Vente</h2>
          <p style={styles.cardSubtitle}>Liste des billets que vous avez vendus et validés.</p>
        </div>
        <button onClick={chargerVentes} style={styles.syncBtn} title="Actualiser">
          {loading ? <Loader2 size={16} className="spinner" /> : <RefreshCw size={16} />}
        </button>
      </div>

      {/* KPI de Session */}
      <div style={styles.kpiContainer}>
        <div style={styles.kpiBox}>
          <span style={styles.kpiLabel}>BILLETS VENDUS</span>
          <span style={styles.kpiValue}>{ventes.length}</span>
        </div>
        <div style={styles.kpiBox}>
          <span style={styles.kpiLabel}>RECETTE TOTALE</span>
          <span style={styles.kpiValueColor}>{totalVentes} USD</span>
        </div>
      </div>

      {/* Barre de Recherche */}
      <div style={styles.searchWrapper}>
        <Search size={16} style={styles.searchIcon} />
        <input
          type="text"
          placeholder="Rechercher par nom, téléphone, code..."
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {loading ? (
        <div style={styles.center}>
          <Loader2 size={24} className="spinner" />
          <p>Chargement des ventes...</p>
        </div>
      ) : error ? (
        <div style={styles.errorText}>{error}</div>
      ) : ventesFiltrees.length === 0 ? (
        <div style={styles.emptyText}>Aucune vente trouvée.</div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>Client</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Prix</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {ventesFiltrees.map((v) => (
                <tr key={v.ticket_id} style={styles.tr}>
                  <td style={styles.td}>
                    <div style={styles.clientNom}>{v.nom_client}</div>
                    <div style={styles.clientTel}>{v.telephone_client || "Aucun numéro"}</div>
                  </td>
                  <td style={styles.td}>
                    <span style={v.type_billet === 'VIP' ? styles.badgeVip : styles.badgeNormal}>
                      {v.type_billet}
                    </span>
                  </td>
                  <td style={styles.tdBold}>{v.prix} USD</td>
                  <td style={styles.tdSec}>
                    {new Date(v.date_achat).toLocaleDateString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td style={styles.td}>
                    <button 
                      onClick={() => onReafficherTicket(v)} 
                      style={styles.actionBtn}
                      title="Afficher/Réimprimer"
                    >
                      <Eye size={14} /> Voir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const styles = {
  card: { backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  cardTitle: { fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#ffffff' },
  cardSubtitle: { fontSize: '13px', color: '#8b949e', margin: '4px 0 0 0' },
  syncBtn: { background: '#21262d', border: '1px solid #30363d', color: '#c9d1d9', borderRadius: '6px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  kpiContainer: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' },
  kpiBox: { backgroundColor: '#0d1117', border: '1px solid #21262d', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  kpiLabel: { fontSize: '10px', color: '#8b949e', fontWeight: '600', letterSpacing: '0.5px' },
  kpiValue: { fontSize: '20px', fontWeight: 'bold', color: '#ffffff', marginTop: '4px' },
  kpiValueColor: { fontSize: '20px', fontWeight: 'bold', color: '#ef4444', marginTop: '4px' },
  searchWrapper: { position: 'relative', display: 'flex', alignItems: 'center', marginBottom: '16px' },
  searchIcon: { position: 'absolute', left: '12px', color: '#8b949e' },
  searchInput: { width: '100%', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '8px', padding: '10px 10px 10px 36px', color: '#ffffff', fontSize: '14px', outline: 'none' },
  tableWrapper: { overflowX: 'auto', maxHeight: '300px' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  thRow: { borderBottom: '1px solid #30363d' },
  th: { padding: '10px', fontSize: '12px', color: '#8b949e', fontWeight: '600' },
  tr: { borderBottom: '1px solid #21262d', transition: 'background-color 0.2s', ':hover': { backgroundColor: '#1f242c' } },
  td: { padding: '12px 10px', fontSize: '13px', color: '#c9d1d9' },
  tdBold: { padding: '12px 10px', fontSize: '13px', color: '#ffffff', fontWeight: 'bold' },
  tdSec: { padding: '12px 10px', fontSize: '11px', color: '#8b949e' },
  clientNom: { fontWeight: '600', color: '#ffffff' },
  clientTel: { fontSize: '11px', color: '#8b949e', marginTop: '2px' },
  badgeVip: { backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid #ef4444', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' },
  badgeNormal: { backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid #38bdf8', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' },
  actionBtn: { display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#21262d', border: '1px solid #30363d', color: '#c9d1d9', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' },
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '24px', color: '#8b949e' },
  errorText: { color: '#f87171', fontSize: '13px', textAlign: 'center', padding: '12px' },
  emptyText: { color: '#8b949e', fontSize: '13px', textAlign: 'center', padding: '24px' }
};

export default HistoriqueVentes;