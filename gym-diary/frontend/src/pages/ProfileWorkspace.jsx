import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import Icon from '../components/Icon';
import './ProfileWorkspace.css';

const CONTENT = {
  personal: {
    title: 'PAINEL DO PERSONAL',
    subtitle: 'GERENCIE ALUNOS, TREINOS E AVALIACOES',
    cards: [
      ['Alunos', 'Base para visualizar e acompanhar alunos vinculados.'],
      ['Treinos', 'Espaco para criar modelos e atribuir treinos.'],
      ['Avaliacoes', 'Area futura para questionarios e avaliacao fisica.']
    ]
  },
  gym: {
    title: 'PAINEL DA ACADEMIA',
    subtitle: 'GERENCIE ALUNOS, PERSONAIS E RELATORIOS',
    cards: [
      ['Alunos', 'Base geral de alunos vinculados a academia.'],
      ['Personais', 'Equipe de profissionais vinculados por e-mail.'],
      ['Relatorios', 'Visao geral de treinos, avaliacoes e progresso.']
    ]
  },
  admin: {
    title: 'PAINEL ADMIN',
    subtitle: 'FERRAMENTAS INTERNAS DO SISTEMA',
    cards: [
      ['Usuarios', 'Controle de usuarios cadastrados.'],
      ['Perfis', 'Acompanhamento dos tipos de conta.'],
      ['Sistema', 'Configuracoes administrativas.']
    ]
  }
};

export default function ProfileWorkspace() {
  const { activeProfile } = useAuth();
  const navigate = useNavigate();
  const [gym, setGym] = useState(null);
  const [loadingGym, setLoadingGym] = useState(false);
  const [members, setMembers] = useState({ student: [], personal: [] });
  const [memberForms, setMemberForms] = useState({ student: '', personal: '' });
  const [memberMessage, setMemberMessage] = useState('');
  const [savingMember, setSavingMember] = useState(null);
  const content = CONTENT[activeProfile] || CONTENT.personal;

  const loadGymMembers = async () => {
    const [students, personals] = await Promise.all([
      api.getGymMembers('student'),
      api.getGymMembers('personal')
    ]);

    setMembers({
      student: students.members || [],
      personal: personals.members || []
    });
  };

  useEffect(() => {
    if (activeProfile !== 'gym') return;

    let mounted = true;
    setLoadingGym(true);

    api.getMyGym()
      .then((response) => {
        if (mounted) setGym(response.gym);
        if (response.gym) return loadGymMembers();
        return null;
      })
      .catch(() => {
        if (mounted) setGym(null);
      })
      .finally(() => {
        if (mounted) setLoadingGym(false);
      });

    return () => {
      mounted = false;
    };
  }, [activeProfile]);

  const handleAddMember = async (role) => {
    const email = memberForms[role].trim();
    if (!email) return;

    setSavingMember(role);
    setMemberMessage('');

    try {
      const response = await api.addGymMember(email, role);
      await loadGymMembers();
      setMemberForms((current) => ({ ...current, [role]: '' }));
      setMemberMessage(response.createdInvitation
        ? 'Convite pendente criado para este e-mail.'
        : 'Usuario vinculado com sucesso.');
    } catch (error) {
      setMemberMessage(error.message || 'Erro ao adicionar usuario');
    } finally {
      setSavingMember(null);
    }
  };

  const handleRemoveMember = async (id) => {
    await api.removeGymMember(id);
    await loadGymMembers();
  };

  const renderMemberPanel = (role, title) => (
    <div className="member-panel">
      <div className="member-panel-header">
        <h2>{title}</h2>
        <span>{members[role].length} registros</span>
      </div>

      <div className="member-add-row">
        <input
          type="email"
          value={memberForms[role]}
          onChange={(event) => setMemberForms((current) => ({ ...current, [role]: event.target.value }))}
          placeholder={`E-mail do ${role === 'student' ? 'aluno' : 'personal'}`}
        />
        <button onClick={() => handleAddMember(role)} disabled={savingMember === role}>
          {savingMember === role ? 'Adicionando...' : 'Adicionar'}
        </button>
      </div>

      <div className="member-list">
        {members[role].length === 0 ? (
          <p className="empty-member">Nenhum registro ainda.</p>
        ) : members[role].map((member) => (
          <div className="member-item" key={member.id}>
            <div>
              <strong>{member.user?.name || 'Convite pendente'}</strong>
              <span>{member.user?.email || member.invitedEmail}</span>
            </div>
            <div className="member-actions">
              <span className={`member-status ${member.status}`}>{member.status === 'active' ? 'Ativo' : 'Pendente'}</span>
              <button onClick={() => handleRemoveMember(member.id)} aria-label="Remover vinculo">
                <Icon name="trash" size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="workspace-container">
      <div className="industrial-bg"></div>
      <div className="workspace-content">
        <div className="dashboard-header">
          <h1>{content.title}</h1>
          <div className="header-rivets">
            <span className="rivet"></span>
            <span className="rivet"></span>
            <span className="rivet"></span>
          </div>
          <p className="user-greeting">{content.subtitle}</p>
        </div>

        {activeProfile === 'gym' && (
          <div className="gym-summary-card">
            <div>
              <span className="workspace-card-icon"><Icon name="gymLogo" size={30} /></span>
              <h2>{loadingGym ? 'Carregando academia...' : gym?.name || 'Academia nao configurada'}</h2>
              <p>
                {gym
                  ? `${gym.responsible || 'Responsavel nao informado'} | ${gym.status === 'inactive' ? 'Inativa' : 'Ativa'}`
                  : 'Cadastre os dados da academia para liberar este perfil como organizacao.'}
              </p>
              {gym && (
                <div className="gym-summary-details">
                  <span>{gym.email || 'E-mail nao informado'}</span>
                  <span>{gym.phone || 'Telefone nao informado'}</span>
                  <span>{gym.address || 'Endereco nao informado'}</span>
                </div>
              )}
            </div>
            <button onClick={() => navigate('/gym/setup')}>
              {gym ? 'Editar dados' : 'Configurar academia'}
            </button>
          </div>
        )}

        <div className="workspace-grid">
          {content.cards.map(([title, description]) => (
            <div className="workspace-card" key={title}>
              <span className="workspace-card-icon"><Icon name="bolt" size={28} /></span>
              <h2>{title}</h2>
              <p>{description}</p>
            </div>
          ))}
        </div>

        {activeProfile === 'gym' && gym && (
          <div className="gym-members-section">
            <div className="member-section-title">
              <h2>Vinculos da academia</h2>
              <p>Adicione alunos e personais por e-mail. Se a conta ainda nao existir, o convite fica pendente.</p>
            </div>
            {memberMessage && <div className="member-message">{memberMessage}</div>}
            <div className="member-panels-grid">
              {renderMemberPanel('student', 'Alunos')}
              {renderMemberPanel('personal', 'Personais')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
