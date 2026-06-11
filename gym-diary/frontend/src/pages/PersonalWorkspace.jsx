import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Reorder, useDragControls } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';
import { api } from '../services/api';
import Icon from '../components/Icon';
import './PersonalWorkspace.css';

const emptyAssessment = {
  studentId: '',
  assessmentDate: new Date().toISOString().slice(0, 10),
  personalData: {
    fullName: '',
    birthDate: '',
    phone: '',
    email: '',
    mainGoal: 'Emagrecimento'
  },
  medicalHistory: {
    heartProblem: false,
    chestPain: false,
    dizziness: false,
    highBloodPressure: false,
    diabetes: false,
    highCholesterol: false,
    continuousMedication: false,
    medicationName: '',
    recentSurgery: false,
    injuries: false,
    jointPain: false
  },
  activityHistory: {
    trainedBefore: false,
    trainingTime: '',
    currentLevel: '',
    hadPersonal: false,
    likedExercises: '',
    dislikedExercises: ''
  },
  lifestyle: {
    smoker: false,
    sleepHours: '',
    stressLevel: 'Baixo',
    nutrition: ''
  },
  availability: {
    availableDays: '',
    idealTime: '',
    timePerWorkout: '45 minutos'
  },
  measurements: {
    weight: '',
    height: '',
    bmi: '',
    abdominalCircumference: '',
    chestCircumference: '',
    rightArm: '',
    leftArm: '',
    rightThigh: '',
    leftThigh: '',
    hip: '',
    notes: ''
  },
  workoutSuggestion: '',
  status: 'completed'
};

const medicalAlertMessage = 'Atenção: recomendada liberação médica antes de treinos intensos.';
const medicalRiskFields = [
  'heartProblem',
  'chestPain',
  'dizziness',
  'highBloodPressure',
  'diabetes',
  'highCholesterol',
  'continuousMedication',
  'recentSurgery',
  'injuries',
  'jointPain'
];

const medicalRiskLabels = {
  heartProblem: 'Problema cardíaco',
  chestPain: 'Dor no peito',
  dizziness: 'Tontura ou desmaio',
  highBloodPressure: 'Pressão alta',
  diabetes: 'Diabetes',
  highCholesterol: 'Colesterol alto',
  continuousMedication: 'Medicamento contínuo',
  recentSurgery: 'Cirurgia recente',
  injuries: 'Lesões',
  jointPain: 'Dores articulares'
};

const emptyPreset = {
  name: '',
  splitType: '',
  frequency: '',
  notes: '',
  workouts: []
};

const sleepHourOptions = [
  'Menos de 5 horas',
  '5 a 6 horas',
  '6 a 7 horas',
  '7 a 8 horas',
  'Mais de 8 horas'
];

const availableDayOptions = [
  '1 dia',
  '2 dias',
  '3 dias',
  '4 dias',
  '5 dias',
  '6 dias',
  '7 dias'
];

const idealTimeOptions = [
  'Manha cedo',
  'Manha',
  'Horario de almoco',
  'Tarde',
  'Noite',
  'Horario flexivel'
];

const getAvailabilityDayCount = (availableDays = '') => {
  const match = String(availableDays).match(/\d+/);
  return Math.min(7, Math.max(1, Number(match?.[0]) || 3));
};

function WorkoutOrderCard({ selected, index, onMove, onSetsChange, onDurationChange, onRemove }) {
  const controls = useDragControls();
  const isCardio = selected.exercise.category === 'Cardio';

  return (
    <Reorder.Item
      as="article"
      value={selected.source}
      dragListener={false}
      dragControls={controls}
      className={`${isCardio ? 'cardio ' : ''}workout-sortable-card`}
      whileDrag={{ scale: 1.02, zIndex: 20, boxShadow: '0 18px 35px rgba(0,77,64,.18)' }}
      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
    >
      <button
        type="button"
        className="workout-drag-handle"
        onPointerDown={(event) => controls.start(event)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            onMove(index, index - 1);
          }
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            onMove(index, index + 1);
          }
        }}
        aria-label={`Arrastar ${selected.exercise.name} para mudar a ordem`}
      >
        <i></i><i></i><i></i><i></i><i></i><i></i>
      </button>
      <span className="workout-order">{String(index + 1).padStart(2, '0')}</span>
      <div className="workout-selected-copy"><strong>{selected.exercise.name}</strong><small>{selected.exercise.category || 'Geral'}</small></div>
      <div className={`workout-set-control ${isCardio ? 'duration' : ''}`} aria-label={isCardio ? `Duração de ${selected.exercise.name}` : `Séries de ${selected.exercise.name}`}>
        <button type="button" onClick={() => isCardio ? onDurationChange(selected.id, selected.durationMinutes - 5) : onSetsChange(selected.id, selected.defaultSets - 1)} aria-label={isCardio ? 'Diminuir duração' : 'Diminuir séries'}>−</button>
        <span><strong>{isCardio ? selected.durationMinutes : selected.defaultSets}</strong><small>{isCardio ? 'minutos' : 'séries'}</small></span>
        <button type="button" onClick={() => isCardio ? onDurationChange(selected.id, selected.durationMinutes + 5) : onSetsChange(selected.id, selected.defaultSets + 1)} aria-label={isCardio ? 'Aumentar duração' : 'Aumentar séries'}>+</button>
      </div>
      <button type="button" className="workout-remove-exercise" onClick={() => onRemove(selected.id)} aria-label={`Remover ${selected.exercise.name}`}><Icon name="trash" size={16} /></button>
    </Reorder.Item>
  );
}

function AssignedWorkoutOrderCard({ assignment, index, onMove, onStatusChange }) {
  const controls = useDragControls();

  return (
    <Reorder.Item
      as="article"
      value={assignment}
      dragListener={false}
      dragControls={controls}
      className="assignment-organizer-row"
      whileDrag={{ scale: 1.02, zIndex: 20, boxShadow: '0 18px 38px rgba(0,77,64,.2)' }}
      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
    >
      <button
        type="button"
        className="workout-drag-handle"
        onPointerDown={(event) => controls.start(event)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            onMove(index, index - 1);
          }
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            onMove(index, index + 1);
          }
        }}
        aria-label={`Arrastar ${assignment.template?.name || 'treino'} para mudar a ordem`}
      >
        <i></i><i></i><i></i><i></i><i></i><i></i>
      </button>
      <span className="assignment-organizer-position">{String(index + 1).padStart(2, '0')}</span>
      <span className="assignment-organizer-icon"><Icon name="dumbbell" size={19} /></span>
      <div><strong>{assignment.template?.name || 'Treino'}</strong><small>{assignment.notes || 'Sem orientações adicionais'}</small></div>
      <button type="button" className={assignment.status === 'active' ? 'active' : ''} onClick={() => onStatusChange(assignment)}>{assignment.status === 'active' ? 'Ativo' : 'Pausado'}</button>
    </Reorder.Item>
  );
}

export default function PersonalWorkspace() {
  const { section = 'inicio' } = useParams();
  const { data, refreshData } = useData();
  const { user } = useAuth();
  const { notify } = useAlert();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [gyms, setGyms] = useState([]);
  const [selectedPersonalGymId, setSelectedPersonalGymId] = useState(() => localStorage.getItem('selectedPersonalGymId') || '');
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [viewingStudent, setViewingStudent] = useState(false);
  const [search, setSearch] = useState('');
  const setMessage = (message) => message && notify(message);
  const [templateForm, setTemplateForm] = useState({ name: '', exercises: [] });
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [exerciseCategory, setExerciseCategory] = useState('Todos');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [assigningWorkout, setAssigningWorkout] = useState(false);
  const [organizingStudent, setOrganizingStudent] = useState(null);
  const [organizedAssignments, setOrganizedAssignments] = useState([]);
  const [organizerTemplateId, setOrganizerTemplateId] = useState('');
  const [savingAssignmentOrder, setSavingAssignmentOrder] = useState(false);
  const [studentInviteForm, setStudentInviteForm] = useState({ email: '', gymId: '' });
  const [assignmentForm, setAssignmentForm] = useState({ studentEmail: '', templateId: '', notes: '', gymId: '' });
  const [assessmentForm, setAssessmentForm] = useState(emptyAssessment);
  const [assessmentStep, setAssessmentStep] = useState(0);
  const [assessmentView, setAssessmentView] = useState('list');
  const [viewingAssessment, setViewingAssessment] = useState(null);
  const [assessmentFilter, setAssessmentFilter] = useState('all');
  const [assessmentSearch, setAssessmentSearch] = useState('');
  const [assessmentStudentEmail, setAssessmentStudentEmail] = useState('');
  const [preset, setPreset] = useState(emptyPreset);
  const [expandedPresetWorkouts, setExpandedPresetWorkouts] = useState({});

  const templates = data?.workoutTemplates || [];
  const exercises = data?.exercises || [];
  const selectedPersonalGym = gyms.find((gym) => String(gym.id) === String(selectedPersonalGymId)) || null;

  useEffect(() => {
    if (!viewingAssessment && !viewingStudent && !organizingStudent) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setViewingAssessment(null);
        setViewingStudent(false);
        setOrganizingStudent(null);
      }
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [viewingAssessment, viewingStudent, organizingStudent]);

  const resolvePersonalGymId = (gymList, preferredGymId = '') => {
    if (!gymList.length) return '';
    if (preferredGymId && gymList.some((gym) => String(gym.id) === String(preferredGymId))) {
      return String(preferredGymId);
    }
    return gymList.length === 1 ? String(gymList[0].id) : '';
  };

  const loadPersonalData = async (gymIdOverride = selectedPersonalGymId, searchValue = search) => {
    const gymsResponse = await api.getPersonalGyms();
    const gymList = gymsResponse.gyms || [];
    const activeGymId = resolvePersonalGymId(gymList, gymIdOverride || localStorage.getItem('selectedPersonalGymId') || '');

    setGyms(gymList);
    setSelectedPersonalGymId(activeGymId);

    if (activeGymId) {
      localStorage.setItem('selectedPersonalGymId', activeGymId);
    } else {
      localStorage.removeItem('selectedPersonalGymId');
      setSummary(null);
      setStudents([]);
      setAssignments([]);
      setAssessments([]);
      setSelectedStudent(null);
      setStudentProfile(null);
      return;
    }

    const [summaryResponse, studentsResponse, assignmentsResponse, assessmentsResponse] = await Promise.all([
      api.getPersonalSummary(activeGymId),
      api.getPersonalStudents(searchValue, activeGymId),
      api.getPersonalAssignments(activeGymId),
      api.getPersonalAssessments('', activeGymId)
    ]);

    setSummary(summaryResponse);
    setStudents(studentsResponse.students || []);
    setAssignments(assignmentsResponse.assignments || []);
    setAssessments(assessmentsResponse.assessments || []);
    setStudentInviteForm((current) => ({ ...current, gymId: activeGymId }));
    setAssignmentForm((current) => ({ ...current, gymId: activeGymId }));
  };

  useEffect(() => {
    loadPersonalData().catch((error) => setMessage(error.message || 'Erro ao carregar painel do personal'));
  }, []);

  useEffect(() => {
    const handlePersonalGymReset = () => {
      setSelectedPersonalGymId('');
      setSummary(null);
      setStudents([]);
      setAssignments([]);
      setAssessments([]);
      setSelectedStudent(null);
      setStudentProfile(null);
      loadPersonalData('', '').catch((error) => setMessage(error.message || 'Erro ao carregar academias do personal'));
    };

    window.addEventListener('personalGymSelectionReset', handlePersonalGymReset);
    return () => window.removeEventListener('personalGymSelectionReset', handlePersonalGymReset);
  }, []);

  const handleSearch = async (event) => {
    event.preventDefault();
    const response = await api.getPersonalStudents(search, selectedPersonalGymId);
    setStudents(response.students || []);
  };

  const clearStudentSearch = async () => {
    setSearch('');
    const response = await api.getPersonalStudents('', selectedPersonalGymId);
    setStudents(response.students || []);
  };

  const openStudent = async (student) => {
    setSelectedStudent(student);
    setStudentProfile(null);
    setViewingStudent(true);
    try {
      const response = await api.getPersonalStudent(student.id, selectedPersonalGymId);
      setStudentProfile(response);
      setAssignmentForm((current) => ({ ...current, studentEmail: student.email, gymId: student.gym?.id || current.gymId }));
      setAssessmentForm((current) => ({ ...current, studentId: student.id }));
    } catch (error) {
      setViewingStudent(false);
      setMessage(error.message || 'Erro ao abrir perfil do aluno.');
    }
  };

  const addStudentByEmail = async () => {
    if (!studentInviteForm.email.trim()) {
      setMessage('Informe o e-mail do aluno cadastrado.');
      return;
    }

    if (!selectedPersonalGymId) {
      setMessage('Selecione a academia para vincular o aluno.');
      return;
    }

    try {
      const response = await api.addPersonalStudent(studentInviteForm.email.trim(), selectedPersonalGymId);
      setMessage(response.message || 'Aluno vinculado a academia.');
      setStudentInviteForm({ email: '', gymId: selectedPersonalGymId });
      await loadPersonalData();
    } catch (error) {
      setMessage(error.message || 'Erro ao vincular aluno.');
    }
  };

  const toggleExercise = (exerciseId) => {
    const exercise = exercises.find((item) => item.id === exerciseId);
    const isCardio = exercise?.category === 'Cardio';
    setTemplateForm((current) => {
      const exists = current.exercises.some((item) => item.id === exerciseId);
      return {
        ...current,
        exercises: exists
          ? current.exercises.filter((item) => item.id !== exerciseId)
          : [...current.exercises, isCardio
            ? { id: exerciseId, defaultSets: 1, durationMinutes: 20 }
            : { id: exerciseId, defaultSets: 3 }]
      };
    });
  };

  const updateExerciseSets = (exerciseId, value) => {
    const defaultSets = Math.min(10, Math.max(1, Number(value) || 1));
    setTemplateForm((current) => ({
      ...current,
      exercises: current.exercises.map((item) => (
        item.id === exerciseId ? { ...item, defaultSets } : item
      ))
    }));
  };

  const updateExerciseDuration = (exerciseId, value) => {
    const durationMinutes = Math.min(180, Math.max(1, Number(value) || 1));
    setTemplateForm((current) => ({
      ...current,
      exercises: current.exercises.map((item) => (
        item.id === exerciseId ? { ...item, durationMinutes } : item
      ))
    }));
  };

  const reorderTemplateExercise = (fromIndex, toIndex) => {
    setTemplateForm((current) => {
      if (toIndex < 0 || toIndex >= current.exercises.length || fromIndex === toIndex) return current;
      const exercises = [...current.exercises];
      const [movedExercise] = exercises.splice(fromIndex, 1);
      exercises.splice(toIndex, 0, movedExercise);
      return { ...current, exercises };
    });
  };

  const saveTemplate = async () => {
    if (!templateForm.name.trim() || templateForm.exercises.length === 0) {
      setMessage('Informe o nome e escolha pelo menos um exercício para o treino.');
      return;
    }

    setSavingTemplate(true);
    try {
      if (editingTemplateId) {
        await api.updateTemplate(editingTemplateId, templateForm.name.trim(), templateForm.exercises);
        setMessage('Treino atualizado com sucesso.');
      } else {
        await api.createTemplate(templateForm.name.trim(), templateForm.exercises);
        setMessage('Treino criado com sucesso.');
      }

      setTemplateForm({ name: '', exercises: [] });
      setEditingTemplateId(null);
      setExerciseSearch('');
      setExerciseCategory('Todos');
      await refreshData();
      await loadPersonalData();
    } catch (error) {
      setMessage(error.message || 'Não foi possível salvar o treino.');
    } finally {
      setSavingTemplate(false);
    }
  };

  const editTemplate = (template) => {
    setEditingTemplateId(template.id);
    setTemplateForm({
      name: template.name,
      exercises: (template.exercises || []).map((exercise) => ({
        id: exercise.id,
        defaultSets: exercise.durationMinutes ? 1 : exercise.defaultSets || 3,
        durationMinutes: exercise.durationMinutes || null
      }))
    });
  };

  const assignWorkout = async () => {
    if (!assignmentForm.studentEmail.trim() || !assignmentForm.templateId) {
      setMessage('Informe o e-mail do aluno e selecione um treino.');
      return;
    }

    if (!selectedPersonalGymId) {
      setMessage('Selecione a academia para atribuir o treino.');
      return;
    }

    setAssigningWorkout(true);
    try {
      await api.assignPersonalWorkout(
        assignmentForm.studentEmail.trim(),
        assignmentForm.templateId,
        assignmentForm.notes,
        selectedPersonalGymId
      );
      setMessage('Treino atribuido ao aluno. Ele pode manter entre 1 e 7 treinos ativos na semana.');
      setAssignmentForm({ studentEmail: assignmentForm.studentEmail, templateId: '', notes: '', gymId: selectedPersonalGymId });
      await loadPersonalData();
      if (selectedStudent) await openStudent(selectedStudent);
    } catch (error) {
      setMessage(error.message || 'Erro ao atribuir treino.');
    } finally {
      setAssigningWorkout(false);
    }
  };

  const toggleAssignmentStatus = async (assignment) => {
    await api.updatePersonalAssignment(assignment.id, {
      status: assignment.status === 'active' ? 'inactive' : 'active',
      notes: assignment.notes || ''
    });
    await loadPersonalData();
    if (selectedStudent) await openStudent(selectedStudent);
  };

  const getAssignmentsForStudent = (studentId, source = assignments) => source
    .filter((assignment) => Number(assignment.studentUserId || assignment.student?.id) === Number(studentId))
    .sort((first, second) => (first.displayOrder || 0) - (second.displayOrder || 0));

  const openAssignmentOrganizer = (student) => {
    setOrganizingStudent(student);
    setOrganizedAssignments(getAssignmentsForStudent(student.id));
    setOrganizerTemplateId('');
  };

  const moveOrganizedAssignment = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= organizedAssignments.length || fromIndex === toIndex) return;
    setOrganizedAssignments((current) => {
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const refreshOrganizerAssignments = async () => {
    const response = await api.getPersonalAssignments(selectedPersonalGymId);
    const nextAssignments = response.assignments || [];
    setAssignments(nextAssignments);
    if (organizingStudent) setOrganizedAssignments(getAssignmentsForStudent(organizingStudent.id, nextAssignments));
    return nextAssignments;
  };

  const toggleOrganizerAssignment = async (assignment) => {
    try {
      await api.updatePersonalAssignment(assignment.id, {
        status: assignment.status === 'active' ? 'inactive' : 'active',
        notes: assignment.notes || ''
      });
      await refreshOrganizerAssignments();
    } catch (error) {
      setMessage(error.message || 'Não foi possível atualizar o treino.');
    }
  };

  const addOrganizerAssignment = async () => {
    if (!organizerTemplateId || !organizingStudent?.email) return;
    setAssigningWorkout(true);
    try {
      await api.assignPersonalWorkout(organizingStudent.email, organizerTemplateId, '', selectedPersonalGymId);
      await refreshOrganizerAssignments();
      setOrganizerTemplateId('');
      setMessage('Treino adicionado ao aluno.');
    } catch (error) {
      setMessage(error.message || 'Não foi possível atribuir o treino.');
    } finally {
      setAssigningWorkout(false);
    }
  };

  const saveOrganizerOrder = async () => {
    if (!organizingStudent || organizedAssignments.length === 0) return;
    setSavingAssignmentOrder(true);
    try {
      await api.reorderPersonalAssignments(
        organizingStudent.id,
        organizedAssignments.map((assignment) => assignment.id),
        selectedPersonalGymId
      );
      await refreshOrganizerAssignments();
      setMessage('Ordem dos treinos atualizada.');
      setOrganizingStudent(null);
    } catch (error) {
      setMessage(error.message || 'Não foi possível salvar a ordem dos treinos.');
    } finally {
      setSavingAssignmentOrder(false);
    }
  };

  const selectPersonalGym = async (gymId) => {
    setSelectedPersonalGymId(String(gymId));
    if (gymId) {
      localStorage.setItem('selectedPersonalGymId', String(gymId));
    } else {
      localStorage.removeItem('selectedPersonalGymId');
    }
    setMessage('');
    setSearch('');
    setSelectedStudent(null);
    setStudentProfile(null);
    setStudentInviteForm({ email: '', gymId: String(gymId) });
    setAssignmentForm({ studentEmail: '', templateId: '', notes: '', gymId: String(gymId) });
    await loadPersonalData(String(gymId), '');
  };

  const findExercise = (patterns, fallbackCategory = '') => {
    const normalizedPatterns = patterns.map((pattern) => pattern.toLowerCase());
    return exercises.find((exercise) => normalizedPatterns.some((pattern) => exercise.name.toLowerCase().includes(pattern)))
      || exercises.find((exercise) => fallbackCategory && exercise.category === fallbackCategory)
      || exercises[0];
  };

  const buildPresetExercise = (patterns, fallbackCategory, sets, reps, note = '') => {
    const exercise = findExercise(patterns, fallbackCategory);
    if (!exercise) return null;
    const isCardio = exercise.category === 'Cardio';
    return {
      id: exercise.id,
      name: exercise.name,
      category: exercise.category,
      defaultSets: isCardio ? 1 : sets,
      defaultReps: isCardio ? '0' : reps,
      durationMinutes: isCardio ? 20 : null,
      note
    };
  };

  const generateSuggestion = () => {
    const goal = assessmentForm.personalData.mainGoal;
    const level = assessmentForm.activityHistory.currentLevel || 'Sedentario';
    const days = getAvailabilityDayCount(assessmentForm.availability.availableDays);
    const kneePain = assessmentForm.medicalHistory.jointPain || /joelho/i.test(assessmentForm.measurements.notes || '');
    const shoulderPain = assessmentForm.medicalHistory.injuries || /ombro/i.test(assessmentForm.measurements.notes || '');
    const isBeginner = ['Sedentario', 'Leve'].includes(level);
    const isManyDays = days >= 4;
    const splitType = days <= 2 || isBeginner ? 'Full body' : isManyDays ? 'A/B/C' : 'A/B';
    const frequency = `${days}x por semana`;
    const notes = [];

    if (goal === 'Reabilitacao') notes.push('Treino leve. Revisao cuidadosa obrigatoria antes de liberar ao aluno.');
    if (kneePain) notes.push('Evitar agachamento pesado e alta sobrecarga no joelho.');
    if (shoulderPain) notes.push('Evitar desenvolvimento pesado e movimentos acima da cabeca.');
    if (goal === 'Emagrecimento') notes.push('Combinar musculacao com condicionamento de baixa a moderada intensidade.');
    if (goal === 'Condicionamento') notes.push('Priorizar multiarticulares, pausas controladas e volume moderado.');

    const baseSets = goal === 'Reabilitacao' ? 2 : isBeginner ? 3 : 4;
    const reps = goal === 'Hipertrofia' ? '8-12' : goal === 'Condicionamento' || goal === 'Emagrecimento' ? '12-15' : '10-12';
    const suggested = [
      buildPresetExercise(kneePain ? ['mesa flexora', 'panturrilha'] : ['agachamento', 'leg press'], 'Perna', baseSets, reps, kneePain ? 'Substituir se houver dor no joelho.' : ''),
      buildPresetExercise(['puxada', 'remada baixa', 'remada'], 'Costas', baseSets, reps),
      buildPresetExercise(['supino', 'flexao'], 'Peito', baseSets, reps),
      buildPresetExercise(shoulderPain ? ['elevacao lateral'] : ['desenvolvimento', 'elevacao lateral'], 'Ombro', goal === 'Reabilitacao' ? 2 : 3, shoulderPain ? '12-15' : reps, shoulderPain ? 'Evitar carga alta e amplitude dolorosa.' : ''),
      buildPresetExercise(['rosca'], 'Biceps', 2, reps),
      buildPresetExercise(['triceps'], 'Triceps', 2, reps),
      buildPresetExercise(['prancha', 'abdominal'], 'Outros', 3, goal === 'Condicionamento' ? '30-45s' : '12-15')
    ].filter(Boolean);

    const presetName = `${goal} - ${splitType} inicial`;
    const splitLabels = splitType === 'A/B/C'
      ? ['Treino A', 'Treino B', 'Treino C']
      : splitType === 'A/B'
        ? ['Treino A', 'Treino B']
        : ['Full body'];
    const workouts = Array.from({ length: days }, (_, index) => {
      const label = splitLabels[index % splitLabels.length];
      const offset = index % Math.max(1, suggested.length);
      const rotatedExercises = [...suggested.slice(offset), ...suggested.slice(0, offset)].slice(0, Math.min(6, suggested.length));

      return {
        name: `${label} - Semana ${index + 1}`,
        splitType,
        frequency: `${index + 1}/${days} da semana`,
        notes: notes.join('\n') || 'Treino gerado pela avaliacao. Revise antes de finalizar.',
        exercises: rotatedExercises
      };
    });
    const nextPreset = {
      name: presetName,
      splitType,
      frequency,
      notes: notes.join('\n') || 'Preset inicial gerado pela avaliacao. Revise exercicios, series, repeticoes e frequencia antes de liberar.',
      workouts
    };

    setPreset(nextPreset);
    setExpandedPresetWorkouts({ 0: true });
    setAssessmentForm((current) => ({
      ...current,
      workoutSuggestion: `${presetName}\n${frequency}\n${nextPreset.notes}`
    }));
  };

  useEffect(() => {
    if (assessmentView !== 'form') return;
    if (assessmentStep !== 7) return;
    if (preset.workouts.length > 0) return;
    generateSuggestion();
  }, [assessmentView, assessmentStep, preset.workouts.length]);

  const updateAssessmentGroup = (group, field, value) => {
    setAssessmentForm((current) => ({
      ...current,
      [group]: {
        ...current[group],
        [field]: value
      }
    }));
  };

  const calculateBmi = () => {
    const weight = Number(assessmentForm.measurements.weight);
    const height = Number(assessmentForm.measurements.height);
    if (!weight || !height) return '';
    const heightInMeters = height > 3 ? height / 100 : height;
    return (weight / (heightInMeters * heightInMeters)).toFixed(2);
  };

  const assessmentHasMedicalAlert = medicalRiskFields.some((field) => Boolean(assessmentForm.medicalHistory[field]));

  const resetAssessmentFlow = () => {
    setAssessmentForm(emptyAssessment);
    setAssessmentStudentEmail('');
    setAssessmentStep(0);
    setPreset(emptyPreset);
    setExpandedPresetWorkouts({});
    setAssessmentView('list');
  };

  const startAssessmentFlow = (student = null) => {
    setAssessmentStudentEmail(student?.email || '');
    setAssessmentForm({
      ...emptyAssessment,
      studentId: student?.id || '',
      personalData: {
        ...emptyAssessment.personalData,
        fullName: student?.name || '',
        email: student?.email || ''
      }
    });
    setAssessmentStep(0);
    setPreset(emptyPreset);
    setExpandedPresetWorkouts({});
    setAssessmentView('form');
  };

  const saveAssessment = async (statusOverride = null) => {
    if (!assessmentForm.studentId || !assessmentForm.assessmentDate) {
      setMessage('Selecione aluno e data para salvar a avaliacao.');
      return;
    }

    const assessmentPayload = {
      ...assessmentForm,
      gymId: selectedPersonalGymId,
      status: statusOverride || assessmentForm.status || 'completed'
    };

    try {
      if (assessmentForm.id) {
        await api.updatePersonalAssessment(assessmentForm.id, assessmentPayload);
      } else {
        await api.createPersonalAssessment(assessmentPayload);
      }

      if ((statusOverride || assessmentForm.status) === 'completed') {
        await createAndAssignPresetWorkouts();
        setMessage('Avaliacao concluida e plano de treinos atribuido ao aluno.');
      } else {
        setMessage(statusOverride === 'draft' ? 'Rascunho salvo.' : 'Avaliacao salva.');
      }
    } catch (error) {
      setMessage(error.message || 'Erro ao concluir avaliacao.');
      return;
    }

    setAssessmentForm({ ...emptyAssessment, studentId: assessmentForm.studentId });
    setAssessmentStep(0);
    setAssessmentView('list');
    await refreshData();
    await loadPersonalData();
    if (selectedStudent) await openStudent(selectedStudent);
  };

  const findAssessmentStudentByEmail = () => {
    const email = assessmentStudentEmail.trim().toLowerCase();
    if (!email) {
      setMessage('Informe o e-mail do aluno.');
      return;
    }

    const student = students.find((item) => item.email?.toLowerCase() === email);
    if (!student) {
      setAssessmentForm((current) => ({ ...current, studentId: '' }));
      setMessage('Aluno nao encontrado nesta academia ativa.');
      return;
    }

    setMessage('');
    setAssessmentForm((current) => ({
      ...current,
      studentId: student.id,
      personalData: {
        ...current.personalData,
        fullName: student.name || current.personalData.fullName,
        email: student.email || current.personalData.email
      }
    }));
  };

  const updatePresetWorkout = (workoutIndex, updates) => {
    setPreset((current) => ({
      ...current,
      workouts: current.workouts.map((workout, index) => (
        index === workoutIndex ? { ...workout, ...updates } : workout
      ))
    }));
  };

  const updatePresetWorkoutExercise = (workoutIndex, exerciseIndex, field, value) => {
    setPreset((current) => ({
      ...current,
      workouts: current.workouts.map((workout, index) => {
        if (index !== workoutIndex) return workout;
        return {
          ...workout,
          exercises: workout.exercises.map((exercise, currentExerciseIndex) => (
            currentExerciseIndex === exerciseIndex ? { ...exercise, [field]: value } : exercise
          ))
        };
      })
    }));
  };

  const addPresetExercise = (workoutIndex, exerciseId) => {
    const exercise = exercises.find((item) => Number(item.id) === Number(exerciseId));
    const workout = preset.workouts[workoutIndex];
    if (!exercise || !workout || workout.exercises.some((item) => Number(item.id) === Number(exercise.id))) return;

    setPreset((current) => ({
      ...current,
      workouts: current.workouts.map((item, index) => (
        index === workoutIndex
          ? {
              ...item,
              exercises: [
                ...item.exercises,
                exercise.category === 'Cardio'
                  ? { id: exercise.id, name: exercise.name, category: exercise.category, defaultSets: 1, defaultReps: '0', durationMinutes: 20, note: '' }
                  : { id: exercise.id, name: exercise.name, category: exercise.category, defaultSets: 3, defaultReps: '10-12', durationMinutes: null, note: '' }
              ]
            }
          : item
      ))
    }));
  };

  const removePresetExercise = (workoutIndex, exerciseIndex) => {
    setPreset((current) => ({
      ...current,
      workouts: current.workouts.map((workout, index) => (
        index === workoutIndex
          ? { ...workout, exercises: workout.exercises.filter((_, currentExerciseIndex) => currentExerciseIndex !== exerciseIndex) }
          : workout
      ))
    }));
  };

  const togglePresetWorkout = (workoutIndex) => {
    setExpandedPresetWorkouts((current) => ({
      ...current,
      [workoutIndex]: !current[workoutIndex]
    }));
  };

  const updatePresetWorkoutCount = (nextCount) => {
    const count = Math.min(7, Math.max(1, Number(nextCount) || 1));
    setPreset((current) => {
      const currentWorkouts = current.workouts || [];
      if (count <= currentWorkouts.length) {
        setExpandedPresetWorkouts((expanded) => Object.fromEntries(
          Object.entries(expanded).filter(([index]) => Number(index) < count)
        ));
        return { ...current, workouts: currentWorkouts.slice(0, count), frequency: `${count}x por semana` };
      }

      const sourceExercises = currentWorkouts[0]?.exercises || [];
      setExpandedPresetWorkouts((expanded) => {
        const nextExpanded = { ...expanded };
        for (let index = currentWorkouts.length; index < count; index += 1) {
          nextExpanded[index] = true;
        }
        return nextExpanded;
      });
      const additions = Array.from({ length: count - currentWorkouts.length }, (_, index) => ({
        name: `Treino ${currentWorkouts.length + index + 1}`,
        splitType: current.splitType || 'Full body',
        frequency: `${currentWorkouts.length + index + 1}/${count} da semana`,
        notes: current.notes || '',
        exercises: sourceExercises
      }));

      return {
        ...current,
        frequency: `${count}x por semana`,
        workouts: [...currentWorkouts, ...additions]
      };
    });
  };

  const createAndAssignPresetWorkouts = async () => {
    const selectedAssessmentStudent = getAssessmentStudent();
    if (!selectedAssessmentStudent?.email || !assessmentForm.studentId) {
      throw new Error('Selecione o aluno antes de concluir a avaliacao.');
    }

    const validWorkouts = (preset.workouts || []).filter((workout) => workout.name?.trim() && workout.exercises?.length > 0);
    if (validWorkouts.length === 0) {
      throw new Error('Monte pelo menos um treino no preset antes de concluir.');
    }

    if (validWorkouts.length > 7) {
      throw new Error('O plano pode ter no maximo 7 treinos.');
    }

    for (const workout of validWorkouts) {
      const response = await api.createTemplate(
        workout.name.trim(),
        workout.exercises.map((exercise) => ({
          id: exercise.id,
          defaultSets: exercise.defaultSets,
          defaultReps: exercise.defaultReps,
          durationMinutes: exercise.durationMinutes || null
        })),
        {
          frequency: workout.frequency || preset.frequency,
          splitType: workout.splitType || preset.splitType,
          notes: workout.notes || preset.notes,
          assignedStudentUserId: assessmentForm.studentId,
          gymId: selectedPersonalGymId
        }
      );

      await api.assignPersonalWorkout(
        selectedAssessmentStudent.email,
        response.templateId,
        workout.notes || preset.notes,
        selectedPersonalGymId
      );
    }
  };

  const savePresetAsTemplate = async () => {
    const validWorkouts = (preset.workouts || []).filter((workout) => workout.name?.trim() && workout.exercises?.length > 0);
    if (validWorkouts.length === 0) {
      setMessage('Gere e revise pelo menos um treino antes de salvar.');
      return;
    }

    for (const workout of validWorkouts) {
      await api.createTemplate(
        workout.name.trim(),
        workout.exercises.map((exercise) => ({
          id: exercise.id,
          defaultSets: exercise.defaultSets,
          defaultReps: exercise.defaultReps,
          durationMinutes: exercise.durationMinutes || null
        })),
        {
          frequency: workout.frequency || preset.frequency,
          splitType: workout.splitType || preset.splitType,
          notes: workout.notes || preset.notes
        }
      );
    }

    setMessage('Plano salvo como modelos. Revise a aba Treinos para atribuir/liberar ao aluno.');
    setPreset(emptyPreset);
    await refreshData();
    await loadPersonalData();
  };

  const editAssessment = (assessment) => {
    setViewingAssessment(null);
    setAssessmentForm({
      id: assessment.id,
      studentId: assessment.studentUserId,
      assessmentDate: assessment.assessmentDate,
      personalData: { ...emptyAssessment.personalData, ...(assessment.personalData || {}), mainGoal: assessment.goal || assessment.personalData?.mainGoal || 'Emagrecimento' },
      medicalHistory: { ...emptyAssessment.medicalHistory, ...(assessment.medicalHistory || {}) },
      activityHistory: { ...emptyAssessment.activityHistory, ...(assessment.activityHistory || {}) },
      lifestyle: { ...emptyAssessment.lifestyle, ...(assessment.lifestyle || {}) },
      availability: { ...emptyAssessment.availability, ...(assessment.availability || {}) },
      measurements: {
        ...emptyAssessment.measurements,
        ...(assessment.measurements || {}),
        weight: assessment.weight || assessment.measurements?.weight || '',
        height: assessment.height || assessment.measurements?.height || '',
        bmi: assessment.bmi || assessment.measurements?.bmi || ''
      },
      workoutSuggestion: assessment.workoutSuggestion || '',
      status: assessment.status || 'completed'
    });
    setAssessmentStep(0);
    setPreset(emptyPreset);
    setAssessmentView('form');
  };

  const renderStudentDetails = () => {
    if (!viewingStudent || !selectedStudent) return null;
    const profile = studentProfile;
    const activeWorkouts = profile?.assignments?.filter((assignment) => assignment.status === 'active') || [];
    const latestAssessment = profile?.assessments?.[0] || null;

    const createWorkoutForStudent = () => {
      setAssignmentForm((current) => ({ ...current, studentEmail: selectedStudent.email, gymId: selectedStudent.gym?.id || current.gymId }));
      setViewingStudent(false);
      navigate('/personal/treinos');
    };

    const assessStudent = () => {
      setViewingStudent(false);
      startAssessmentFlow(selectedStudent);
    };

    return createPortal(
      <div className="personal-student-detail-overlay" onMouseDown={() => setViewingStudent(false)}>
        <article className="personal-student-detail" role="dialog" aria-modal="true" aria-labelledby="student-detail-title" onMouseDown={(event) => event.stopPropagation()}>
          <header className="student-detail-header">
            <div className="student-detail-avatar">{selectedStudent.name?.trim().charAt(0).toUpperCase() || 'A'}</div>
            <div>
              <span>Perfil do aluno</span>
              <h2 id="student-detail-title">{selectedStudent.name}</h2>
              <p>{selectedStudent.email} · {selectedStudent.gym?.name || selectedPersonalGym?.name}</p>
            </div>
            <button type="button" onClick={() => setViewingStudent(false)} aria-label="Fechar perfil"><Icon name="close" size={19} /></button>
          </header>

          {!profile ? (
            <div className="student-detail-loading"><span><Icon name="person" size={24} /></span><strong>Carregando acompanhamento...</strong></div>
          ) : (
            <div className="student-detail-body">
              <section className="student-detail-summary">
                <article><Icon name="dumbbell" size={18} /><div><strong>{profile.history?.length || 0}</strong><span>Treinos registrados</span></div></article>
                <article><Icon name="check" size={18} /><div><strong>{activeWorkouts.length}</strong><span>Treinos ativos</span></div></article>
                <article><Icon name="clipboard" size={18} /><div><strong>{profile.assessments?.length || 0}</strong><span>Avaliações</span></div></article>
                <article><Icon name={latestAssessment?.medicalAlert ? 'alert' : 'shield'} size={18} /><div><strong>{latestAssessment?.medicalAlert ? 'Atenção' : 'Regular'}</strong><span>Status clínico</span></div></article>
              </section>

              <div className="student-detail-grid">
                <section className="student-detail-card workouts">
                  <div className="student-detail-card-heading"><div><h3>Treinos do aluno</h3><p>Gerencie os planos atribuídos.</p></div><button onClick={createWorkoutForStudent}>Novo treino</button></div>
                  <div className="student-detail-list">
                    {profile.assignments?.length ? profile.assignments.map((assignment) => (
                      <div className="student-detail-workout-row" key={assignment.id}>
                        <span><Icon name="dumbbell" size={17} /></span>
                        <div><strong>{assignment.template?.name || 'Treino'}</strong><small>{assignment.notes || 'Sem observações adicionais'}</small></div>
                        <i className={assignment.status}>{assignment.status === 'active' ? 'Ativo' : 'Inativo'}</i>
                        <button onClick={() => toggleAssignmentStatus(assignment)}>{assignment.status === 'active' ? 'Desativar' : 'Ativar'}</button>
                      </div>
                    )) : <p className="student-detail-empty">Nenhum treino foi atribuído a este aluno.</p>}
                  </div>
                </section>

                <section className="student-detail-card history">
                  <div className="student-detail-card-heading"><div><h3>Histórico recente</h3><p>Últimos treinos concluídos.</p></div></div>
                  <div className="student-detail-list">
                    {profile.history?.length ? profile.history.slice(0, 6).map((item) => (
                      <div className="student-detail-history-row" key={item.id}>
                        <span><Icon name="check" size={15} /></span>
                        <div><strong>{item.name}</strong><small>{new Date(`${item.date}T12:00:00`).toLocaleDateString('pt-BR')}</small></div>
                      </div>
                    )) : <p className="student-detail-empty">Nenhum treino concluído até o momento.</p>}
                  </div>
                </section>

                <section className="student-detail-card assessments">
                  <div className="student-detail-card-heading"><div><h3>Avaliações</h3><p>Relatórios físicos e evolução clínica.</p></div><button onClick={assessStudent}>Nova avaliação</button></div>
                  <div className="student-detail-assessment-grid">
                    {profile.assessments?.length ? profile.assessments.map((assessment) => (
                      <button key={assessment.id} onClick={() => { setViewingStudent(false); setViewingAssessment(assessment); }}>
                        <span className={assessment.medicalAlert ? 'alert' : ''}><Icon name={assessment.medicalAlert ? 'alert' : 'clipboard'} size={18} /></span>
                        <div><strong>{assessment.goal || 'Avaliação física'}</strong><small>{new Date(`${assessment.assessmentDate}T12:00:00`).toLocaleDateString('pt-BR')}</small></div>
                        <i>{assessment.status === 'draft' ? 'Rascunho' : 'Concluída'}</i>
                        <Icon name="chevronRight" size={17} />
                      </button>
                    )) : <p className="student-detail-empty">Nenhuma avaliação cadastrada.</p>}
                  </div>
                </section>
              </div>
            </div>
          )}

          <footer className="student-detail-actions">
            <button type="button" className="secondary" onClick={() => setViewingStudent(false)}>Fechar</button>
            <button type="button" className="primary" onClick={createWorkoutForStudent}><Icon name="dumbbell" size={17} /> Criar treino</button>
            <button type="button" className="primary coral" onClick={assessStudent}><Icon name="clipboard" size={17} /> Avaliar aluno</button>
          </footer>
        </article>
      </div>,
      document.body
    );
  };

  const renderAssignmentOrganizer = () => {
    if (!organizingStudent) return null;
    const assignedTemplateIds = new Set(organizedAssignments.map((assignment) => Number(assignment.templateId)));
    const availableTemplates = templates.filter((template) => !assignedTemplateIds.has(Number(template.id)));
    const activeCount = organizedAssignments.filter((assignment) => assignment.status === 'active').length;

    return createPortal(
      <div className="assignment-organizer-overlay" onClick={() => !savingAssignmentOrder && setOrganizingStudent(null)}>
        <section className="assignment-organizer" onClick={(event) => event.stopPropagation()}>
          <header className="assignment-organizer-header">
            <span>{organizingStudent.name?.charAt(0)?.toUpperCase() || 'A'}</span>
            <div>
              <small>Organização de treinos</small>
              <h2>{organizingStudent.name}</h2>
              <p>{organizingStudent.email}</p>
            </div>
            <button type="button" onClick={() => setOrganizingStudent(null)} aria-label="Fechar organizador"><Icon name="close" size={19} /></button>
          </header>

          <div className="assignment-organizer-body">
            <div className="assignment-organizer-summary">
              <article><Icon name="dumbbell" size={18} /><div><strong>{organizedAssignments.length}</strong><span>treinos atribuídos</span></div></article>
              <article><Icon name="bolt" size={18} /><div><strong>{activeCount}</strong><span>treinos ativos</span></div></article>
            </div>

            <section className="assignment-organizer-add">
              <div><strong>Adicionar outro treino</strong><small>Escolha um modelo salvo para incluir na rotina.</small></div>
              <select value={organizerTemplateId} onChange={(event) => setOrganizerTemplateId(event.target.value)}>
                <option value="">Selecione um treino</option>
                {availableTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
              </select>
              <button type="button" onClick={addOrganizerAssignment} disabled={!organizerTemplateId || assigningWorkout}><Icon name="userPlus" size={16} /> {assigningWorkout ? 'Adicionando...' : 'Adicionar'}</button>
            </section>

            <div className="assignment-organizer-title">
              <div><strong>Ordem da rotina</strong><small>Segure os pontos e arraste os cards.</small></div>
              <span>O aluno verá nesta ordem</span>
            </div>

            <Reorder.Group as="div" axis="y" className="assignment-organizer-list" values={organizedAssignments} onReorder={setOrganizedAssignments}>
              {organizedAssignments.map((assignment, index) => (
                <AssignedWorkoutOrderCard
                  key={assignment.id}
                  assignment={assignment}
                  index={index}
                  onMove={moveOrganizedAssignment}
                  onStatusChange={toggleOrganizerAssignment}
                />
              ))}
              {organizedAssignments.length === 0 && <div className="assignment-organizer-empty"><Icon name="dumbbell" size={25} /><strong>Nenhum treino atribuído</strong><span>Adicione o primeiro treino usando o campo acima.</span></div>}
            </Reorder.Group>
          </div>

          <footer className="assignment-organizer-actions">
            <button type="button" className="secondary" onClick={() => setOrganizingStudent(null)}>Cancelar</button>
            <button type="button" className="primary" onClick={saveOrganizerOrder} disabled={savingAssignmentOrder || organizedAssignments.length === 0}><Icon name="check" size={17} /> {savingAssignmentOrder ? 'Salvando...' : 'Salvar ordem'}</button>
          </footer>
        </section>
      </div>,
      document.body
    );
  };

  const renderAssessmentDetails = () => {
    if (!viewingAssessment) return null;
    const assessment = viewingAssessment;
    const personalData = assessment.personalData || {};
    const medicalHistory = assessment.medicalHistory || {};
    const activityHistory = assessment.activityHistory || {};
    const lifestyle = assessment.lifestyle || {};
    const availability = assessment.availability || {};
    const measurements = assessment.measurements || {};
    const risks = medicalRiskFields.filter((field) => medicalHistory[field]);
    const value = (content, suffix = '') => content !== null && content !== undefined && content !== '' ? `${content}${suffix}` : 'Não informado';

    return createPortal(
      <div className="personal-assessment-detail-overlay" onMouseDown={() => setViewingAssessment(null)}>
        <article className="personal-assessment-detail" role="dialog" aria-modal="true" aria-labelledby="assessment-detail-title" onMouseDown={(event) => event.stopPropagation()}>
          <header className="assessment-detail-header">
            <div className="assessment-detail-avatar">{assessment.student?.name?.trim().charAt(0).toUpperCase() || 'A'}</div>
            <div>
              <span>Relatório da avaliação</span>
              <h2 id="assessment-detail-title">{assessment.student?.name || personalData.fullName || 'Aluno'}</h2>
              <p>{assessment.student?.email || personalData.email || 'E-mail não informado'} · {new Date(`${assessment.assessmentDate}T12:00:00`).toLocaleDateString('pt-BR')}</p>
            </div>
            <button type="button" onClick={() => setViewingAssessment(null)} aria-label="Fechar relatório"><Icon name="close" size={19} /></button>
          </header>

          <div className="assessment-detail-body">
            <section className={`assessment-detail-alert ${assessment.medicalAlert ? 'critical' : ''}`}>
              <Icon name={assessment.medicalAlert ? 'alert' : 'check'} size={21} />
              <div><strong>{assessment.medicalAlert ? 'Atenção clínica necessária' : 'Triagem sem alerta crítico'}</strong><p>{assessment.medicalAlertMessage || (assessment.medicalAlert ? medicalAlertMessage : 'Nenhum fator crítico foi identificado no questionário.')}</p></div>
            </section>

            <section className="assessment-detail-summary">
              <article><span>Objetivo</span><strong>{value(assessment.goal || personalData.mainGoal)}</strong></article>
              <article><span>Nível atual</span><strong>{value(activityHistory.currentLevel)}</strong></article>
              <article><span>Peso</span><strong>{value(assessment.weight || measurements.weight, ' kg')}</strong></article>
              <article><span>IMC</span><strong>{value(assessment.bmi || measurements.bmi)}</strong></article>
            </section>

            <div className="assessment-detail-grid">
              <section className="assessment-detail-card">
                <h3><Icon name="person" size={18} /> Dados e rotina</h3>
                <dl>
                  <div><dt>Telefone</dt><dd>{value(personalData.phone)}</dd></div>
                  <div><dt>Data de nascimento</dt><dd>{value(personalData.birthDate)}</dd></div>
                  <div><dt>Experiência</dt><dd>{activityHistory.trainedBefore ? value(activityHistory.trainingTime || 'Já treinou') : 'Sem experiência anterior'}</dd></div>
                  <div><dt>Disponibilidade</dt><dd>{value(availability.availableDays)}</dd></div>
                  <div><dt>Horário ideal</dt><dd>{value(availability.idealTime)}</dd></div>
                  <div><dt>Tempo por treino</dt><dd>{value(availability.timePerWorkout)}</dd></div>
                </dl>
              </section>

              <section className="assessment-detail-card">
                <h3><Icon name="chart" size={18} /> Medidas corporais</h3>
                <dl>
                  <div><dt>Altura</dt><dd>{value(assessment.height || measurements.height, ' cm')}</dd></div>
                  <div><dt>Abdômen</dt><dd>{value(measurements.abdominalCircumference, ' cm')}</dd></div>
                  <div><dt>Peitoral</dt><dd>{value(measurements.chestCircumference, ' cm')}</dd></div>
                  <div><dt>Braços</dt><dd>{value(measurements.rightArm, ' cm')} / {value(measurements.leftArm, ' cm')}</dd></div>
                  <div><dt>Coxas</dt><dd>{value(measurements.rightThigh, ' cm')} / {value(measurements.leftThigh, ' cm')}</dd></div>
                  <div><dt>Quadril</dt><dd>{value(measurements.hip, ' cm')}</dd></div>
                </dl>
              </section>

              <section className="assessment-detail-card">
                <h3><Icon name="shield" size={18} /> Saúde</h3>
                {risks.length ? <div className="assessment-detail-tags">{risks.map((risk) => <span key={risk}>{medicalRiskLabels[risk]}</span>)}</div> : <p className="assessment-detail-empty">Nenhuma condição de risco informada.</p>}
                {medicalHistory.medicationName && <p className="assessment-detail-note"><strong>Medicamento:</strong> {medicalHistory.medicationName}</p>}
              </section>

              <section className="assessment-detail-card">
                <h3><Icon name="bolt" size={18} /> Estilo de vida</h3>
                <dl>
                  <div><dt>Sono</dt><dd>{value(lifestyle.sleepHours)}</dd></div>
                  <div><dt>Estresse</dt><dd>{value(lifestyle.stressLevel)}</dd></div>
                  <div><dt>Alimentação</dt><dd>{value(lifestyle.nutrition)}</dd></div>
                  <div><dt>Fumante</dt><dd>{lifestyle.smoker ? 'Sim' : 'Não'}</dd></div>
                </dl>
              </section>
            </div>

            {(assessment.workoutSuggestion || measurements.notes) && (
              <section className="assessment-detail-observations">
                <h3>Observações e plano sugerido</h3>
                {measurements.notes && <p>{measurements.notes}</p>}
                {assessment.workoutSuggestion && <p>{assessment.workoutSuggestion}</p>}
              </section>
            )}
          </div>

          <footer className="assessment-detail-actions">
            <button type="button" className="secondary" onClick={() => setViewingAssessment(null)}>Fechar</button>
            <button type="button" className="primary" onClick={() => editAssessment(assessment)}><Icon name="edit" size={17} /> Editar avaliação</button>
          </footer>
        </article>
      </div>,
      document.body
    );
  };

  const renderHome = () => {
    const activeAssignments = assignments.filter((assignment) => assignment.status === 'active');
    const activeAssignmentByStudent = new Map(activeAssignments.map((assignment) => [Number(assignment.student?.id), assignment]));
    const activeCoverage = summary?.totalStudents
      ? Math.round(((summary.studentsWithActiveWorkout || 0) / summary.totalStudents) * 100)
      : 0;
    const featuredStudents = [...students]
      .sort((left, right) => Number(activeAssignmentByStudent.has(Number(right.id))) - Number(activeAssignmentByStudent.has(Number(left.id))))
      .slice(0, 4);
    const recentAssessments = summary?.recentAssessments || [];

    return (
      <div className="personal-home-dashboard">
        <section className="personal-home-hero">
          <div className="personal-home-hero-copy">
            <span className="personal-home-context"><Icon name="gymLogo" size={16} /> {selectedPersonalGym?.name || 'Painel do personal'}</span>
            <h1>Vamos acompanhar a evolução dos seus alunos, {user?.name?.split(' ')[0] || 'Personal'}?</h1>
            <p>
              {summary?.pendingAssessments
                ? `${summary.pendingAssessments} aluno${summary.pendingAssessments === 1 ? '' : 's'} ainda precisa${summary.pendingAssessments === 1 ? '' : 'm'} de avaliação.`
                : 'Avaliações em dia. Continue acompanhando treinos e resultados.'}
            </p>
          </div>
          <div className="personal-home-hero-orb" aria-hidden="true"></div>
        </section>

        <section className="personal-home-metrics" aria-label="Resumo do personal">
          <article className="personal-home-metric primary">
            <span>Alunos vinculados</span>
            <div><strong>{summary?.totalStudents || 0}</strong><small>{summary?.studentsWithActiveWorkout || 0} com treino ativo</small></div>
          </article>
          <article className="personal-home-metric">
            <span>Treinos criados</span>
            <strong>{summary?.totalTemplates || 0}</strong>
          </article>
          <article className="personal-home-metric coverage">
            <span>Cobertura de treino</span>
            <strong>{activeCoverage}%</strong>
            <div className="personal-coverage-track"><i style={{ width: `${activeCoverage}%` }}></i></div>
          </article>
        </section>

        <section className="personal-quick-section">
          <div className="personal-home-section-title"><span>Ações rápidas</span></div>
          <div className="personal-quick-actions">
            <button onClick={() => navigate('/personal/alunos')}><i><Icon name="userPlus" size={24} /></i><span>Novo aluno</span></button>
            <button onClick={() => navigate('/personal/treinos')}><i><Icon name="dumbbell" size={24} /></i><span>Criar treino</span></button>
            <button onClick={() => navigate('/personal/avaliacoes')}><i><Icon name="clipboard" size={24} /></i><span>Avaliação</span></button>
            <button onClick={() => navigate('/profile')}><i><Icon name="person" size={24} /></i><span>Meu perfil</span></button>
          </div>
        </section>

        <div className="personal-home-columns">
          <section className="personal-home-list-card">
            <div className="personal-home-section-title">
              <div><span>Alunos em acompanhamento</span><small>Treinos e avaliações em um só lugar</small></div>
              <button onClick={() => navigate('/personal/alunos')}>Ver todos</button>
            </div>
            <div className="personal-home-student-list">
              {featuredStudents.length === 0 ? (
                <p className="personal-home-empty">Adicione seu primeiro aluno para começar o acompanhamento.</p>
              ) : featuredStudents.map((student) => {
                const activeAssignment = activeAssignmentByStudent.get(Number(student.id));
                return (
                  <button key={student.id} className="personal-home-student" onClick={() => navigate('/personal/alunos')}>
                    <span className="personal-student-avatar">{student.name?.trim().charAt(0).toUpperCase() || 'A'}</span>
                    <span className="personal-student-copy">
                      <strong>{student.name}</strong>
                      <small>{activeAssignment?.template?.name || 'Sem treino ativo'}</small>
                    </span>
                    <span className={`personal-student-status ${activeAssignment ? 'active' : 'pending'}`}>{activeAssignment ? 'Ativo' : 'Pendente'}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="personal-home-list-card activity">
            <div className="personal-home-section-title">
              <div><span>Atividade recente</span><small>Últimas avaliações registradas</small></div>
              <button onClick={() => navigate('/personal/avaliacoes')}>Ver avaliações</button>
            </div>
            <div className="personal-home-activity-list">
              {recentAssessments.length === 0 ? (
                <p className="personal-home-empty">Nenhuma avaliação registrada recentemente.</p>
              ) : recentAssessments.slice(0, 4).map((assessment) => (
                <button key={assessment.id} className="personal-home-activity" onClick={() => navigate('/personal/avaliacoes')}>
                  <i className={assessment.medicalAlert ? 'alert' : ''}><Icon name={assessment.medicalAlert ? 'alert' : 'check'} size={16} /></i>
                  <span>
                    <strong>{assessment.student?.name || 'Aluno'}</strong>
                    <small>{assessment.goal || 'Avaliação física'} · {new Date(assessment.assessmentDate).toLocaleDateString('pt-BR')}</small>
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  };

  const renderStudents = () => (
    <div className="personal-students-page">
      <section className="personal-panel personal-student-link-card">
        <div className="personal-student-link-copy">
          <span><Icon name="userPlus" size={19} /></span>
          <div><h2>Vincular novo aluno</h2><p>Use o e-mail de uma conta já cadastrada no JFTrack.</p></div>
        </div>
        <div className="personal-student-link-form">
          <div className="active-gym-inline"><Icon name="gymLogo" size={17} /><span>{selectedPersonalGym?.name || 'Academia não selecionada'}</span></div>
          <input type="email" value={studentInviteForm.email} onChange={(event) => setStudentInviteForm({ ...studentInviteForm, email: event.target.value })} placeholder="E-mail do aluno" />
          <button type="button" className="industrial-btn small" onClick={addStudentByEmail}>Adicionar aluno</button>
        </div>
      </section>

      <section className="personal-panel personal-student-results">
        <div className="panel-title-row">
          <div><h2>Alunos vinculados</h2><p>Selecione um aluno para abrir o acompanhamento completo.</p></div>
          <span>{students.length} matriculados</span>
        </div>
        <form className="personal-search personal-student-search" onSubmit={handleSearch}>
          <div><Icon name="search" size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome ou e-mail" /></div>
          <button>Buscar</button>
          {search && <button type="button" onClick={clearStudentSearch}>Limpar</button>}
        </form>
        <div className="personal-student-grid">
          {students.length === 0 ? (
            <p className="personal-student-empty">Nenhum aluno encontrado para esta busca.</p>
          ) : students.map((student) => {
            const studentAssignment = assignments.find((assignment) => Number(assignment.student?.id) === Number(student.id) && assignment.status === 'active');
            const studentAssessment = assessments.find((assessment) => Number(assessment.studentUserId) === Number(student.id));
            return (
              <button key={student.id} className="personal-student-result-card" onClick={() => openStudent(student)}>
                <span className="personal-student-result-avatar">{student.name?.trim().charAt(0).toUpperCase() || 'A'}</span>
                <span className="personal-student-result-copy"><strong>{student.name}</strong><small>{student.email}</small><em>{student.gym?.name}</em></span>
                <span className="personal-student-result-flags">
                  <i className={studentAssignment ? 'ready' : ''}><Icon name="dumbbell" size={13} /> {studentAssignment ? 'Treino ativo' : 'Sem treino'}</i>
                  <i className={studentAssessment ? 'ready' : ''}><Icon name="clipboard" size={13} /> {studentAssessment ? 'Avaliado' : 'Pendente'}</i>
                </span>
                <Icon name="chevronRight" size={18} />
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );

  const renderWorkouts = () => {
    const categories = ['Todos', ...new Set(exercises.map((exercise) => exercise.category).filter(Boolean))];
    const normalizedSearch = exerciseSearch.trim().toLocaleLowerCase('pt-BR');
    const filteredExercises = exercises.filter((exercise) => (
      (exerciseCategory === 'Todos' || exercise.category === exerciseCategory)
      && (!normalizedSearch || exercise.name.toLocaleLowerCase('pt-BR').includes(normalizedSearch))
    ));
    const selectedExercises = templateForm.exercises.map((selected) => ({
      ...selected,
      source: selected,
      exercise: exercises.find((exercise) => exercise.id === selected.id)
    })).filter((selected) => selected.exercise);
    const activeAssignments = assignments.filter((assignment) => assignment.status === 'active');
    const assignmentStudents = Array.from(assignments.reduce((studentMap, assignment) => {
      const studentId = assignment.studentUserId || assignment.student?.id;
      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, {
          ...assignment.student,
          id: studentId,
          assignments: []
        });
      }
      studentMap.get(studentId).assignments.push(assignment);
      return studentMap;
    }, new Map()).values());

    const resetTemplate = () => {
      setEditingTemplateId(null);
      setTemplateForm({ name: '', exercises: [] });
      setExerciseSearch('');
      setExerciseCategory('Todos');
    };

    return (
      <div className="workout-studio">
        <section className="workout-studio-hero">
          <div>
            <span>Estúdio de treinos</span>
            <h2>Monte uma rotina clara e fácil de acompanhar</h2>
            <p>Escolha os exercícios, ajuste as séries e atribua o treino ao aluno quando estiver pronto.</p>
          </div>
          <div className="workout-studio-stats">
            <article><Icon name="book" size={19} /><strong>{templates.length}</strong><small>treinos salvos</small></article>
            <article><Icon name="bolt" size={19} /><strong>{activeAssignments.length}</strong><small>atribuições ativas</small></article>
          </div>
        </section>

        <div className="workout-studio-grid">
          <section className="workout-builder-card">
            <header className="workout-card-heading">
              <span className="workout-step-number">1</span>
              <div>
                <h3>{editingTemplateId ? 'Editar treino' : 'Criar novo treino'}</h3>
                <p>Defina um nome e monte a sequência de exercícios.</p>
              </div>
              {editingTemplateId && <button type="button" className="workout-text-button" onClick={resetTemplate}>Criar novo</button>}
            </header>

            <label className="workout-name-field">
              <span>Nome do treino</span>
              <input
                value={templateForm.name}
                onChange={(event) => setTemplateForm({ ...templateForm, name: event.target.value })}
                placeholder="Ex.: Treino A - Peito e tríceps"
              />
            </label>

            <div className="workout-library-heading">
              <div>
                <strong>Biblioteca de exercícios</strong>
                <small>{filteredExercises.length} disponíveis</small>
              </div>
              <div className="workout-exercise-search">
                <Icon name="search" size={17} />
                <input value={exerciseSearch} onChange={(event) => setExerciseSearch(event.target.value)} placeholder="Buscar exercício" />
              </div>
            </div>

            <div className="workout-category-filter" aria-label="Categorias de exercícios">
              {categories.map((category) => (
                <button
                  type="button"
                  key={category}
                  className={exerciseCategory === category ? 'active' : ''}
                  onClick={() => setExerciseCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="workout-exercise-grid">
              {filteredExercises.map((exercise) => {
                const selected = templateForm.exercises.some((item) => item.id === exercise.id);
                return (
                  <button type="button" key={exercise.id} className={selected ? 'selected' : ''} onClick={() => toggleExercise(exercise.id)}>
                    <span><Icon name={selected ? 'check' : 'dumbbell'} size={18} /></span>
                    <div><strong>{exercise.name}</strong><small>{exercise.category || 'Geral'}</small></div>
                    <i>{selected ? 'Adicionado' : 'Adicionar'}</i>
                  </button>
                );
              })}
              {filteredExercises.length === 0 && (
                <div className="workout-library-empty"><Icon name="search" size={22} /><span>Nenhum exercício encontrado.</span></div>
              )}
            </div>

            <div className="workout-selected-section">
              <div className="workout-library-heading">
                <div><strong>Sequência do treino</strong><small>Segure os pontos e arraste para mudar a ordem</small></div>
                <span className="workout-count-badge">{selectedExercises.length} {selectedExercises.length === 1 ? 'exercício' : 'exercícios'}</span>
              </div>

              <Reorder.Group
                as="div"
                axis="y"
                className="workout-selected-list"
                values={selectedExercises.map((selected) => selected.source)}
                onReorder={(orderedExercises) => setTemplateForm((current) => ({ ...current, exercises: orderedExercises }))}
              >
                {selectedExercises.map((selected, index) => (
                  <WorkoutOrderCard
                    key={selected.id}
                    selected={selected}
                    index={index}
                    onMove={reorderTemplateExercise}
                    onSetsChange={updateExerciseSets}
                    onDurationChange={updateExerciseDuration}
                    onRemove={toggleExercise}
                  />
                ))}
                {selectedExercises.length === 0 && (
                  <div className="workout-selected-empty"><span><Icon name="dumbbell" size={24} /></span><strong>Seu treino começa aqui</strong><small>Adicione exercícios da biblioteca para montar a sequência.</small></div>
                )}
              </Reorder.Group>
            </div>

            <footer className="workout-builder-actions">
              <div>
                <strong>{selectedExercises.filter((item) => item.exercise.category !== 'Cardio').reduce((total, item) => total + item.defaultSets, 0)}</strong><span>séries</span>
                {selectedExercises.some((item) => item.exercise.category === 'Cardio') && <><strong>{selectedExercises.filter((item) => item.exercise.category === 'Cardio').reduce((total, item) => total + item.durationMinutes, 0)}</strong><span>min de cardio</span></>}
              </div>
              <button type="button" onClick={saveTemplate} disabled={savingTemplate || !templateForm.name.trim() || selectedExercises.length === 0}>
                <Icon name="check" size={18} /> {savingTemplate ? 'Salvando...' : editingTemplateId ? 'Salvar alterações' : 'Salvar treino'}
              </button>
            </footer>
          </section>

          <aside className="workout-assignment-card">
            <header className="workout-card-heading compact">
              <span className="workout-step-number coral">2</span>
              <div><h3>Atribuir ao aluno</h3><p>Libere um treino já salvo.</p></div>
            </header>
            <div className="workout-active-gym"><Icon name="gymLogo" size={18} /><div><small>Academia selecionada</small><strong>{selectedPersonalGym?.name || 'Nenhuma academia'}</strong></div></div>
            <div className="workout-assignment-form">
              <label><span>Aluno</span><input list="personal-workout-students" type="email" value={assignmentForm.studentEmail} onChange={(event) => setAssignmentForm({ ...assignmentForm, studentEmail: event.target.value })} placeholder="E-mail do aluno" /></label>
              <datalist id="personal-workout-students">{students.map((student) => <option key={student.id} value={student.email}>{student.name}</option>)}</datalist>
              <label><span>Treino</span><select value={assignmentForm.templateId} onChange={(event) => setAssignmentForm({ ...assignmentForm, templateId: event.target.value })}><option value="">Selecione um treino</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label>
              <label><span>Orientações</span><textarea value={assignmentForm.notes} onChange={(event) => setAssignmentForm({ ...assignmentForm, notes: event.target.value })} placeholder="Adaptações, cuidados ou observações para o aluno" /></label>
              <button type="button" onClick={assignWorkout} disabled={assigningWorkout || !assignmentForm.studentEmail.trim() || !assignmentForm.templateId}><Icon name="userPlus" size={18} /> {assigningWorkout ? 'Atribuindo...' : 'Atribuir treino'}</button>
            </div>
          </aside>
        </div>

        <section className="workout-management-card">
          <header className="workout-management-heading"><div><span>Biblioteca</span><h3>Treinos salvos</h3><p>Edite uma estrutura existente ou acompanhe quem está treinando.</p></div><strong>{templates.length} modelos</strong></header>
          <div className="workout-management-grid">
            <div className="workout-template-list">
              {templates.map((template) => (
                <article key={template.id}>
                  <span className="workout-template-icon"><Icon name="dumbbell" size={20} /></span>
                  <div><strong>{template.name}</strong><small>{template.exercises?.length || 0} exercícios</small></div>
                  <button type="button" onClick={() => editTemplate(template)}><Icon name="pencil" size={15} /> Editar</button>
                </article>
              ))}
              {templates.length === 0 && <p className="workout-list-empty">Nenhum treino salvo ainda.</p>}
            </div>
            <div className="workout-active-list">
              <div className="workout-active-list-title"><Icon name="bolt" size={18} /><strong>Treinos atribuídos</strong></div>
              {assignmentStudents.map((student) => {
                const studentActiveCount = student.assignments.filter((assignment) => assignment.status === 'active').length;
                return (
                <article key={`assignment-student-${student.id}`} className="workout-student-assignment-row">
                  <span>{student.name?.charAt(0)?.toUpperCase() || 'A'}</span>
                  <button type="button" className="workout-student-name" onClick={() => openAssignmentOrganizer(student)}>
                    <strong>{student.name || 'Aluno'}</strong>
                    <small>{student.assignments.length} {student.assignments.length === 1 ? 'treino atribuído' : 'treinos atribuídos'} · {studentActiveCount} ativos</small>
                  </button>
                  <button type="button" className="workout-organize-button" onClick={() => openAssignmentOrganizer(student)}>Organizar <Icon name="chevronRight" size={15} /></button>
                </article>
              );})}
              {assignmentStudents.length === 0 && <p className="workout-list-empty">Nenhum treino atribuído.</p>}
            </div>
          </div>
        </section>
      </div>
    );
  };

  const renderYesNo = (group, field, label) => (
    <label className="assessment-check">
      <input
        type="checkbox"
        checked={Boolean(assessmentForm[group][field])}
        onChange={(event) => updateAssessmentGroup(group, field, event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );

  const getAssessmentStudent = (studentId = assessmentForm.studentId) => (
    students.find((student) => Number(student.id) === Number(studentId))
  );

  const renderAssessmentReview = () => {
    const selectedAssessmentStudent = getAssessmentStudent();

    return (
      <div className="assessment-review-layout">
        <div className="assessment-review-grid">
          <div className={assessmentHasMedicalAlert ? 'review-alert critical' : 'review-alert'}>
            <Icon name={assessmentHasMedicalAlert ? 'alert' : 'check'} size={24} />
            <div>
              <strong>{assessmentHasMedicalAlert ? 'Revisao cuidadosa obrigatoria' : 'Triagem sem alerta critico'}</strong>
              <span>{assessmentHasMedicalAlert ? medicalAlertMessage : 'O treino ainda deve ser revisado pelo personal antes de liberar.'}</span>
            </div>
          </div>

          <div className="assessment-review-bento">
            <article className="assessment-review-card composition">
              <div className="assessment-review-card-title"><Icon name="chart" size={19} /><strong>Composição corporal</strong></div>
              <dl>
                <div><dt>Peso</dt><dd>{assessmentForm.measurements.weight ? `${assessmentForm.measurements.weight} kg` : 'Não informado'}</dd></div>
                <div><dt>Altura</dt><dd>{assessmentForm.measurements.height ? `${assessmentForm.measurements.height} cm` : 'Não informada'}</dd></div>
                <div><dt>IMC</dt><dd>{calculateBmi() || 'Não calculado'}</dd></div>
              </dl>
            </article>
            <article className="assessment-review-card profile">
              <div className="assessment-review-card-title"><Icon name="person" size={19} /><strong>Perfil de treino</strong></div>
              <dl>
                <div><dt>Aluno</dt><dd>{selectedAssessmentStudent?.name || assessmentForm.personalData.fullName || 'Não selecionado'}</dd></div>
                <div><dt>Objetivo</dt><dd>{assessmentForm.personalData.mainGoal}</dd></div>
                <div><dt>Rotina</dt><dd>{assessmentForm.availability.availableDays || '?'} · {assessmentForm.availability.timePerWorkout}</dd></div>
              </dl>
            </article>
          </div>

          <label className="assessment-review-notes">
            <span><Icon name="bolt" size={17} /> Insight e observações do personal</span>
            <textarea
              value={assessmentForm.workoutSuggestion}
              onChange={(event) => setAssessmentForm({ ...assessmentForm, workoutSuggestion: event.target.value })}
              placeholder="Registre recomendações, cuidados e observações importantes para este aluno."
            />
          </label>
        </div>

        <div className="preset-review embedded">
          <div className="panel-title-row">
            <div>
              <h3>{preset.name || 'Plano semanal sugerido'}</h3>
              <small>Revise a divisão, os exercícios e as orientações.</small>
            </div>
            <span>{preset.workouts.length}x na semana</span>
          </div>
          {preset.workouts.length === 0 ? (
            <p className="empty-state">O preset sera gerado automaticamente a partir da avaliacao quando esta etapa for aberta.</p>
          ) : (
            <>
              <input value={preset.name} onChange={(event) => setPreset({ ...preset, name: event.target.value })} placeholder="Nome do preset" />
              <div className="form-split">
                <input value={preset.splitType} onChange={(event) => setPreset({ ...preset, splitType: event.target.value })} placeholder="Divisao" />
                <label className="preset-count-field">
                  <span>Quantidade de treinos na semana</span>
                  <input
                    type="number"
                    min="1"
                    max="7"
                    value={preset.workouts.length}
                    onChange={(event) => updatePresetWorkoutCount(event.target.value)}
                  />
                </label>
              </div>
              <textarea value={preset.notes} onChange={(event) => setPreset({ ...preset, notes: event.target.value })} placeholder="Notas de revisao" />
              <div className="preset-workout-list">
                {preset.workouts.map((workout, workoutIndex) => {
                  const isExpanded = Boolean(expandedPresetWorkouts[workoutIndex]);
                  return (
                    <article className={`preset-workout-card ${isExpanded ? 'expanded' : 'collapsed'}`} key={`${workout.name}-${workoutIndex}`}>
                      <button className="preset-workout-toggle" type="button" onClick={() => togglePresetWorkout(workoutIndex)}>
                        <span className="preset-day-letter">{String.fromCharCode(65 + workoutIndex)}</span>
                        <div>
                          <strong>{workout.name || `Treino ${workoutIndex + 1}`}</strong>
                          <span>{workout.frequency || 'Frequência livre'} · {workout.exercises?.length || 0} exercícios</span>
                        </div>
                        <Icon name={isExpanded ? 'chevronUp' : 'chevronDown'} size={18} />
                      </button>
                      {isExpanded && (
                        <div className="preset-workout-body">
                          <div className="preset-workout-header">
                            <input
                              value={workout.name}
                              onChange={(event) => updatePresetWorkout(workoutIndex, { name: event.target.value })}
                              placeholder={`Treino ${workoutIndex + 1}`}
                            />
                            <input
                              value={workout.frequency}
                              onChange={(event) => updatePresetWorkout(workoutIndex, { frequency: event.target.value })}
                              placeholder="Frequencia"
                            />
                          </div>
                          <textarea
                            value={workout.notes}
                            onChange={(event) => updatePresetWorkout(workoutIndex, { notes: event.target.value })}
                            placeholder="Notas especificas deste treino"
                          />
                          <select value="" onChange={(event) => addPresetExercise(workoutIndex, event.target.value)}>
                            <option value="">Adicionar exercicio neste treino</option>
                            {exercises.map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}
                          </select>
                          <div className="preset-exercise-list">
                            {workout.exercises.map((exercise, exerciseIndex) => (
                              <div className="preset-exercise-row" key={`${exercise.id}-${exerciseIndex}`}>
                                <strong>{exercise.name}</strong>
                                {exercise.category === 'Cardio' ? (
                                  <input type="number" min="1" max="180" step="5" value={exercise.durationMinutes || 20} onChange={(event) => updatePresetWorkoutExercise(workoutIndex, exerciseIndex, 'durationMinutes', parseInt(event.target.value) || 1)} aria-label={`Minutos de ${exercise.name}`} />
                                ) : <>
                                  <input type="number" value={exercise.defaultSets} onChange={(event) => updatePresetWorkoutExercise(workoutIndex, exerciseIndex, 'defaultSets', parseInt(event.target.value) || 1)} />
                                  <input value={exercise.defaultReps} onChange={(event) => updatePresetWorkoutExercise(workoutIndex, exerciseIndex, 'defaultReps', event.target.value)} />
                                </>}
                                <input value={exercise.note || ''} onChange={(event) => updatePresetWorkoutExercise(workoutIndex, exerciseIndex, 'note', event.target.value)} placeholder="Observacao" />
                                <button onClick={() => removePresetExercise(workoutIndex, exerciseIndex)} aria-label="Remover exercicio"><Icon name="trash" size={16} /></button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const assessmentSteps = [
    {
      title: 'Aluno e contexto',
      content: (
        <div className="assessment-step-grid">
          <div className="assessment-email-search">
            <input
              type="email"
              value={assessmentStudentEmail}
              onChange={(event) => setAssessmentStudentEmail(event.target.value)}
              onBlur={findAssessmentStudentByEmail}
              placeholder="E-mail do aluno"
            />
            <button type="button" onClick={findAssessmentStudentByEmail}>Buscar aluno</button>
          </div>
          <input type="date" value={assessmentForm.assessmentDate} onChange={(event) => setAssessmentForm({ ...assessmentForm, assessmentDate: event.target.value })} />
          <div className="context-card">
            <strong>{getAssessmentStudent()?.name || 'Aluno ainda nao selecionado'}</strong>
            <span>{getAssessmentStudent()?.email || 'Digite o e-mail e clique em buscar para vincular a avaliacao.'}</span>
          </div>
        </div>
      )
    },
    {
      title: 'Dados pessoais',
      content: (
        <div className="assessment-step-grid">
          <input value={assessmentForm.personalData.fullName} onChange={(event) => updateAssessmentGroup('personalData', 'fullName', event.target.value)} placeholder="Nome completo" />
          <input type="date" value={assessmentForm.personalData.birthDate} onChange={(event) => updateAssessmentGroup('personalData', 'birthDate', event.target.value)} />
          <input value={assessmentForm.personalData.phone} onChange={(event) => updateAssessmentGroup('personalData', 'phone', event.target.value)} placeholder="Telefone / WhatsApp" />
          <input type="email" value={assessmentForm.personalData.email} onChange={(event) => updateAssessmentGroup('personalData', 'email', event.target.value)} placeholder="E-mail" />
          <select value={assessmentForm.personalData.mainGoal} onChange={(event) => updateAssessmentGroup('personalData', 'mainGoal', event.target.value)}>
            <option>Emagrecimento</option>
            <option>Hipertrofia</option>
            <option>Condicionamento</option>
            <option>Reabilitacao</option>
            <option>Saude geral</option>
          </select>
        </div>
      )
    },
    {
      title: 'Historico medico e saude',
      content: (
        <div className="assessment-check-grid">
          {renderYesNo('medicalHistory', 'heartProblem', 'Algum medico ja disse que possui problema no coracao?')}
          {renderYesNo('medicalHistory', 'chestPain', 'Sente dor no peito ao praticar atividade fisica?')}
          {renderYesNo('medicalHistory', 'dizziness', 'Ja teve tontura ou perda de consciencia?')}
          {renderYesNo('medicalHistory', 'highBloodPressure', 'Possui pressao alta?')}
          {renderYesNo('medicalHistory', 'diabetes', 'Possui diabetes?')}
          {renderYesNo('medicalHistory', 'highCholesterol', 'Possui colesterol alto?')}
          {renderYesNo('medicalHistory', 'continuousMedication', 'Usa medicamento continuo?')}
          <input value={assessmentForm.medicalHistory.medicationName} onChange={(event) => updateAssessmentGroup('medicalHistory', 'medicationName', event.target.value)} placeholder="Qual medicamento?" />
          {renderYesNo('medicalHistory', 'recentSurgery', 'Fez cirurgia nos ultimos 2 anos?')}
          {renderYesNo('medicalHistory', 'injuries', 'Possui lesoes?')}
          {renderYesNo('medicalHistory', 'jointPain', 'Possui dores articulares?')}
          {assessmentHasMedicalAlert && <div className="medical-alert">{medicalAlertMessage}</div>}
        </div>
      )
    },
    {
      title: 'Historico de atividade fisica',
      content: (
        <div className="assessment-step-grid">
          {renderYesNo('activityHistory', 'trainedBefore', 'Ja treinou em academia?')}
          <input value={assessmentForm.activityHistory.trainingTime} onChange={(event) => updateAssessmentGroup('activityHistory', 'trainingTime', event.target.value)} placeholder="Ha quanto tempo?" />
          <select value={assessmentForm.activityHistory.currentLevel} onChange={(event) => updateAssessmentGroup('activityHistory', 'currentLevel', event.target.value)}>
            <option value="">Perfil de rotina e atividade atual</option>
            <option>Sedentario</option>
            <option>Leve</option>
            <option>Moderado</option>
            <option>Intenso</option>
          </select>
          {renderYesNo('activityHistory', 'hadPersonal', 'Ja teve acompanhamento com personal?')}
          <textarea value={assessmentForm.activityHistory.likedExercises} onChange={(event) => updateAssessmentGroup('activityHistory', 'likedExercises', event.target.value)} placeholder="Exercicios que gosta" />
          <textarea value={assessmentForm.activityHistory.dislikedExercises} onChange={(event) => updateAssessmentGroup('activityHistory', 'dislikedExercises', event.target.value)} placeholder="Exercicios que nao gosta" />
        </div>
      )
    },
    {
      title: 'Estilo de vida',
      content: (
        <div className="assessment-step-grid">
          {renderYesNo('lifestyle', 'smoker', 'Fuma?')}
          <select value={assessmentForm.lifestyle.sleepHours} onChange={(event) => updateAssessmentGroup('lifestyle', 'sleepHours', event.target.value)}>
            <option value="">Horas de sono por noite</option>
            {sleepHourOptions.map((option) => <option key={option}>{option}</option>)}
          </select>
          <select value={assessmentForm.lifestyle.stressLevel} onChange={(event) => updateAssessmentGroup('lifestyle', 'stressLevel', event.target.value)}>
            <option>Baixo</option>
            <option>Medio</option>
            <option>Alto</option>
          </select>
          <select value={assessmentForm.lifestyle.nutrition} onChange={(event) => updateAssessmentGroup('lifestyle', 'nutrition', event.target.value)}>
            <option value="">Qualidade e regularidade da alimentacao</option>
            <option>Desregulada</option>
            <option>Moderada</option>
            <option>Acompanhada por nutricionista</option>
          </select>
        </div>
      )
    },
    {
      title: 'Disponibilidade',
      content: (
        <div className="assessment-step-grid">
          <select value={assessmentForm.availability.availableDays} onChange={(event) => updateAssessmentGroup('availability', 'availableDays', event.target.value)}>
            <option value="">Dias disponiveis para treino</option>
            {availableDayOptions.map((option) => <option key={option}>{option}</option>)}
          </select>
          <select value={assessmentForm.availability.idealTime} onChange={(event) => updateAssessmentGroup('availability', 'idealTime', event.target.value)}>
            <option value="">Horario ideal para treinar</option>
            {idealTimeOptions.map((option) => <option key={option}>{option}</option>)}
          </select>
          <select value={assessmentForm.availability.timePerWorkout} onChange={(event) => updateAssessmentGroup('availability', 'timePerWorkout', event.target.value)}>
            <option>30 minutos</option>
            <option>45 minutos</option>
            <option>60 minutos</option>
            <option>Mais de 60 minutos</option>
          </select>
        </div>
      )
    },
    {
      title: 'Medidas fisicas',
      content: (
        <div className="assessment-step-grid">
          <input type="number" value={assessmentForm.measurements.weight} onChange={(event) => updateAssessmentGroup('measurements', 'weight', event.target.value)} placeholder="Peso" />
          <input type="number" value={assessmentForm.measurements.height} onChange={(event) => updateAssessmentGroup('measurements', 'height', event.target.value)} placeholder="Altura em cm" />
          <input value={calculateBmi()} readOnly placeholder="IMC calculado" />
          <input type="number" value={assessmentForm.measurements.abdominalCircumference} onChange={(event) => updateAssessmentGroup('measurements', 'abdominalCircumference', event.target.value)} placeholder="Circunferencia abdominal" />
          <input type="number" value={assessmentForm.measurements.chestCircumference} onChange={(event) => updateAssessmentGroup('measurements', 'chestCircumference', event.target.value)} placeholder="Circunferencia toracica" />
          <input type="number" value={assessmentForm.measurements.rightArm} onChange={(event) => updateAssessmentGroup('measurements', 'rightArm', event.target.value)} placeholder="Braco direito" />
          <input type="number" value={assessmentForm.measurements.leftArm} onChange={(event) => updateAssessmentGroup('measurements', 'leftArm', event.target.value)} placeholder="Braco esquerdo" />
          <input type="number" value={assessmentForm.measurements.rightThigh} onChange={(event) => updateAssessmentGroup('measurements', 'rightThigh', event.target.value)} placeholder="Coxa direita" />
          <input type="number" value={assessmentForm.measurements.leftThigh} onChange={(event) => updateAssessmentGroup('measurements', 'leftThigh', event.target.value)} placeholder="Coxa esquerda" />
          <input type="number" value={assessmentForm.measurements.hip} onChange={(event) => updateAssessmentGroup('measurements', 'hip', event.target.value)} placeholder="Quadril" />
          <textarea value={assessmentForm.measurements.notes} onChange={(event) => updateAssessmentGroup('measurements', 'notes', event.target.value)} placeholder="Observacoes gerais" />
        </div>
      )
    },
    {
      title: 'Resumo e preset',
      content: renderAssessmentReview()
    }
  ];

  const renderAssessments = () => {
    const assessedStudentIds = new Set(assessments.map((assessment) => Number(assessment.studentUserId)));
    const pendingStudents = students.filter((student) => !assessedStudentIds.has(Number(student.id)));
    const normalizedAssessmentSearch = assessmentSearch.trim().toLowerCase();
    const filteredAssessments = assessments.filter((assessment) => {
      const studentName = assessment.student?.name?.toLowerCase() || '';
      const studentEmail = assessment.student?.email?.toLowerCase() || '';
      const matchesSearch = !normalizedAssessmentSearch
        || studentName.includes(normalizedAssessmentSearch)
        || studentEmail.includes(normalizedAssessmentSearch)
        || String(assessment.goal || '').toLowerCase().includes(normalizedAssessmentSearch);

      const matchesFilter = assessmentFilter === 'all'
        || (assessmentFilter === 'alerts' && assessment.medicalAlert)
        || (assessmentFilter === 'completed' && assessment.status !== 'draft')
        || (assessmentFilter === 'drafts' && assessment.status === 'draft');

      return matchesSearch && matchesFilter;
    });

    if (assessmentView === 'form') {
      const assessmentProgress = Math.round(((assessmentStep + 1) / assessmentSteps.length) * 100);
      const isFinalAssessmentStep = assessmentStep === assessmentSteps.length - 1;
      return (
        <div className={`assessment-workbench assessment-step-${assessmentStep + 1}`}>
          <header className="assessment-flow-topbar">
            <button type="button" onClick={resetAssessmentFlow} aria-label="Fechar avaliação"><Icon name="close" size={20} /></button>
            <div>
              <strong>Avaliação física</strong>
              <span>{getAssessmentStudent()?.name || assessmentForm.personalData.fullName || 'Novo aluno'}</span>
            </div>
            <span className="assessment-flow-date">{new Date(assessmentForm.assessmentDate || Date.now()).toLocaleDateString('pt-BR')}</span>
          </header>

          <main className="assessment-flow-main">
            <div className="assessment-flow-progress">
              <div><strong>Passo {assessmentStep + 1} de {assessmentSteps.length}</strong><span>{assessmentProgress}% concluído</span></div>
              <div className="assessment-progress-track"><i style={{ width: `${assessmentProgress}%` }}></i></div>
            </div>

            <div className="assessment-flow-heading">
              <span>{isFinalAssessmentStep ? 'Revisão final' : 'Avaliação guiada'}</span>
              <h2>{isFinalAssessmentStep ? 'Revisão e plano final' : assessmentSteps[assessmentStep].title}</h2>
              <p>{isFinalAssessmentStep
                ? 'Confira os dados coletados e revise o plano antes de atribuí-lo ao aluno.'
                : 'Preencha as informações desta etapa para construir uma avaliação completa e segura.'}</p>
            </div>

            <nav className="assessment-stepper assessment-stepper-wide" aria-label="Etapas da avaliação">
              {assessmentSteps.map((step, index) => (
                <button key={step.title} className={`${assessmentStep === index ? 'active' : ''} ${index < assessmentStep ? 'completed' : ''}`} onClick={() => setAssessmentStep(index)}>
                  <strong>{index < assessmentStep ? <Icon name="check" size={14} /> : index + 1}</strong>
                  <span>{step.title}</span>
                </button>
              ))}
            </nav>

            <section className="assessment-current-step">
              {!isFinalAssessmentStep && <h3 className="assessment-step-title">{assessmentSteps[assessmentStep].title}</h3>}
              {assessmentSteps[assessmentStep].content}
            </section>
          </main>

          {createPortal(<footer className="assessment-flow-actions">
            <div>
              {isFinalAssessmentStep ? (
                <button type="button" className="assessment-action secondary" onClick={() => saveAssessment('draft')}>Salvar rascunho</button>
              ) : (
                <button type="button" className="assessment-action secondary" disabled={assessmentStep === 0} onClick={() => setAssessmentStep((step) => Math.max(0, step - 1))}>Voltar</button>
              )}
              {isFinalAssessmentStep && <button type="button" className="assessment-action subtle" onClick={savePresetAsTemplate}>Salvar modelos</button>}
              <button
                type="button"
                className="assessment-action primary"
                onClick={() => isFinalAssessmentStep ? saveAssessment('completed') : setAssessmentStep((step) => Math.min(assessmentSteps.length - 1, step + 1))}
              >
                {isFinalAssessmentStep ? 'Concluir e atribuir' : 'Continuar'} <Icon name="chevronRight" size={17} />
              </button>
            </div>
          </footer>, document.body)}
        </div>
      );
    }

    return (
      <div className="assessment-hub">
        <section className="assessment-hero">
          <div>
            <span className="eyebrow">Avaliacao 2.0</span>
            <h2>Triagem, medidas e decisao do personal em um fluxo so</h2>
            <p>Comece por alunos pendentes, revise alertas medicos e gere presets sem liberar nada automaticamente.</p>
          </div>
          <button className="industrial-btn primary" onClick={() => startAssessmentFlow()}>
            <Icon name="clipboard" size={18} /> Nova avaliacao
          </button>
        </section>

        <div className="assessment-kpi-grid">
          {[
            ['Avaliacoes', assessments.length, 'clipboard'],
            ['Pendentes', pendingStudents.length, 'alert'],
            ['Com alerta', assessments.filter((assessment) => assessment.medicalAlert).length, 'alert'],
            ['Concluidas', assessments.filter((assessment) => assessment.status !== 'draft').length, 'check']
          ].map(([label, value, icon]) => (
            <article className="assessment-kpi-card" key={label}>
              <Icon name={icon} size={24} />
              <strong>{value}</strong>
              <span>{label}</span>
            </article>
          ))}
        </div>

        <div className="assessment-board">
          <section className="personal-panel assessment-main-list">
            <div className="panel-title-row">
              <h2>Historico de avaliacoes</h2>
              <span>{filteredAssessments.length} exibidas</span>
            </div>
            <div className="assessment-toolbar">
              <input value={assessmentSearch} onChange={(event) => setAssessmentSearch(event.target.value)} placeholder="Buscar aluno, e-mail ou objetivo" />
              <select value={assessmentFilter} onChange={(event) => setAssessmentFilter(event.target.value)}>
                <option value="all">Todas</option>
                <option value="alerts">Com alerta</option>
                <option value="completed">Concluidas</option>
                <option value="drafts">Rascunhos</option>
              </select>
            </div>

            <div className="assessment-card-list">
              {filteredAssessments.length === 0 ? (
                <div className="empty-state">Nenhuma avaliacao encontrada para os filtros atuais.</div>
              ) : filteredAssessments.map((assessment) => (
                <button key={assessment.id} className="assessment-record-card" onClick={() => setViewingAssessment(assessment)}>
                  <div>
                    <strong>{assessment.student?.name}</strong>
                    <span>{assessment.student?.email}</span>
                  </div>
                  <div>
                    <small>{assessment.assessmentDate}</small>
                    <span>{assessment.goal || 'Objetivo nao informado'}</span>
                  </div>
                  <div className={assessment.medicalAlert ? 'assessment-status alert' : 'assessment-status'}>
                    {assessment.medicalAlert ? 'Alerta medico' : assessment.status === 'draft' ? 'Rascunho' : 'Concluida'}
                  </div>
                </button>
              ))}
            </div>
          </section>

          <aside className="personal-panel assessment-side-panel">
            <div className="panel-title-row">
              <h2>Pendentes</h2>
              <span>{pendingStudents.length}</span>
            </div>
            <div className="pending-student-list">
              {pendingStudents.length === 0 ? (
                <p className="empty-state">Todos os alunos vinculados ja possuem avaliacao.</p>
              ) : pendingStudents.slice(0, 8).map((student) => (
                <button key={student.id} className="pending-student-card" onClick={() => startAssessmentFlow(student)}>
                  <strong>{student.name}</strong>
                  <span>{student.email}</span>
                  <small>{student.gym?.name}</small>
                </button>
              ))}
            </div>
          </aside>
        </div>
      </div>
    );
  };

  const sectionContent = {
    inicio: renderHome,
    alunos: renderStudents,
    treinos: renderWorkouts,
    avaliacoes: renderAssessments
  };

  const titleBySection = {
    inicio: 'Visão geral',
    alunos: 'Seus alunos',
    treinos: 'Gestão de treinos',
    avaliacoes: 'Avaliações físicas'
  };

  const iconBySection = {
    inicio: 'chart',
    alunos: 'userPlus',
    treinos: 'dumbbell',
    avaliacoes: 'clipboard'
  };

  const renderSection = sectionContent[section] || renderHome;
  const needsPersonalGymSelection = gyms.length > 1 && !selectedPersonalGymId;

  return (
    <>
    <div className={`personal-container ${section === 'inicio' ? 'personal-home-page' : ''} ${section === 'avaliacoes' && assessmentView === 'form' ? 'personal-assessment-form-page' : ''}`}>
      <div className="personal-content">
        <header className="personal-page-heading">
          <div>
            <span className="personal-eyebrow">Olá, {user?.name?.split(' ')[0] || 'Personal'}</span>
            <h1>{titleBySection[section] || titleBySection.inicio}</h1>
            <p>
            {selectedPersonalGym
              ? `Acompanhe alunos, treinos e avaliações na ${selectedPersonalGym.name}.`
              : 'Acompanhe seus alunos, treinos e avaliações em um só lugar.'}
            </p>
          </div>
          <span className="personal-heading-icon"><Icon name={iconBySection[section] || iconBySection.inicio} size={25} /></span>
        </header>

        {needsPersonalGymSelection ? (
          <section className="personal-gym-selector">
            <div>
              <span className="eyebrow">Contexto do personal</span>
              <h2>Qual academia voce quer gerenciar agora?</h2>
              <p>Os alunos, treinos, avaliacoes e indicadores serao filtrados pela academia escolhida.</p>
            </div>
            <div className="personal-gym-options">
              {gyms.map((gym) => (
                <button key={gym.id} onClick={() => selectPersonalGym(gym.id)}>
                  <Icon name="gymLogo" size={28} />
                  <strong>{gym.name}</strong>
                  <span>Gerenciar esta academia</span>
                </button>
              ))}
            </div>
          </section>
        ) : renderSection()}
      </div>
    </div>
    {renderAssignmentOrganizer()}
    {renderStudentDetails()}
    {renderAssessmentDetails()}
    </>
  );
}
