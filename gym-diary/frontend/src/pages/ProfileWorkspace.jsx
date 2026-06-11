import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';
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
  const { notify } = useAlert();
  const { section = 'inicio' } = useParams();
  const navigate = useNavigate();
  const [gym, setGym] = useState(null);
  const [loadingGym, setLoadingGym] = useState(false);
  const [members, setMembers] = useState({ student: [], personal: [] });
  const [memberForms, setMemberForms] = useState({ student: '', personal: '' });
  const setMemberMessage = (message) => message && notify(message);
  const [savingMember, setSavingMember] = useState(null);
  const [reports, setReports] = useState(null);
  const [loadingReports, setLoadingReports] = useState(false);
  const [selectedReportStudentId, setSelectedReportStudentId] = useState(null);
  const [selectedReportPersonalId, setSelectedReportPersonalId] = useState(null);
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

  const loadGymReports = async () => {
    const response = await api.getGymReports();
    setReports(response);
  };

  useEffect(() => {
    if (activeProfile !== 'gym') return;

    let mounted = true;
    setLoadingGym(true);
    setLoadingReports(true);

    api.getMyGym()
      .then((response) => {
        if (mounted) setGym(response.gym);
        if (response.gym) {
          return Promise.all([
            loadGymMembers(),
            loadGymReports()
          ]);
        }
        return null;
      })
      .catch(() => {
        if (mounted) setGym(null);
      })
      .finally(() => {
        if (mounted) setLoadingGym(false);
        if (mounted) setLoadingReports(false);
      });

    return () => {
      mounted = false;
    };
  }, [activeProfile]);

  useEffect(() => {
    if (activeProfile !== 'gym' || section !== 'relatorios' || !gym) return undefined;

    const intervalId = window.setInterval(() => {
      loadGymReports();
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, [activeProfile, section, gym]);

  const handleAddMember = async (role) => {
    const email = memberForms[role].trim();
    if (!email) return;

    setSavingMember(role);
    setMemberMessage('');

    try {
      const response = await api.addGymMember(email, role);
      await loadGymMembers();
      await loadGymReports();
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
    await loadGymReports();
  };

  const formatDate = (date) => {
    if (!date) return 'Sem avaliacao';
    return new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR');
  };

  const formatDayName = (dayName) => {
    const days = {
      Sunday: 'Domingo',
      Monday: 'Segunda',
      Tuesday: 'Terca',
      Wednesday: 'Quarta',
      Thursday: 'Quinta',
      Friday: 'Sexta',
      Saturday: 'Sabado'
    };

    return days[dayName] || dayName || 'Sem dados';
  };

  const formatHour = (hour) => {
    if (hour === null || hour === undefined || Number.isNaN(Number(hour))) return 'Sem horario';
    return `${String(hour).padStart(2, '0')}:00`;
  };

  const chartTooltipStyle = {
    background: '#11161d',
    border: '1px solid rgba(255,107,53,0.35)',
    borderRadius: 6,
    color: '#f4f7fb'
  };

  const renderGymOverview = () => {
    const students = members.student || [];
    const personals = members.personal || [];
    const activeStudents = students.filter((member) => member.status === 'active').length;
    const pendingStudents = students.filter((member) => member.status === 'pending').length;
    const activePersonals = personals.filter((member) => member.status === 'active').length;
    const pendingPersonals = personals.filter((member) => member.status === 'pending').length;

    const overviewCards = [
      ['Alunos ativos', activeStudents, `${pendingStudents} convite(s) pendente(s)`, 'userPlus'],
      ['Personais ativos', activePersonals, `${pendingPersonals} convite(s) pendente(s)`, 'clipboard'],
      ['Vinculos totais', students.length + personals.length, 'Alunos e personais cadastrados', 'chart'],
      ['Status da academia', gym?.status === 'inactive' ? 'Inativa' : 'Ativa', gym?.name || 'Academia configurada', 'gymLogo']
    ];

    return (
      <div className="gym-overview-section">
        <div className="member-section-title">
          <h2>Resumo geral</h2>
          <p>Visao rapida da operacao da academia.</p>
        </div>
        <div className="gym-overview-grid">
          {overviewCards.map(([title, value, description, icon]) => (
            <div className="gym-overview-card" key={title}>
              <span className="workspace-card-icon"><Icon name={icon} size={26} /></span>
              <strong>{value}</strong>
              <h3>{title}</h3>
              <p>{description}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderGymReports = () => {
    if (loadingReports) {
      return <div className="workspace-card full-width">Carregando relatorios...</div>;
    }

    if (!reports) {
      return (
        <div className="workspace-card full-width">
          <span className="workspace-card-icon"><Icon name="chart" size={30} /></span>
          <h2>Relatorios</h2>
          <p>Nenhum dado consolidado disponivel ainda.</p>
        </div>
      );
    }

    const summaryCards = [
      ['Alunos ativos', reports.summary?.totalActiveStudents || 0, 'Total de alunos ativos na academia', 'userPlus'],
      ['Personais ativos', reports.summary?.totalActivePersonals || 0, 'Total de personais ativos na academia', 'clipboard'],
      ['Avaliacoes no mes', reports.summary?.assessmentsThisMonth || 0, 'Avaliacoes realizadas neste mes', 'chart'],
      ['Avaliacao pendente', reports.summary?.pendingAssessmentStudents || 0, 'Alunos ativos sem avaliacao registrada', 'settings']
    ];

    const selectedStudent = (reports.students || []).find((student) => student.id === selectedReportStudentId);
    const selectedPersonal = (reports.personals || []).find((personal) => personal.id === selectedReportPersonalId);
    const busyDayChartData = (reports.busyDays || []).map((item) => ({
      name: formatDayName(item.dayName),
      treinos: item.total
    }));
    const busyHourChartData = (reports.busyHours || []).map((item) => ({
      name: formatHour(item.hour),
      treinos: item.total
    }));
    const personalChartData = (reports.personals || []).map((personal) => ({
      name: personal.name,
      alunos: personal.linkedStudents,
      avaliacoes: personal.assessmentsDone,
      frequencia: personal.averageMonthlyFrequency
    }));
    const assessmentPieData = [
      { name: 'Com avaliacao', value: Math.max((reports.summary?.totalActiveStudents || 0) - (reports.summary?.pendingAssessmentStudents || 0), 0) },
      { name: 'Pendente', value: reports.summary?.pendingAssessmentStudents || 0 }
    ].filter((item) => item.value > 0);
    const pieColors = ['#2ecc71', '#ff6b35'];

    return (
      <div className="reports-section">
        <div className="member-section-title">
          <h2>Relatorios da academia</h2>
          <p>Indicadores de alunos, personais, frequencia e avaliacoes.</p>
        </div>

        <div className="gym-overview-grid">
          {summaryCards.map(([title, value, description, icon]) => (
            <div className="gym-overview-card" key={title}>
              <span className="workspace-card-icon"><Icon name={icon} size={26} /></span>
              <strong>{value}</strong>
              <h3>{title}</h3>
              <p>{description}</p>
            </div>
          ))}
        </div>

        <div className="reports-chart-grid">
          <section className="reports-chart-card wide">
            <div>
              <h2>Movimento por dia</h2>
              <p>Dias com mais treinos registrados pela academia.</p>
            </div>
            {busyDayChartData.length === 0 ? (
              <p className="empty-member">Sem treinos registrados ainda.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={busyDayChartData} margin={{ top: 18, right: 16, left: -20, bottom: 8 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="name" stroke="#aeb7c4" tickLine={false} axisLine={false} />
                  <YAxis stroke="#aeb7c4" tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip cursor={{ fill: 'rgba(255,107,53,0.08)' }} contentStyle={chartTooltipStyle} />
                  <Bar dataKey="treinos" radius={[8, 8, 2, 2]} fill="#ff6b35" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </section>

          <section className="reports-chart-card">
            <div>
              <h2>Avaliacoes</h2>
              <p>Status dos alunos ativos.</p>
            </div>
            {assessmentPieData.length === 0 ? (
              <p className="empty-member">Sem alunos ativos ainda.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={assessmentPieData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={94} paddingAngle={5}>
                    {assessmentPieData.map((entry, index) => (
                      <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </section>

          <section className="reports-chart-card">
            <div>
              <h2>Horarios de pico</h2>
              <p>Horas com mais treinos finalizados.</p>
            </div>
            {busyHourChartData.length === 0 ? (
              <p className="empty-member">Sem horarios registrados ainda.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={busyHourChartData} margin={{ top: 18, right: 16, left: -20, bottom: 8 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="name" stroke="#aeb7c4" tickLine={false} axisLine={false} />
                  <YAxis stroke="#aeb7c4" tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip cursor={{ fill: 'rgba(46,204,113,0.08)' }} contentStyle={chartTooltipStyle} />
                  <Bar dataKey="treinos" radius={[8, 8, 2, 2]} fill="#2ecc71" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </section>

          <section className="reports-chart-card wide">
            <div>
              <h2>Performance por personal</h2>
              <p>Comparativo de alunos, avaliacoes e frequencia media.</p>
            </div>
            {personalChartData.length === 0 ? (
              <p className="empty-member">Nenhum personal ativo encontrado.</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={personalChartData} margin={{ top: 18, right: 16, left: -20, bottom: 8 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="name" stroke="#aeb7c4" tickLine={false} axisLine={false} />
                  <YAxis stroke="#aeb7c4" tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={chartTooltipStyle} />
                  <Bar dataKey="alunos" fill="#ff6b35" radius={[7, 7, 2, 2]} />
                  <Bar dataKey="avaliacoes" fill="#ffd28a" radius={[7, 7, 2, 2]} />
                  <Bar dataKey="frequencia" fill="#2ecc71" radius={[7, 7, 2, 2]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </section>
        </div>

        <div className="reports-two-column">
          <section className="reports-panel">
            <div className="member-section-title">
              <h2>Alunos</h2>
              <p>Clique em um aluno para ver responsavel, frequencia e ultima avaliacao.</p>
            </div>
            <div className="report-list">
              {(reports.students || []).length === 0 ? (
                <p className="empty-member">Nenhum aluno ativo encontrado.</p>
              ) : reports.students.map((student) => (
                <button
                  type="button"
                  className={`report-row ${selectedReportStudentId === student.id ? 'active' : ''}`}
                  key={student.id}
                  onClick={() => setSelectedReportStudentId(
                    selectedReportStudentId === student.id ? null : student.id
                  )}
                >
                  <span>
                    <strong>{student.name}</strong>
                    <small>{student.email}</small>
                  </span>
                  <em>{student.monthlyFrequency} treino(s) no mes</em>
                </button>
              ))}
            </div>

            {selectedStudent && (
              <div className="student-report-detail">
                <h3>{selectedStudent.name}</h3>
                <p><strong>Personal responsavel:</strong> {selectedStudent.personalNames}</p>
                <p><strong>Frequencia semanal:</strong> {selectedStudent.weeklyFrequency} treino(s)</p>
                <p><strong>Frequencia mensal:</strong> {selectedStudent.monthlyFrequency} treino(s)</p>
                <p><strong>Ultima avaliacao fisica:</strong> {formatDate(selectedStudent.lastAssessmentDate)}</p>
              </div>
            )}
          </section>

          <section className="reports-panel">
            <div className="member-section-title">
              <h2>Relatorios por personal</h2>
              <p>Alunos vinculados, avaliacoes e media de frequencia mensal.</p>
            </div>
            <div className="personal-report-list">
              {(reports.personals || []).length === 0 ? (
                <p className="empty-member">Nenhum personal ativo encontrado.</p>
              ) : reports.personals.map((personal) => (
                <button
                  type="button"
                  className={`report-row ${selectedReportPersonalId === personal.id ? 'active' : ''}`}
                  key={personal.id}
                  onClick={() => setSelectedReportPersonalId(
                    selectedReportPersonalId === personal.id ? null : personal.id
                  )}
                >
                  <span>
                    <strong>{personal.name}</strong>
                    <small>{personal.email}</small>
                  </span>
                  <em>{personal.linkedStudents} aluno(s)</em>
                </button>
              ))}
            </div>

            {selectedPersonal && (
              <div className="student-report-detail">
                <h3>{selectedPersonal.name}</h3>
                <p><strong>Quantidade de alunos vinculados:</strong> {selectedPersonal.linkedStudents}</p>
                <p><strong>Avaliacoes feitas:</strong> {selectedPersonal.assessmentsDone}</p>
                <p><strong>Avaliacoes feitas no mes:</strong> {selectedPersonal.assessmentsThisMonth}</p>
                <p><strong>Media de frequencia dos alunos:</strong> {selectedPersonal.averageMonthlyFrequency} treino(s)/mes</p>
              </div>
            )}
          </section>
        </div>

        <div className="reports-two-column">
          <section className="reports-panel compact">
            <h2>Dias com mais treinos</h2>
            {(reports.busyDays || []).length === 0 ? (
              <p className="empty-member">Sem treinos registrados ainda.</p>
            ) : reports.busyDays.map((item) => (
              <div className="ranking-row" key={item.dayName}>
                <span>{formatDayName(item.dayName)}</span>
                <strong>{item.total}</strong>
              </div>
            ))}
          </section>

          <section className="reports-panel compact">
            <h2>Horarios com mais treinos</h2>
            {(reports.busyHours || []).length === 0 ? (
              <p className="empty-member">Sem horarios registrados ainda.</p>
            ) : reports.busyHours.map((item) => (
              <div className="ranking-row" key={item.hour}>
                <span>{formatHour(item.hour)}</span>
                <strong>{item.total}</strong>
              </div>
            ))}
          </section>
        </div>
      </div>
    );
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

  const renderGymSection = () => {
    if (section === 'inicio') {
      return gym ? renderGymOverview() : null;
    }

    if (!gym && section !== 'configuracoes') return null;

    if (section === 'alunos' || section === 'personais') {
      const role = section === 'alunos' ? 'student' : 'personal';
      return (
        <div className="gym-members-section">
          <div className="member-section-title">
            <h2>{section === 'alunos' ? 'Alunos da academia' : 'Personais da academia'}</h2>
            <p>Adicione, acompanhe e remova vinculos por e-mail.</p>
          </div>
          {renderMemberPanel(role, section === 'alunos' ? 'Alunos' : 'Personais')}
        </div>
      );
    }

    if (section === 'relatorios') {
      return renderGymReports();
    }

    if (section === 'treinos' || section === 'avaliacoes') {
      const labels = {
        treinos: ['Treinos', 'Visualizacao gerencial dos treinos criados e atribuidos pelos personais.'],
        avaliacoes: ['Avaliacoes', 'Visualizacao gerencial das avaliacoes fisicas realizadas pelos personais.']
      };
      const [title, description] = labels[section];
      return (
        <div className="workspace-card full-width">
          <span className="workspace-card-icon"><Icon name={section === 'treinos' ? 'dumbbell' : section === 'avaliacoes' ? 'clipboard' : 'chart'} size={30} /></span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      );
    }

    if (section === 'configuracoes') {
      return (
        <div className="workspace-card full-width">
          <span className="workspace-card-icon"><Icon name="settings" size={30} /></span>
          <h2>Configuracoes</h2>
          <p>{gym
            ? 'Edite dados cadastrais, responsavel, contato, endereco e status da academia.'
            : 'Configure os dados da academia para liberar a gestao completa.'}</p>
          <button className="workspace-action" onClick={() => navigate('/gym/setup')}>
            {gym ? 'Editar dados da academia' : 'Configurar academia'}
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="workspace-container">
      <div className="industrial-bg"></div>
      <div className="workspace-content">
        {activeProfile === 'gym' && (section === 'inicio' || section === 'configuracoes') && (
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
          </div>
        )}

        {activeProfile === 'gym' ? renderGymSection() : (
          <div className="workspace-grid">
            {content.cards.map(([title, description]) => (
              <div className="workspace-card" key={title}>
                <span className="workspace-card-icon"><Icon name="bolt" size={28} /></span>
                <h2>{title}</h2>
                <p>{description}</p>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
