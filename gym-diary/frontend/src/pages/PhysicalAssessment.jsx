import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import Icon from '../components/Icon';
import './PhysicalAssessment.css';

export default function PhysicalAssessment() {
  const { studentContext } = useAuth();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const gymNames = (studentContext.memberships || [])
    .map(membership => membership.gym?.name)
    .filter(Boolean)
    .join(', ');

  useEffect(() => {
    let mounted = true;

    api.getStudentAssessments()
      .then((response) => {
        if (mounted) setAssessments(response.assessments || []);
      })
      .catch(() => {
        if (mounted) setAssessments([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="assessment-container">
      <div className="industrial-bg"></div>
      <div className="gear gear-dash-1"></div>

      <div className="assessment-content">
        <div className="dashboard-header">
          <h1>AVALIACAO FISICA</h1>
          <div className="header-rivets">
            <span className="rivet"></span>
            <span className="rivet"></span>
            <span className="rivet"></span>
          </div>
          <p className="user-greeting">{gymNames || 'ACOMPANHAMENTO DA ACADEMIA'}</p>
        </div>

        {loading ? (
          <section className="assessment-panel">
            <div className="card-corner"></div>
            <span className="assessment-icon"><Icon name="clipboard" size={34} /></span>
            <h2>Carregando avaliacoes...</h2>
          </section>
        ) : assessments.length === 0 ? (
          <section className="assessment-panel">
            <div className="card-corner"></div>
            <span className="assessment-icon"><Icon name="clipboard" size={34} /></span>
            <h2>Nenhuma avaliacao cadastrada</h2>
            <p>As avaliacoes realizadas pelo personal aparecerao aqui em modo somente leitura.</p>
          </section>
        ) : (
          <div className="student-assessment-list">
            {assessments.map((assessment) => (
              <article className="student-assessment-card" key={assessment.id}>
                <div className="card-corner"></div>
                <div>
                  <span className="assessment-date">{assessment.assessmentDate}</span>
                  <h2>{assessment.goal || 'Avaliacao fisica'}</h2>
                  <p>{assessment.personal?.name || 'Personal'} {assessment.gym?.name ? `| ${assessment.gym.name}` : ''}</p>
                </div>
                <div className="assessment-metrics">
                  <span>IMC: {assessment.bmi || 'Nao informado'}</span>
                  {assessment.medicalAlert && <strong>{assessment.medicalAlertMessage}</strong>}
                </div>
                {assessment.workoutSuggestion && <p className="assessment-suggestion">{assessment.workoutSuggestion}</p>}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
