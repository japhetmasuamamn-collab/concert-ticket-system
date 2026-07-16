import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Lock, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import axios from 'axios';
import VITE_API_URL from '../config'; // Importation de l'URL centralisée
import logoCompany from '../assets/logo2.jpeg';

const Login = () => {
  const navigate = useNavigate();
  const [telephone, setTelephone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Utilisation de l'URL centralisée
      const response = await axios.post(`${VITE_API_URL}/api/auth/login`, {
        telephone: telephone,
        mot_de_passe: password
      });

      if (response.data.status === 'success') {
        localStorage.setItem('agent_id', response.data.id);
        localStorage.setItem('agent_nom', response.data.nom);
        localStorage.setItem('agent_role', response.data.role);
        
        // REDIRECTION DYNAMIQUE SELON LE RÔLE REÇU DU BACKEND
        if (response.data.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/vente');
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Une erreur réseau est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        
        {/* LOGO DE L'ENTREPRISE */}
        <div style={styles.logoContainer}>
          <img 
            src={logoCompany} 
            alt="ArtiSys Logo" 
            style={styles.logoImage} 
          />
        </div>

        {/* HEADER ET NOM DE L'ENTREPRISE */}
        <div style={styles.header}>
          <div style={styles.brandContainer}>
            <span style={styles.brandArti}>Arena BUSINESS</span>
            <span style={styles.brandSys}>Sys</span>
          </div>
          <p style={styles.brandTagline}>Art Life System</p>
          
          <div style={styles.divider}></div>
          
          <h2 style={styles.title}>Connexion Agent</h2>
          <p style={styles.subtitle}>Gestion de la billetterie — Concert</p>
        </div>

        {error && <div style={styles.errorAlert}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Numéro de téléphone</label>
            <div style={styles.inputWrapper}>
              <Phone size={16} style={styles.icon} />
              <input
                type="tel"
                placeholder="Ex: 0812345678"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                style={styles.input}
                required
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Mot de passe</label>
            <div style={styles.inputWrapper}>
              <Lock size={16} style={styles.icon} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? (
              <Loader2 size={18} style={styles.spinner} />
            ) : (
              <>
                <ShieldCheck size={18} style={{ marginRight: '8px' }} />
                S'authentifier
              </>
            )}
          </button>
        </form>
      </div>
      
      <footer style={styles.footer}>
        <p>© 2026 - Conçu et Sécurisé par <strong>ArtiSys</strong>. Tous droits réservés.</p>
      </footer>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#0b0c10', 
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    padding: '20px',
    boxSizing: 'border-box',
  },
  card: {
    backgroundColor: '#161b22', 
    border: '1px solid #30363d',
    borderRadius: '12px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
    width: '100%',
    maxWidth: '420px',
    padding: '40px',
    boxSizing: 'border-box',
    animation: 'fadeIn 0.5s ease',
  },
  logoContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '16px',
  },
  logoImage: {
    width: '75px',
    height: '75px',
    borderRadius: '12px',
    objectFit: 'cover',
    border: '2px solid #ef4444', 
    padding: '4px',
    backgroundColor: '#0d1117',
  },
  header: {
    textAlign: 'center',
    marginBottom: '28px',
  },
  brandContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2px',
  },
  brandArti: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: '1px',
  },
  brandSys: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#ef4444',
    letterSpacing: '1px',
  },
  brandTagline: {
    fontSize: '12px',
    color: '#8b949e',
    marginTop: '4px',
    letterSpacing: '2px',
    textTransform: 'uppercase',
  },
  divider: {
    height: '1px',
    backgroundColor: '#30363d',
    margin: '16px auto',
    width: '60%',
  },
  title: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#ffffff',
    margin: '0 0 6px 0',
  },
  subtitle: {
    fontSize: '13px',
    color: '#8b949e',
    margin: 0,
  },
  errorAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid #ef4444',
    color: '#f87171',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '20px',
    textAlign: 'center',
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
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  icon: {
    position: 'absolute',
    left: '14px',
    color: '#8b949e',
  },
  input: {
    width: '100%',
    backgroundColor: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: '8px',
    padding: '12px 16px 12px 42px',
    color: '#ffffff',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  eyeButton: {
    position: 'absolute',
    right: '14px',
    background: 'none',
    border: 'none',
    color: '#8b949e',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    padding: 0,
  },
  button: {
    backgroundColor: '#ef4444', 
    color: '#ffffff',
    padding: '14px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    transition: 'background-color 0.2s',
    marginTop: '10px',
  },
  spinner: {
    animation: 'spin 1s linear infinite',
  },
  footer: {
    marginTop: '24px',
    textAlign: 'center',
    fontSize: '12px',
    color: '#8b949e',
  }
};

const styleTag = document.createElement("style");
styleTag.innerHTML = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;
document.head.appendChild(styleTag);

export default Login;
