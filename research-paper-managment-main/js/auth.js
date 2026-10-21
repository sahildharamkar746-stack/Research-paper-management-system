/**
 * Research Paper Management System (RPMS)
 * auth.js - Authentication & Role-Based Access Control (RBAC)
 * 
 * Manages user sessions, registration, login validation, and page route security.
 */

/**
 * Retrieves currently logged-in user from LocalStorage.
 * @returns {Object|null}
 */
function getCurrentUser() {
  try {
    const raw = localStorage.getItem('rpms_current_user');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error('Error reading current user:', e);
    return null;
  }
}

/**
 * Saves currently logged-in user to LocalStorage.
 * @param {Object} user 
 */
function setCurrentUser(user) {
  if (!user) {
    localStorage.removeItem('rpms_current_user');
  } else {
    localStorage.setItem('rpms_current_user', JSON.stringify(user));
  }
}

/**
 * Logs in a user with email and password credentials.
 * @param {string} email 
 * @param {string} password 
 * @returns {Object} result { success: boolean, message: string, user: Object|null }
 */
function login(email, password) {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();

  if (!cleanEmail || !cleanPass) {
    return { success: false, message: 'Please provide both email and password.' };
  }

  const user = findUserByEmail(cleanEmail);
  if (!user) {
    return { success: false, message: 'No account found with this email address.' };
  }

  if (user.status === 'Disabled') {
    return { success: false, message: 'Your account has been deactivated. Please contact the administrator.' };
  }

  if (user.password !== cleanPass) {
    return { success: false, message: 'Invalid password. Please check your credentials.' };
  }

  // Session successful
  setCurrentUser(user);
  addActivity(`${user.name} (${user.role}) logged in.`, 'auth');
  return { success: true, message: 'Login successful. Redirecting...', user };
}

/**
 * Registers a new user account.
 * (Note: Registering as Admin is explicitly disallowed here).
 * @param {Object} details 
 * @returns {Object} result
 */
function register(details) {
  const { name, email, password, confirmPassword, role } = details;

  if (!name || name.trim().length < 2) {
    return { success: false, message: 'Please enter a valid full name.' };
  }

  const cleanEmail = (email || '').trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return { success: false, message: 'Please enter a valid email address.' };
  }

  if (findUserByEmail(cleanEmail)) {
    return { success: false, message: 'An account with this email already exists.' };
  }

  if (!password || password.length < 6) {
    return { success: false, message: 'Password must be at least 6 characters long.' };
  }

  if (password !== confirmPassword) {
    return { success: false, message: 'Passwords do not match.' };
  }

  if (role === 'Admin') {
    return { success: false, message: 'Administrator registration is restricted.' };
  }

  if (!['Student', 'Faculty'].includes(role)) {
    return { success: false, message: 'Please select a valid role (Student/Researcher or Faculty).' };
  }

  const newUser = {
    id: 'user_' + Date.now(),
    name: name.trim(),
    email: cleanEmail,
    password: password,
    role: role,
    status: 'Active',
    institution: 'Apex Institute of Technology',
    department: 'Engineering & Technology',
    designation: role === 'Faculty' ? 'Assistant Professor' : 'Undergraduate Student',
    bio: 'Academic researcher interested in engineering and technological innovation.',
    interests: 'Computer Science, Engineering, Research',
    createdAt: new Date().toISOString().split('T')[0]
  };

  saveUser(newUser);
  return { success: true, message: 'Registration successful! You can now log in.', user: newUser };
}

/**
 * Logs out the current user session and redirects to login page.
 */
function logout() {
  const user = getCurrentUser();
  if (user) {
    addActivity(`${user.name} logged out.`, 'auth');
  }
  localStorage.removeItem('rpms_current_user');
  window.location.href = 'login.html';
}

/**
 * Protects pages from unauthorized access.
 * If user is not logged in, redirects to login.html.
 * If allowedRoles is specified and user role isn't included, redirects to dashboard.html with an alert.
 * @param {Array<string>} [allowedRoles]
 */
function requireAuth(allowedRoles = []) {
  const user = getCurrentUser();
  if (!user) {
    const currentPath = encodeURIComponent(window.location.pathname.split('/').pop() || 'dashboard.html');
    window.location.href = `login.html?redirect=${currentPath}`;
    return null;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    alert(`Access Denied: The page requires ${allowedRoles.join(' or ')} privileges.`);
    window.location.href = 'dashboard.html';
    return null;
  }

  return user;
}

/**
 * Used on guest pages (login.html, register.html).
 * If user is already logged in, automatically redirects to dashboard.html.
 */
function redirectIfLoggedIn() {
  const user = getCurrentUser();
  if (user) {
    window.location.href = 'dashboard.html';
  }
}

/**
 * Populates current user profile info, initials, and role badges in UI navbars/sidebars.
 */
function renderUserUI() {
  const user = getCurrentUser();
  if (!user) return;

  // Name displays
  document.querySelectorAll('.current-user-name').forEach(el => {
    el.textContent = user.name;
  });

  // Email displays
  document.querySelectorAll('.current-user-email').forEach(el => {
    el.textContent = user.email;
  });

  // Role badges
  document.querySelectorAll('.current-user-role').forEach(el => {
    el.textContent = user.role;
    el.className = `current-user-role badge badge-role-${user.role.toLowerCase()}`;
  });

  // Initials Avatar
  const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U';
  document.querySelectorAll('.current-user-avatar').forEach(el => {
    el.textContent = initials;
  });

  // Role-based visibility toggles
  if (user.role !== 'Admin') {
    document.querySelectorAll('.admin-only').forEach(el => el.classList.add('d-none'));
  } else {
    document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('d-none'));
  }

  if (user.role !== 'Faculty' && user.role !== 'Admin') {
    document.querySelectorAll('.faculty-only').forEach(el => el.classList.add('d-none'));
  } else {
    document.querySelectorAll('.faculty-only').forEach(el => el.classList.remove('d-none'));
  }
}

// Automatically bind renderUserUI once DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  renderUserUI();
});
