import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAlert } from '../contexts/AlertContext';
import Icon from './Icon';
import './BodyMetricsPanel.css';

const todayKey = () => new Date().toLocaleDateString('en-CA');

const metricGroups = [
  { title: 'Dados gerais', fields: [
    ['weight', 'Peso', 'Registre o peso corporal medido no dia.', 'kg'],
    ['height', 'Altura', 'Informe sua altura total.', 'cm']
  ] },
  { title: 'Membros superiores e tronco', fields: [
    ['relaxedBiceps', 'Bíceps relaxado', 'Braço estendido ao lado do corpo, medindo o ponto central.', 'cm'],
    ['contractedBiceps', 'Bíceps contraído', 'Cotovelo dobrado a 90 graus, fazendo força no pico do músculo.', 'cm'],
    ['forearm', 'Antebraço', 'Meça a região mais grossa do braço, logo abaixo do cotovelo.', 'cm'],
    ['chest', 'Tórax / Peitoral', 'Linha dos mamilos, com os braços relaxados e após soltar o ar.', 'cm'],
    ['shoulders', 'Ombros', 'Volta completa ao redor dos ombros, na parte mais larga do tronco.', 'cm']
  ] },
  { title: 'Região central', fields: [
    ['waist', 'Cintura', 'Parte mais estreita do tronco, cerca de dois dedos acima do umbigo.', 'cm'],
    ['abdomen', 'Abdômen', 'Meça exatamente em cima da linha do umbigo.', 'cm'],
    ['hip', 'Glúteo / Quadril', 'Ponto de maior volume do glúteo, mantendo os pés juntos.', 'cm']
  ] },
  { title: 'Membros inferiores', fields: [
    ['upperThigh', 'Coxa alta', 'Logo abaixo da dobra do glúteo, na base da virilha.', 'cm'],
    ['middleThigh', 'Coxa média', 'No meio do caminho entre o quadril e o joelho.', 'cm'],
    ['lowerThigh', 'Coxa baixa', 'Cerca de três dedos acima da patela, o osso do joelho.', 'cm'],
    ['calf', 'Panturrilha', 'Meça a parte mais larga e volumosa da panturrilha.', 'cm']
  ] }
];

const fields = metricGroups.flatMap((group) => group.fields);
const createEmptyForm = () => fields.reduce(
  (form, [key]) => ({ ...form, [key]: '' }),
  { recordedDate: todayKey(), notes: '' }
);
const formatValue = (value, unit = 'cm') => value === null || value === undefined
  ? '--'
  : `${Number(value).toLocaleString('pt-BR')} ${unit}`;

export default function BodyMetricsPanel() {
  const { notify, confirm } = useAlert();
  const [metrics, setMetrics] = useState([]);
  const [form, setForm] = useState(createEmptyForm);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const response = await api.getBodyMetrics();
      setMetrics(response.metrics || []);
    } catch (error) {
      notify({ message: error.message || 'Não foi possível carregar suas medidas.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMetrics(); }, []);

  const latest = metrics[0] || null;
  const previous = metrics[1] || null;

  const resetForm = () => {
    setForm(createEmptyForm());
    setEditingId(null);
  };

  const startNewMetric = () => {
    resetForm();
    setOpen(true);
  };

  const closeForm = () => {
    resetForm();
    setOpen(false);
  };

  const editMetric = (metric) => {
    const values = fields.reduce((current, [key]) => ({ ...current, [key]: metric[key] ?? '' }), {});
    setForm({ ...values, recordedDate: metric.recordedDate, notes: metric.notes || '' });
    setEditingId(metric.id);
    setOpen(true);
    window.requestAnimationFrame(() => {
      document.querySelector('.body-metrics-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const saveMetric = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (editingId) await api.updateBodyMetric(editingId, form);
      else await api.createBodyMetric(form);
      const wasEditing = Boolean(editingId);
      closeForm();
      await loadMetrics();
      notify({ message: wasEditing ? 'Medidas corporais atualizadas.' : 'Medidas corporais registradas.', type: 'success' });
    } catch (error) {
      notify({ message: error.message || 'Não foi possível salvar suas medidas.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const removeMetric = async (metric) => {
    const allowed = await confirm({
      title: 'Excluir registro?',
      message: 'Este conjunto de medidas será removido do seu histórico.',
      confirmLabel: 'Excluir'
    });
    if (!allowed) return;
    try {
      await api.deleteBodyMetric(metric.id);
      if (editingId === metric.id) closeForm();
      await loadMetrics();
      notify({ message: 'Registro de medidas excluído.', type: 'success' });
    } catch (error) {
      notify({ message: error.message || 'Não foi possível excluir o registro.', type: 'error' });
    }
  };

  return (
    <section className="body-metrics-card">
      <header className="body-metrics-heading">
        <div className="body-metrics-title"><span><Icon name="chart" size={21} /></span><div><small>Área privada do aluno</small><h2>Minhas medidas corporais</h2><p>Registre suas medidas e compare a evolução.</p></div></div>
        <button type="button" onClick={open ? closeForm : startNewMetric}><Icon name={open ? 'close' : 'plus'} size={17} /> {open ? 'Fechar' : 'Novo registro'}</button>
      </header>

      {open && (
        <form className="body-metrics-form" onSubmit={saveMetric}>
          <div className="body-metrics-form-intro">
            <div><strong>{editingId ? 'Editar medidas' : 'Registrar medidas'}</strong><span>{editingId ? 'Atualize este registro sem criar uma nova medição.' : 'Use sempre a mesma fita e posição para comparações mais confiáveis.'}</span></div>
            {editingId && <button type="button" onClick={startNewMetric}>Criar novo registro</button>}
          </div>
          <label className="body-metric-field date"><span>Data da medição</span><input type="date" value={form.recordedDate} onChange={(event) => setForm({ ...form, recordedDate: event.target.value })} required /></label>
          {metricGroups.map((group) => (
            <section className="body-metric-group" key={group.title}>
              <h3>{group.title}</h3>
              <div className="body-metrics-fields">
                {group.fields.map(([key, label, help, unit]) => (
                  <label className="body-metric-field" key={key}>
                    <span>{label}</span>
                    <div><input type="number" min="0" step="0.1" inputMode="decimal" value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} /><small>{unit}</small></div>
                    <em>{help}</em>
                  </label>
                ))}
              </div>
            </section>
          ))}
          <label className="body-metric-field notes"><span>Observações pessoais</span><textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Condições da medição ou alguma observação..." /></label>
          <button className="body-metrics-save" type="submit" disabled={saving}><Icon name="check" size={18} /> {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Salvar no meu histórico'}</button>
        </form>
      )}

      {loading ? <div className="body-metrics-empty">Carregando medidas...</div> : !latest ? (
        <div className="body-metrics-empty"><span><Icon name="chart" size={25} /></span><strong>Comece seu acompanhamento</strong><p>Registre suas medidas para visualizar comparações pessoais.</p></div>
      ) : (
        <>
          <div className="body-metrics-latest-heading"><div><small>Último registro</small><h3>Todas as medidas salvas</h3></div><strong>{new Date(`${latest.recordedDate}T12:00:00`).toLocaleDateString('pt-BR')}</strong></div>
          <div className="body-metrics-latest-groups">
            {metricGroups.map((group) => <section key={group.title} className="body-metrics-result-group"><h4>{group.title}</h4><div className="body-metrics-latest">{group.fields.map(([key, label, , unit]) => <article key={key}><span>{label}</span><strong>{formatValue(latest[key], unit)}</strong></article>)}</div></section>)}
          </div>

          {previous && <div className="body-metrics-comparison"><div className="body-comparison-heading"><div><small>Comparação</small><h3>Último registro x anterior</h3></div><span>{new Date(`${previous.recordedDate}T12:00:00`).toLocaleDateString('pt-BR')}</span></div><div className="body-comparison-grid">{fields.map(([key, label, , unit]) => {
            if (latest[key] === null || previous[key] === null) return null;
            const difference = Number((latest[key] - previous[key]).toFixed(1));
            return <article key={key}><span>{label}</span><strong>{formatValue(latest[key], unit)}</strong><small className={difference === 0 ? '' : difference > 0 ? 'up' : 'down'}>{difference > 0 ? '+' : ''}{difference.toLocaleString('pt-BR')} {unit}</small></article>;
          })}</div></div>}

          <div className="body-metrics-history"><div className="body-comparison-heading"><div><small>Linha do tempo</small><h3>Histórico de medições</h3></div><span>{metrics.length} registro{metrics.length === 1 ? '' : 's'}</span></div>{metrics.map((metric) => {
            const filled = fields.filter(([key]) => metric[key] !== null).slice(0, 3);
            return <article key={metric.id}><div><strong>{new Date(`${metric.recordedDate}T12:00:00`).toLocaleDateString('pt-BR')}</strong><span>{filled.map(([key, label, , unit]) => `${label}: ${metric[key]} ${unit}`).join(' · ') || 'Sem medidas informadas'}</span></div><div className="body-metric-history-actions"><button className="edit" type="button" onClick={() => editMetric(metric)} aria-label="Editar registro"><Icon name="pencil" size={16} /></button><button type="button" onClick={() => removeMetric(metric)} aria-label="Excluir registro"><Icon name="trash" size={16} /></button></div></article>;
          })}</div>
        </>
      )}
    </section>
  );
}
