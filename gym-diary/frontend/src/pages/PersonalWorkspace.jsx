import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
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

export default function PersonalWorkspace() {
  const { section = 'inicio' } = useParams();
  const { data, refreshData } = useData();
  const [summary, setSummary] = useState(null);
  const [gyms, setGyms] = useState([]);
  const [selectedPersonalGymId, setSelectedPersonalGymId] = useState(() => localStorage.getItem('selectedPersonalGymId') || '');
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [templateForm, setTemplateForm] = useState({ name: '', exercises: [] });
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [studentInviteForm, setStudentInviteForm] = useState({ email: '', gymId: '' });
  const [assignmentForm, setAssignmentForm] = useState({ studentEmail: '', templateId: '', notes: '', gymId: '' });
  const [assessmentForm, setAssessmentForm] = useState(emptyAssessment);
  const [assessmentStep, setAssessmentStep] = useState(0);
  const [assessmentView, setAssessmentView] = useState('list');
  const [assessmentFilter, setAssessmentFilter] = useState('all');
  const [assessmentSearch, setAssessmentSearch] = useState('');
  const [assessmentStudentEmail, setAssessmentStudentEmail] = useState('');
  const [preset, setPreset] = useState(emptyPreset);
  const [expandedPresetWorkouts, setExpandedPresetWorkouts] = useState({});

  const templates = data?.workoutTemplates || [];
  const exercises = data?.exercises || [];
  const selectedPersonalGym = gyms.find((gym) => String(gym.id) === String(selectedPersonalGymId)) || null;

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
    const response = await api.getPersonalStudent(student.id, selectedPersonalGymId);
    setStudentProfile(response);
    setAssignmentForm((current) => ({ ...current, studentEmail: student.email, gymId: student.gym?.id || current.gymId }));
    setAssessmentForm((current) => ({ ...current, studentId: student.id }));
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
    setTemplateForm((current) => {
      const exists = current.exercises.some((item) => item.id === exerciseId);
      return {
        ...current,
        exercises: exists
          ? current.exercises.filter((item) => item.id !== exerciseId)
          : [...current.exercises, { id: exerciseId, defaultSets: 3 }]
      };
    });
  };

  const saveTemplate = async () => {
    if (!templateForm.name.trim() || templateForm.exercises.length === 0) {
      setMessage('Informe nome e pelo menos um exercicio para o modelo.');
      return;
    }

    if (editingTemplateId) {
      await api.updateTemplate(editingTemplateId, templateForm.name.trim(), templateForm.exercises);
      setMessage('Modelo de treino atualizado.');
    } else {
      await api.createTemplate(templateForm.name.trim(), templateForm.exercises);
      setMessage('Modelo de treino criado.');
    }

    setTemplateForm({ name: '', exercises: [] });
    setEditingTemplateId(null);
    await refreshData();
    await loadPersonalData();
  };

  const editTemplate = (template) => {
    setEditingTemplateId(template.id);
    setTemplateForm({
      name: template.name,
      exercises: (template.exercises || []).map((exercise) => ({
        id: exercise.id,
        defaultSets: exercise.defaultSets || 3
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
    return {
      id: exercise.id,
      name: exercise.name,
      category: exercise.category,
      defaultSets: sets,
      defaultReps: reps,
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
                { id: exercise.id, name: exercise.name, category: exercise.category, defaultSets: 3, defaultReps: '10-12', note: '' }
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
          defaultReps: exercise.defaultReps
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
          defaultReps: exercise.defaultReps
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

  const renderHome = () => (
    <>
      {selectedPersonalGym && (
        <section className="personal-active-gym-card">
          <span><Icon name="gymLogo" size={24} /> Academia ativa</span>
          <strong>{selectedPersonalGym.name}</strong>
        </section>
      )}
      <div className="personal-grid">
        {[
          ['Alunos vinculados', summary?.totalStudents || 0, 'userPlus'],
          ['Avaliacoes recentes', summary?.recentAssessments?.length || 0, 'clipboard'],
          ['Treinos criados', summary?.totalTemplates || 0, 'dumbbell'],
          ['Avaliacoes pendentes', summary?.pendingAssessments || 0, 'alert'],
          ['Alunos com treino ativo', summary?.studentsWithActiveWorkout || 0, 'check']
        ].map(([label, value, icon]) => (
          <article className="personal-stat-card" key={label}>
            <Icon name={icon} size={28} />
            <strong>{value}</strong>
            <span>{label}</span>
          </article>
        ))}
      </div>
    </>
  );

  const renderStudents = () => (
    <div className="personal-two-column">
      <section className="personal-panel">
        <div className="panel-title-row">
          <h2>Alunos</h2>
          <span>{students.length} matriculados</span>
        </div>
        <div className="personal-form compact-form">
          <div className="active-gym-inline">
            <Icon name="gymLogo" size={18} />
            <span>{selectedPersonalGym?.name || 'Academia nao selecionada'}</span>
          </div>
          <input
            type="email"
            value={studentInviteForm.email}
            onChange={(event) => setStudentInviteForm({ ...studentInviteForm, email: event.target.value })}
            placeholder="E-mail do aluno cadastrado"
          />
          <button type="button" className="industrial-btn small" onClick={addStudentByEmail}>Adicionar aluno</button>
        </div>
        <form className="personal-search" onSubmit={handleSearch}>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome ou e-mail" />
          <button>Buscar</button>
          {search && <button type="button" onClick={clearStudentSearch}>Limpar</button>}
        </form>
        <div className="personal-list">
          {students.map((student) => (
            <button key={student.id} className="student-row" onClick={() => openStudent(student)}>
              <strong>{student.name}</strong>
              <span>{student.email}</span>
              <small>{student.gym?.name}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="personal-panel">
        <div className="panel-title-row">
          <h2>{selectedStudent ? selectedStudent.name : 'Perfil do aluno'}</h2>
        </div>
        {!studentProfile ? (
          <p className="empty-state">Selecione um aluno para ver historico, progresso, treinos e avaliacoes.</p>
        ) : (
          <div className="student-profile-grid">
            <div>
              <h3>Historico recente</h3>
              {(studentProfile.history || []).slice(0, 5).map((item) => (
                <div className="compact-row" key={item.id}>
                  <span>{item.name}</span>
                  <small>{item.date}</small>
                </div>
              ))}
            </div>
            <div>
              <h3>Treinos do aluno</h3>
              {(studentProfile.assignments || []).map((assignment) => (
                <div className="compact-row" key={assignment.id}>
                  <span>{assignment.template?.name}</span>
                  <button onClick={() => toggleAssignmentStatus(assignment)}>{assignment.status === 'active' ? 'Desativar' : 'Ativar'}</button>
                </div>
              ))}
            </div>
            <div>
              <h3>Progresso</h3>
              <p className="metric-line">{studentProfile.history?.length || 0} treinos registrados</p>
              <p className="metric-line">{studentProfile.assessments?.length || 0} avaliacoes cadastradas</p>
            </div>
            <div>
              <h3>Acoes</h3>
              <button className="industrial-btn small" onClick={() => setAssignmentForm((current) => ({ ...current, studentEmail: selectedStudent.email, gymId: selectedStudent.gym?.id || current.gymId }))}>Criar treino para aluno</button>
              <button className="industrial-btn small" onClick={() => startAssessmentFlow(selectedStudent)}>Realizar avaliacao</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );

  const renderWorkouts = () => (
    <div className="personal-two-column">
      <section className="personal-panel">
        <div className="panel-title-row">
          <h2>{editingTemplateId ? 'Editar modelo' : 'Criar modelo'}</h2>
          {editingTemplateId && <button className="link-button" onClick={() => { setEditingTemplateId(null); setTemplateForm({ name: '', exercises: [] }); }}>Novo</button>}
        </div>
        <div className="personal-form">
          <input value={templateForm.name} onChange={(event) => setTemplateForm({ ...templateForm, name: event.target.value })} placeholder="Nome do treino" />
          <div className="exercise-picker">
            {exercises.map((exercise) => (
              <button
                key={exercise.id}
                className={templateForm.exercises.some((item) => item.id === exercise.id) ? 'selected' : ''}
                onClick={() => toggleExercise(exercise.id)}
              >
                {exercise.name}
              </button>
            ))}
          </div>
          <button className="industrial-btn" onClick={saveTemplate}>{editingTemplateId ? 'Salvar modelo' : 'Criar modelo'}</button>
        </div>
      </section>

      <section className="personal-panel">
        <div className="panel-title-row">
          <h2>Atribuir treino</h2>
        </div>
        <div className="personal-form">
          <div className="active-gym-inline">
            <Icon name="gymLogo" size={18} />
            <span>{selectedPersonalGym?.name || 'Academia nao selecionada'}</span>
          </div>
          <input
            type="email"
            value={assignmentForm.studentEmail}
            onChange={(event) => setAssignmentForm({ ...assignmentForm, studentEmail: event.target.value })}
            placeholder="E-mail do aluno"
          />
          <select value={assignmentForm.templateId} onChange={(event) => setAssignmentForm({ ...assignmentForm, templateId: event.target.value })}>
            <option value="">Selecione treino</option>
            {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
          </select>
          <textarea value={assignmentForm.notes} onChange={(event) => setAssignmentForm({ ...assignmentForm, notes: event.target.value })} placeholder="Observacoes para adaptar o treino sugerido" />
          <button className="industrial-btn" onClick={assignWorkout}>Atribuir ao aluno</button>
        </div>
      </section>

      <section className="personal-panel wide">
        <div className="panel-title-row">
          <h2>Modelos e treinos ativos</h2>
        </div>
        <div className="assignment-grid">
          {templates.map((template) => (
            <article className="template-card" key={template.id}>
              <h3>{template.name}</h3>
              <span>{template.exercises?.length || 0} exercicios</span>
              {(template.frequency || template.split_type || template.splitType) && (
                <small>{template.frequency || 'Frequencia livre'} | {template.split_type || template.splitType || 'Divisao livre'}</small>
              )}
              <button onClick={() => editTemplate(template)}>Editar</button>
            </article>
          ))}
          {assignments.map((assignment) => (
            <article className="template-card" key={`assignment-${assignment.id}`}>
              <h3>{assignment.student?.name}</h3>
              <span>{assignment.template?.name} | {assignment.status === 'active' ? 'Ativo' : 'Inativo'}</span>
              <button onClick={() => toggleAssignmentStatus(assignment)}>{assignment.status === 'active' ? 'Desativar' : 'Ativar'}</button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );

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
    const summaryItems = [
      ['Aluno', selectedAssessmentStudent?.name || assessmentForm.personalData.fullName || 'Nao selecionado'],
      ['Objetivo', assessmentForm.personalData.mainGoal],
      ['Nivel atual', assessmentForm.activityHistory.currentLevel || 'Nao informado'],
      ['Disponibilidade', `${assessmentForm.availability.availableDays || '?'} | ${assessmentForm.availability.timePerWorkout}`],
      ['IMC', calculateBmi() || 'Nao calculado'],
      ['Restricoes', assessmentHasMedicalAlert ? medicalAlertMessage : 'Sem alerta medico no questionario']
    ];

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

          <div className="review-summary-list">
            {summaryItems.map(([label, value]) => (
              <div className="review-summary-item" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>

          <textarea
            value={assessmentForm.workoutSuggestion}
            onChange={(event) => setAssessmentForm({ ...assessmentForm, workoutSuggestion: event.target.value })}
            placeholder="Resumo tecnico, observacoes da avaliacao ou sugestao de treino"
          />
        </div>

        <div className="preset-review embedded">
          <div className="panel-title-row">
            <h3>Plano semanal editavel</h3>
            <span>Nao liberado ao aluno</span>
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
                        <div>
                          <strong>{workout.name || `Treino ${workoutIndex + 1}`}</strong>
                          <span>{workout.frequency || 'Frequencia livre'} | {workout.exercises?.length || 0} exercicios</span>
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
                                <input type="number" value={exercise.defaultSets} onChange={(event) => updatePresetWorkoutExercise(workoutIndex, exerciseIndex, 'defaultSets', parseInt(event.target.value) || 1)} />
                                <input value={exercise.defaultReps} onChange={(event) => updatePresetWorkoutExercise(workoutIndex, exerciseIndex, 'defaultReps', event.target.value)} />
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
              <div className="summary-actions">
                <button className="industrial-btn primary" onClick={savePresetAsTemplate}>Salvar plano como modelos</button>
                <button className="industrial-btn primary" onClick={() => saveAssessment('completed')}>Concluir e atribuir ao aluno</button>
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
      return (
        <div className="assessment-workbench">
          <section className="personal-panel assessment-wizard-panel">
            <div className="assessment-wizard-header">
              <div>
                <span className="eyebrow">Avaliacao guiada</span>
                <h2>{assessmentForm.id ? 'Editar avaliacao' : 'Nova avaliacao fisica'}</h2>
                <p>Preencha a triagem, revise alertas e gere um preset apenas para revisao do personal.</p>
              </div>
              <button className="link-button" onClick={resetAssessmentFlow}>Fechar avaliacao</button>
            </div>

            <div className="assessment-stepper assessment-stepper-wide">
              {assessmentSteps.map((step, index) => (
                <button key={step.title} className={assessmentStep === index ? 'active' : ''} onClick={() => setAssessmentStep(index)}>
                  <strong>{index + 1}</strong>
                  <span>{step.title}</span>
                </button>
              ))}
            </div>

            <div className="assessment-current-step">
              <h3 className="assessment-step-title">{assessmentSteps[assessmentStep].title}</h3>
              {assessmentSteps[assessmentStep].content}
            </div>

            {assessmentStep !== assessmentSteps.length - 1 && (
              <p className="assessment-step-hint">Use as etapas acima para navegar pela avaliacao. O preset editavel aparece na ultima etapa.</p>
            )}
          </section>
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
                <button key={assessment.id} className="assessment-record-card" onClick={() => editAssessment(assessment)}>
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
    inicio: 'PAINEL DO PERSONAL',
    alunos: 'ALUNOS',
    treinos: 'TREINOS',
    avaliacoes: 'AVALIACOES'
  };

  const renderSection = sectionContent[section] || renderHome;
  const needsPersonalGymSelection = gyms.length > 1 && !selectedPersonalGymId;

  return (
    <div className="personal-container">
      <div className="industrial-bg"></div>
      <div className="personal-content">
        <div className="dashboard-header">
          <h1>{titleBySection[section] || titleBySection.inicio}</h1>
          <div className="header-rivets">
            <span className="rivet"></span>
            <span className="rivet"></span>
            <span className="rivet"></span>
          </div>
          <p className="user-greeting">
            {selectedPersonalGym
              ? `GESTAO DE ALUNOS, TREINOS E AVALIACOES | ${selectedPersonalGym.name}`
              : 'GESTAO DE ALUNOS, TREINOS E AVALIACOES'}
          </p>
        </div>

        {message && <div className="personal-message">{message}</div>}
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
  );
}
