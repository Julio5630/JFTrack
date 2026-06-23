CREATE DATABASE IF NOT EXISTS gym_diary;
USE gym_diary;

CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_profiles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    profile_type ENUM('student', 'personal', 'gym', 'admin') NOT NULL,
    status ENUM('active', 'pending', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_profile (user_id, profile_type)
);

CREATE TABLE IF NOT EXISTS gyms (
    id INT PRIMARY KEY AUTO_INCREMENT,
    owner_user_id INT NOT NULL,
    name VARCHAR(140) NOT NULL,
    phone VARCHAR(40) DEFAULT '',
    email VARCHAR(120) DEFAULT '',
    address VARCHAR(255) DEFAULT '',
    responsible VARCHAR(120) DEFAULT '',
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_gym_owner (owner_user_id)
);

CREATE TABLE IF NOT EXISTS gym_memberships (
    id INT PRIMARY KEY AUTO_INCREMENT,
    gym_id INT NOT NULL,
    user_id INT,
    invited_email VARCHAR(120) NOT NULL,
    role ENUM('student', 'personal') NOT NULL,
    status ENUM('active', 'pending', 'removed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_gym_user_role (gym_id, user_id, role),
    UNIQUE KEY unique_gym_email_role (gym_id, invited_email, role)
);

CREATE TABLE IF NOT EXISTS exercises (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    gif_url VARCHAR(500) DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_exercise (user_id, name)
);

CREATE TABLE IF NOT EXISTS workout_templates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS template_exercises (
    id INT PRIMARY KEY AUTO_INCREMENT,
    template_id INT NOT NULL,
    exercise_id INT NOT NULL,
    position INT NOT NULL,
    default_sets INT DEFAULT 3,
    FOREIGN KEY (template_id) REFERENCES workout_templates(id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE,
    UNIQUE KEY unique_template_position (template_id, position)
);

CREATE TABLE IF NOT EXISTS weekly_routines (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    day_of_week INT CHECK (day_of_week BETWEEN 0 AND 6),
    template_id INT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES workout_templates(id) ON DELETE SET NULL,
    UNIQUE KEY unique_user_day (user_id, day_of_week)
);

CREATE TABLE IF NOT EXISTS workout_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    template_id INT,
    name VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES workout_templates(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS workout_sets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    workout_id INT NOT NULL,
    exercise_id INT NOT NULL,
    position INT NOT NULL,
    set_number INT NOT NULL,
    reps INT NOT NULL,
    weight DECIMAL(5,2) NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    notes TEXT,
    FOREIGN KEY (workout_id) REFERENCES workout_history(id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
);


