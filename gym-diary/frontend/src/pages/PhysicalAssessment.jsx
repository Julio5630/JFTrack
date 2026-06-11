import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { useAlert } from '../contexts/AlertContext';
import Icon from '../components/Icon';
import './PhysicalAssessment.css';

const displayValue = (value, suffix = '') => (
  value !== null && value !== undefined && value !== '' ? `${value}${suffix}` : 'Não informado'
);

const formatDate = (date) => date
  ? new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  : 'Data não informada';

export default function PhysicalAssessment() {
  const { notify } = useAlert();
  const [assessments, setAssessments] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [sourceFilter, setSourceFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setErrorState] = useState('');
  const setError = (message) => {
    setErrorState(message);
    if (message) notify({ message, type: 'error' });
  };

  useEffect(() => {
    let mounted = true;

    api.getStudentAssessments()
      .then((response) => {
        if (!mounted) return;
        const nextAssessments = response.assessments || [];
        setAssessments(nextAssessments);
        setSelectedId(nextAssessments[0]?.id || null);
      })
      .catch((requestError) => {
        if (mounted) setError(requestError.message || 'Não foi possível carregar suas avaliações.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, []);

  const sources = useMemo(() => {
    const uniqueSources = new Map();
    assessments.forEach((item) => {
      const key = item.gym?.id ? `gym:${item.gym.id}` : 'independent';
      if (!uniqueSources.has(key)) {
        uniqueSources.set(key, {
          key,
          label: item.gym?.name || 'Atendimento independente'
        });
      }
    });
    return [...uniqueSources.values()];
  }, [assessments]);

  const filteredAssessments = useMemo(() => (
    sourceFilter === 'all'
      ? assessments
      : assessments.filter((item) => (
        item.gym?.id ? `gym:${item.gym.id}` === sourceFilter : sourceFilter === 'independent'
      ))
  ), [assessments, sourceFilter]);

  const assessment = useMemo(() => (
    filteredAssessments.find((item) => item.id === selectedId) || filteredAssessments[0] || null
  ), [filteredAssessments, selectedId]);

  const selectSource = (key) => {
    setSourceFilter(key);
    const nextAssessments = key === 'all'
      ? assessments
      : assessments.filter((item) => (
        item.gym?.id ? `gym:${item.gym.id}` === key : key === 'independent'
      ));
    setSelectedId(nextAssessments[0]?.id || null);
  };

  if (loading) {
    return <main className="assessment-page assessment-state"><span className="assessment-state-icon"><Icon name="clipboard" size={25} /></span><h1>Carregando avaliações...</h1></main>;
  }

  if (error || !assessment) {
    return (
      <main className="assessment-page">
        <div className="assessment-shell">
          <header className="assessment-heading">
            <div><span className="assessment-eyebrow">Acompanhamento profissional</span><h1>Avaliação física</h1><p>Seus resultados e orientações ficam reunidos aqui.</p></div>
            <span className="assessment-heading-icon"><Icon name="clipboard" size={25} /></span>
          </header>
          <section className="assessment-empty-card">
            <span><Icon name={error ? 'alert' : 'clipboard'} size={27} /></span>
            <h2>{error ? 'Não foi possível carregar' : 'Nenhuma avaliação disponível'}</h2>
            <p>{error || 'Quando um profissional concluir sua avaliação, o relatório aparecerá aqui.'}</p>
          </section>
        </div>
      </main>
    );
  }

  const measurements = assessment.measurements || {};
  const activity = assessment.activityHistory || {};
  const lifestyle = assessment.lifestyle || {};
  const availability = assessment.availability || {};
  const medical = assessment.medicalHistory || {};
  const professional = assessment.personal?.name || 'Profissional responsável';

  return (
    <main className="assessment-page">
      <div className="assessment-shell">
        <header className="assessment-heading">
          <div>
            <span className="assessment-eyebrow">Acompanhamento profissional</span>
            <h1>Avaliação física</h1>
            <p>Consulte seus resultados, cuidados e recomendações profissionais.</p>
          </div>
          <span className="assessment-heading-icon"><Icon name="clipboard" size={25} /></span>
        </header>

        {sources.length > 1 && (
          <section className="assessment-source-filter" aria-label="Filtrar avaliações por origem">
            <button type="button" className={sourceFilter === 'all' ? 'active' : ''} onClick={() => selectSource('all')}>
              Todas <span>{assessments.length}</span>
            </button>
            {sources.map((source) => (
              <button key={source.key} type="button" className={sourceFilter === source.key ? 'active' : ''} onClick={() => selectSource(source.key)}>
                {source.label}
                <span>{assessments.filter((item) => (item.gym?.id ? `gym:${item.gym.id}` : 'independent') === source.key).length}</span>
              </button>
            ))}
          </section>
        )}

        {filteredAssessments.length > 1 && (
          <section className="assessment-history-strip" aria-label="Histórico de avaliações">
            {filteredAssessments.map((item, index) => (
              <button key={item.id} type="button" className={item.id === assessment.id ? 'active' : ''} onClick={() => setSelectedId(item.id)}>
                <span>{index === 0 ? 'Mais recente' : 'Avaliação anterior'}</span>
                <strong>{formatDate(item.assessmentDate)}</strong>
                <small>{item.gym?.name || 'Atendimento independente'} · {item.personal?.name || 'Profissional'}</small>
              </button>
            ))}
          </section>
        )}

        <section className="assessment-hero-card">
          <div className="assessment-hero-copy">
            <span className="assessment-status"><Icon name="check" size={14} /> Avaliação concluída</span>
            <h2>{assessment.goal || 'Avaliação física e funcional'}</h2>
            <p>Realizada por <strong>{professional}</strong>{assessment.gym?.name ? ` na ${assessment.gym.name}` : ''}.</p>
          </div>
          <div className="assessment-date-block"><span>Data da avaliação</span><strong>{formatDate(assessment.assessmentDate)}</strong></div>
          <i aria-hidden="true"></i>
        </section>

        {assessment.medicalAlert && (
          <section className="assessment-alert-card">
            <span><Icon name="alert" size={21} /></span>
            <div><strong>Atenção às recomendações médicas</strong><p>{assessment.medicalAlertMessage || 'O profissional registrou um cuidado importante para seu acompanhamento.'}</p></div>
          </section>
        )}

        <section className="assessment-metric-grid">
          <article className="assessment-metric-card"><span className="emerald"><Icon name="chart" size={20} /></span><div><small>Peso</small><strong>{displayValue(assessment.weight || measurements.weight, ' kg')}</strong></div></article>
          <article className="assessment-metric-card"><span className="coral"><Icon name="person" size={20} /></span><div><small>Altura</small><strong>{displayValue(assessment.height || measurements.height, ' cm')}</strong></div></article>
          <article className="assessment-metric-card"><span className="lime"><Icon name="clipboard" size={20} /></span><div><small>IMC</small><strong>{displayValue(assessment.bmi || measurements.bmi)}</strong></div></article>
          <article className="assessment-metric-card"><span className="gold"><Icon name="chart" size={20} /></span><div><small>Gordura corporal</small><strong>{displayValue(assessment.bodyFat, '%')}</strong></div></article>
        </section>

        <div className="assessment-content-grid">
          <section className="assessment-report-card assessment-composition-card">
            <div className="assessment-card-heading"><span><Icon name="person" size={19} /></span><div><small>Medidas registradas</small><h2>Composição corporal</h2></div></div>
            <div className="assessment-data-list">
              <div><span>Circunferência abdominal</span><strong>{displayValue(measurements.abdominalCircumference, ' cm')}</strong></div>
              <div><span>Circunferência torácica</span><strong>{displayValue(measurements.chestCircumference, ' cm')}</strong></div>
              <div><span>Quadril</span><strong>{displayValue(measurements.hip, ' cm')}</strong></div>
              <div><span>Braços</span><strong>{measurements.rightArm || measurements.leftArm ? `${measurements.rightArm || '--'} / ${measurements.leftArm || '--'} cm` : 'Não informado'}</strong></div>
              <div><span>Coxas</span><strong>{measurements.rightThigh || measurements.leftThigh ? `${measurements.rightThigh || '--'} / ${measurements.leftThigh || '--'} cm` : 'Não informado'}</strong></div>
            </div>
          </section>

          <section className="assessment-report-card">
            <div className="assessment-card-heading"><span className="coral"><Icon name="flame" size={19} /></span><div><small>Rotina e experiência</small><h2>Contexto de treino</h2></div></div>
            <div className="assessment-data-list">
              <div><span>Nível atual</span><strong>{activity.currentLevel || 'Não informado'}</strong></div>
              <div><span>Tempo de treino</span><strong>{activity.trainingTime || 'Não informado'}</strong></div>
              <div><span>Dias disponíveis</span><strong>{availability.availableDays || 'Não informado'}</strong></div>
              <div><span>Tempo por treino</span><strong>{availability.timePerWorkout || 'Não informado'}</strong></div>
              <div><span>Sono</span><strong>{lifestyle.sleepHours || 'Não informado'}</strong></div>
            </div>
          </section>
        </div>

        {(assessment.workoutSuggestion || assessment.questionnaire || measurements.notes) && (
          <section className="assessment-recommendation-card">
            <span className="assessment-recommendation-icon"><Icon name="clipboard" size={22} /></span>
            <div>
              <small>Parecer do profissional</small>
              <h2>Orientação para sua evolução</h2>
              <p>{assessment.workoutSuggestion || measurements.notes || assessment.questionnaire}</p>
            </div>
          </section>
        )}

        <footer className="assessment-footer-note">
          <Icon name="shield" size={17} />
          <span>Este relatório é somente para consulta. Alterações devem ser realizadas pelo profissional responsável.</span>
        </footer>
      </div>
    </main>
  );
}
