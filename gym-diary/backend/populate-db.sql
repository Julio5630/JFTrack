-- populate-db.sql
-- Inserts para popular o banco de dados com dados do usuário admin@treino.com
-- Execute este script APÓS ter o usuário admin criado (id = 1)

-- Inserir exercícios
INSERT INTO exercises (user_id, name, category) VALUES
(1, 'Supino Reto', 'Peito'),
(1, 'Supino Inclinado', 'Peito'),
(1, 'Crucifixo', 'Peito'),
(1, 'Rosca Direta', 'Braços'),
(1, 'Rosca Martelo', 'Braços'),
(1, 'Tríceps Corda', 'Braços'),
(1, 'Agachamento', 'Pernas'),
(1, 'Leg Press', 'Pernas'),
(1, 'Cadeira Extensora', 'Pernas'),
(1, 'Puxada Frontal', 'Costas'),
(1, 'Remada Curvada', 'Costas'),
(1, 'Desenvolvimento', 'Ombros'),
(1, 'Elevação Lateral', 'Ombros'),
(1, 'Abdominal', 'Abdômen'),
(1, 'Prancha', 'Core')
ON DUPLICATE KEY UPDATE id=id;

-- Inserir templates de treino
INSERT INTO workout_templates (user_id, name) VALUES
(1, 'Treino A - Peito e Tríceps'),
(1, 'Treino B - Costas e Bíceps'),
(1, 'Treino C - Pernas'),
(1, 'Treino D - Ombros e Abdômen')
ON DUPLICATE KEY UPDATE id=id;

-- Vincular exercícios aos templates
-- Template A: Peito e Tríceps (assumindo id = 1)
INSERT INTO template_exercises (template_id, exercise_id, position) VALUES
(1, (SELECT id FROM exercises WHERE user_id = 1 AND name = 'Supino Reto'), 1),
(1, (SELECT id FROM exercises WHERE user_id = 1 AND name = 'Supino Inclinado'), 2),
(1, (SELECT id FROM exercises WHERE user_id = 1 AND name = 'Crucifixo'), 3),
(1, (SELECT id FROM exercises WHERE user_id = 1 AND name = 'Tríceps Corda'), 4)
ON DUPLICATE KEY UPDATE id=id;

-- Template B: Costas e Bíceps (assumindo id = 2)
INSERT INTO template_exercises (template_id, exercise_id, position) VALUES
(2, (SELECT id FROM exercises WHERE user_id = 1 AND name = 'Puxada Frontal'), 1),
(2, (SELECT id FROM exercises WHERE user_id = 1 AND name = 'Remada Curvada'), 2),
(2, (SELECT id FROM exercises WHERE user_id = 1 AND name = 'Rosca Direta'), 3),
(2, (SELECT id FROM exercises WHERE user_id = 1 AND name = 'Rosca Martelo'), 4)
ON DUPLICATE KEY UPDATE id=id;

-- Template C: Pernas (assumindo id = 3)
INSERT INTO template_exercises (template_id, exercise_id, position) VALUES
(3, (SELECT id FROM exercises WHERE user_id = 1 AND name = 'Agachamento'), 1),
(3, (SELECT id FROM exercises WHERE user_id = 1 AND name = 'Leg Press'), 2),
(3, (SELECT id FROM exercises WHERE user_id = 1 AND name = 'Cadeira Extensora'), 3)
ON DUPLICATE KEY UPDATE id=id;

-- Template D: Ombros e Abdômen (assumindo id = 4)
INSERT INTO template_exercises (template_id, exercise_id, position) VALUES
(4, (SELECT id FROM exercises WHERE user_id = 1 AND name = 'Desenvolvimento'), 1),
(4, (SELECT id FROM exercises WHERE user_id = 1 AND name = 'Elevação Lateral'), 2),
(4, (SELECT id FROM exercises WHERE user_id = 1 AND name = 'Abdominal'), 3),
(4, (SELECT id FROM exercises WHERE user_id = 1 AND name = 'Prancha'), 4)
ON DUPLICATE KEY UPDATE id=id;

-- Inserir rotina semanal
INSERT INTO weekly_routines (user_id, day_of_week, template_id) VALUES
(1, 0, 1), -- Domingo: Treino A
(1, 1, 2), -- Segunda: Treino B
(1, 3, 3), -- Quarta: Treino C
(1, 5, 4)  -- Sexta: Treino D
ON DUPLICATE KEY UPDATE template_id=VALUES(template_id);

-- Inserir treino histórico de exemplo
INSERT INTO workout_history (user_id, template_id, name, date) VALUES
(1, 1, 'Treino A - Peito e Tríceps', '2024-01-15')
ON DUPLICATE KEY UPDATE id=id;

-- Inserir sets do treino histórico (assumindo workout_id = 1)
INSERT INTO workout_sets (workout_id, exercise_id, position, set_number, reps, weight, completed) VALUES
(1, (SELECT id FROM exercises WHERE user_id = 1 AND name = 'Supino Reto'), 1, 1, 12, 60.0, 1),
(1, (SELECT id FROM exercises WHERE user_id = 1 AND name = 'Supino Reto'), 1, 2, 10, 65.0, 1),
(1, (SELECT id FROM exercises WHERE user_id = 1 AND name = 'Supino Reto'), 1, 3, 8, 70.0, 1),
(1, (SELECT id FROM exercises WHERE user_id = 1 AND name = 'Supino Inclinado'), 2, 1, 12, 50.0, 1),
(1, (SELECT id FROM exercises WHERE user_id = 1 AND name = 'Supino Inclinado'), 2, 2, 10, 55.0, 1),
(1, (SELECT id FROM exercises WHERE user_id = 1 AND name = 'Crucifixo'), 3, 1, 15, 25.0, 1),
(1, (SELECT id FROM exercises WHERE user_id = 1 AND name = 'Crucifixo'), 3, 2, 12, 30.0, 1),
(1, (SELECT id FROM exercises WHERE user_id = 1 AND name = 'Tríceps Corda'), 4, 1, 12, 40.0, 1),
(1, (SELECT id FROM exercises WHERE user_id = 1 AND name = 'Tríceps Corda'), 4, 2, 10, 45.0, 1)
ON DUPLICATE KEY UPDATE id=id;