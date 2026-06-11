import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { useAlert } from '../contexts/AlertContext';
import Icon from '../components/Icon';
import './GymSetup.css';

const emptyForm = {
  name: '',
  phone: '',
  email: '',
  address: '',
  responsible: '',
  status: 'active'
};

export default function GymSetup() {
  const { user, refreshCurrentUser } = useAuth();
  const { notify } = useAlert();
  const navigate = useNavigate();
  const [formData, setFormData] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const setMessage = (message) => message && notify(message);

  useEffect(() => {
    let mounted = true;

    const loadGym = async () => {
      try {
        const response = await api.getMyGym();
        if (mounted && response.gym) {
          setFormData({
            name: response.gym.name || '',
            phone: response.gym.phone || '',
            email: response.gym.email || '',
            address: response.gym.address || '',
            responsible: response.gym.responsible || '',
            status: response.gym.status || 'active'
          });
        }
      } catch (error) {
        setMessage(error.message || 'Erro ao carregar academia');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadGym();
    return () => {
      mounted = false;
    };
  }, []);

  if (!user) return <Navigate to="/login" />;

  const handleChange = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      await api.saveMyGym(formData);
      await refreshCurrentUser('gym');
      navigate('/dashboard');
    } catch (error) {
      setMessage(error.message || 'Erro ao salvar academia');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="gym-setup-loading">Carregando...</div>;
  }

  return (
    <div className="gym-setup-container">
      <div className="industrial-bg"></div>
      <div className="gym-setup-content">
        <div className="dashboard-header">
          <h1>CONTA ACADEMIA</h1>
          <div className="header-rivets">
            <span className="rivet"></span>
            <span className="rivet"></span>
            <span className="rivet"></span>
          </div>
          <p className="user-greeting">TRANSFORME SUA CONTA EM ACADEMIA</p>
        </div>

        <form className="gym-form" onSubmit={handleSubmit}>
          <div className="gym-form-title">
            <Icon name="gymLogo" size={30} />
            <div>
              <h2>Dados da academia</h2>
              <p>Esta etapa cria uma organizacao unica, sem unidades ou filiais.</p>
            </div>
          </div>

          <div className="gym-form-grid">
            <label>
              Nome da academia
              <input
                value={formData.name}
                onChange={(event) => handleChange('name', event.target.value)}
                placeholder="Ex: JFTrack Fitness"
                required
              />
            </label>

            <label>
              Responsavel
              <input
                value={formData.responsible}
                onChange={(event) => handleChange('responsible', event.target.value)}
                placeholder="Nome do responsavel"
              />
            </label>

            <label>
              Telefone
              <input
                value={formData.phone}
                onChange={(event) => handleChange('phone', event.target.value)}
                placeholder="(00) 00000-0000"
              />
            </label>

            <label>
              E-mail
              <input
                type="email"
                value={formData.email}
                onChange={(event) => handleChange('email', event.target.value)}
                placeholder="contato@academia.com"
              />
            </label>

            <label className="wide">
              Endereco
              <input
                value={formData.address}
                onChange={(event) => handleChange('address', event.target.value)}
                placeholder="Rua, numero, bairro e cidade"
              />
            </label>

            <label>
              Status
              <select value={formData.status} onChange={(event) => handleChange('status', event.target.value)}>
                <option value="active">Ativa</option>
                <option value="inactive">Inativa</option>
              </select>
            </label>
          </div>

          <div className="gym-actions">
            <button type="button" className="secondary-action" onClick={() => navigate('/dashboard')}>
              Cancelar
            </button>
            <button type="submit" className="primary-action" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar e entrar como academia'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
