/**
 * Research Paper Management System (RPMS)
 * data.js - LocalStorage Database Layer
 * 
 * Manages all persistent data operations for users, papers, categories,
 * reviews, activities, and analytical insights.
 */

const STORAGE_KEYS = {
  USERS: 'rpms_users',
  PAPERS: 'rpms_papers',
  CATEGORIES: 'rpms_categories',
  REVIEWS: 'rpms_reviews',
  ACTIVITY: 'rpms_activity',
  CURRENT_USER: 'rpms_current_user'
};

// ==========================================
// DEFAULT SEED DATA
// ==========================================

const DEFAULT_USERS = [
  {
    id: 'user_1',
    name: 'System Administrator',
    email: 'admin@rpms.com',
    role: 'Admin',
    status: 'Active',
    institution: 'Apex Institute of Technology',
    department: 'Computer Science & Engineering',
    designation: 'Chief System Administrator',
    bio: 'Oversees academic repositories, peer-review pipelines, and digital preservation.',
    interests: 'Distributed Systems, Research Ethics, Digital Libraries',
    createdAt: '2025-01-10'
  },
  {
    id: 'user_2',
    name: 'Dr. Rahul Kulkarni',
    email: 'faculty@rpms.com',
    role: 'Faculty',
    status: 'Active',
    institution: 'Apex Institute of Technology',
    department: 'Artificial Intelligence & Data Science',
    designation: 'Associate Professor & Senior Reviewer',
    bio: 'Researcher with 15+ years experience in deep learning, computer vision, and agricultural IoT.',
    interests: 'Artificial Intelligence, Computer Vision, Edge Computing',
    createdAt: '2025-01-15'
  },
  {
    id: 'user_3',
    name: 'Aarav Sharma',
    email: 'student@rpms.com',
    role: 'Student',
    status: 'Active',
    institution: 'Apex Institute of Technology',
    department: 'Computer Science & Engineering',
    designation: 'Undergraduate Researcher (Final Year)',
    bio: 'Passionate student researcher focusing on applied neural networks and smart agriculture.',
    interests: 'Deep Learning, IoT, Precision Agriculture',
    createdAt: '2025-02-01'
  },
  {
    id: 'user_4',
    name: 'Riya Patil',
    email: 'riya.patil@rpms.com',
    role: 'Student',
    status: 'Active',
    institution: 'Apex Institute of Technology',
    department: 'Information Technology',
    designation: 'Graduate Student',
    bio: 'Works on neural vision pipelines, medical image processing, and agricultural automation.',
    interests: 'Computer Vision, Deep Learning, Healthcare Tech',
    createdAt: '2025-02-10'
  },
  {
    id: 'user_5',
    name: 'Dr. Neha Deshmukh',
    email: 'neha.deshmukh@rpms.com',
    role: 'Faculty',
    status: 'Active',
    institution: 'Apex Institute of Technology',
    department: 'Electronics & Communication',
    designation: 'Professor & Head of Research',
    bio: 'Specialist in low-power wireless sensor networks, embedded IoT systems, and telemetry.',
    interests: 'Internet of Things, Embedded Systems, Cyber Physical Systems',
    createdAt: '2025-01-20'
  }
];

const DEFAULT_CATEGORIES = [
  { id: 'cat_1', name: 'Artificial Intelligence', description: 'Neural models, heuristic problem solving, and autonomous cognitive systems.', icon: 'cpu' },
  { id: 'cat_2', name: 'Machine Learning', description: 'Statistical learning models, classification, regression, and deep reinforcement learning.', icon: 'git-branch' },
  { id: 'cat_3', name: 'Data Science', description: 'Big data mining, predictive analytics, visualization, and probabilistic modeling.', icon: 'database' },
  { id: 'cat_4', name: 'Cyber Security', description: 'Intrusion prevention, cryptography, zero-trust architectures, and network defense.', icon: 'shield' },
  { id: 'cat_5', name: 'Internet of Things', description: 'Sensors, actuators, edge gateways, telemetry, and industrial IoT protocols.', icon: 'radio' },
  { id: 'cat_6', name: 'Cloud Computing', description: 'Serverless architecture, container orchestration, microservices, and virtualization.', icon: 'cloud' },
  { id: 'cat_7', name: 'Computer Networks', description: 'SDN, high-throughput routing protocols, mesh networks, and 5G/6G infrastructures.', icon: 'server' },
  { id: 'cat_8', name: 'Robotics', description: 'Kinematics, autonomous rovers, path planning, and human-robot interaction.', icon: 'compass' },
  { id: 'cat_9', name: 'Blockchain', description: 'Decentralized ledgers, smart contracts, zero-knowledge proofs, and web3 security.', icon: 'link' },
  { id: 'cat_10', name: 'Computer Vision', description: 'Object detection, semantic segmentation, optical character recognition, and 3D reconstruction.', icon: 'eye' },
  { id: 'cat_11', name: 'Software Engineering', description: 'CI/CD practices, software verification, refactoring, and automated testing.', icon: 'code' },
  { id: 'cat_12', name: 'Quantum Computing', description: 'Quantum circuit simulations, qubit decoherence mitigation, and post-quantum crypto.', icon: 'zap' }
];

const DEFAULT_PAPERS = [
  {
    id: 'paper_1',
    title: 'AI-Based Crop Disease Detection Using Deep Learning',
    abstract: 'Plant diseases pose a severe threat to global food security. This paper proposes a lightweight Convolutional Neural Network (CNN) architecture trained on 50,000 leaf images to classify 14 crop diseases with an overall accuracy of 98.4%. The model is optimized for deployment on low-cost edge devices and tested across real agricultural testbeds.',
    keywords: 'Deep Learning, CNN, Plant Pathology, Edge Computing, Agriculture',
    category: 'Artificial Intelligence',
    publicationYear: '2025',
    doi: '10.1109/AGRITECH.2025.104921',
    journalConference: 'IEEE International Conference on Smart Agriculture',
    publicationType: 'Conference',
    methodology: 'Supervised Transfer Learning with MobileNetV3 backbones, data augmentation, and Quantization Aware Training (INT8) for edge efficiency.',
    technologiesUsed: 'Python, PyTorch, OpenCV, TensorRT, Raspberry Pi 4',
    authors: [
      { name: 'Aarav Sharma', institution: 'Apex Institute of Technology', email: 'student@rpms.com' },
      { name: 'Riya Patil', institution: 'Apex Institute of Technology', email: 'riya.patil@rpms.com' }
    ],
    status: 'Approved',
    submittedBy: 'student@rpms.com',
    submissionDate: '2025-02-15',
    fileName: 'Crop_Disease_Detection_DL_2025.pdf',
    fileSize: '3.4 MB',
    feedback: 'Excellent methodology and clear validation on edge hardware. Approved for publication in the digital library repository.',
    reviewedBy: 'Dr. Rahul Kulkarni',
    reviewedDate: '2025-02-20'
  },
  {
    id: 'paper_2',
    title: 'Smart IoT-Based Agricultural Monitoring System',
    abstract: 'This research develops a multi-hop wireless sensor network for measuring real-time soil moisture, ambient humidity, temperature, and solar irradiance. Data is transmitted via LoRaWAN to a cloud telemetry dashboard, reducing agricultural irrigation water consumption by 32% across test fields.',
    keywords: 'Internet of Things, LoRaWAN, Smart Irrigation, Sensor Networks, Telemetry',
    category: 'Internet of Things',
    publicationYear: '2025',
    doi: '10.1016/j.iotj.2025.04.019',
    journalConference: 'Elsevier Internet of Things Journal',
    publicationType: 'Journal',
    methodology: 'Empirical hardware deployment with energy-harvesting nodes, LoRa telemetry gateway, and Kalman filter sensor fusion.',
    technologiesUsed: 'ESP32, LoRa SX1276, MQTT, Grafana, InfluxDB',
    authors: [
      { name: 'Vikram Joshi', institution: 'Apex Institute of Technology', email: 'vikram.joshi@rpms.com' },
      { name: 'Neha Deshmukh', institution: 'Apex Institute of Technology', email: 'neha.deshmukh@rpms.com' }
    ],
    status: 'Pending',
    submittedBy: 'student@rpms.com',
    submissionDate: '2025-03-01',
    fileName: 'Smart_IoT_Agri_Monitoring.pdf',
    fileSize: '2.8 MB',
    feedback: '',
    reviewedBy: '',
    reviewedDate: ''
  },
  {
    id: 'paper_3',
    title: 'Machine Learning Approach for Student Performance Prediction',
    abstract: 'Early detection of students needing academic intervention remains a critical objective in higher education. Using historical grade records and LMS engagement logs from 3,200 undergraduate students, we evaluate Random Forest, XGBoost, and Stacking Classifiers to predict semester outcomes with an ROC-AUC of 0.93.',
    keywords: 'Educational Data Mining, Predictive Modeling, XGBoost, Academic Analytics',
    category: 'Machine Learning',
    publicationYear: '2024',
    doi: '10.1007/s10639-024-12498-x',
    journalConference: 'Journal of Education and Information Technologies',
    publicationType: 'Journal',
    methodology: 'Feature engineering on clickstream data, handling class imbalance via SMOTE-NC, and SHAP explainability analysis.',
    technologiesUsed: 'Python, Scikit-Learn, XGBoost, SHAP, Pandas',
    authors: [
      { name: 'Aditya Kulkarni', institution: 'Apex Institute of Technology', email: 'aditya.k@rpms.com' },
      { name: 'Dr. Rahul Kulkarni', institution: 'Apex Institute of Technology', email: 'faculty@rpms.com' }
    ],
    status: 'Approved',
    submittedBy: 'faculty@rpms.com',
    submissionDate: '2024-11-10',
    fileName: 'Student_Performance_ML_Prediction.pdf',
    fileSize: '1.9 MB',
    feedback: 'Thorough statistical evaluation and valuable explainability insights. Well written.',
    reviewedBy: 'System Administrator',
    reviewedDate: '2024-11-18'
  },
  {
    id: 'paper_4',
    title: 'Blockchain-Based Secure Academic Certificate Verification',
    abstract: 'Academic credential forgery is an escalating problem worldwide. We present a decentralized ledger application built on Ethereum smart contracts that enables institutions to issue tamper-proof verifiable digital degrees with zero-knowledge proof verification, guaranteeing instant cryptographic authenticity.',
    keywords: 'Blockchain, Ethereum, Smart Contracts, Digital Identity, Cryptography',
    category: 'Blockchain',
    publicationYear: '2025',
    doi: '10.1145/3612845.3612901',
    journalConference: 'ACM Symposium on Applied Computing',
    publicationType: 'Conference',
    methodology: 'ERC-721 tokenization of academic credentials with IPFS decentralized metadata pinning and gas-optimized verification circuits.',
    technologiesUsed: 'Solidity, Hardhat, IPFS, Web3.js, Ethers.js',
    authors: [
      { name: 'Rohan Patil', institution: 'Apex Institute of Technology', email: 'rohan.p@rpms.com' },
      { name: 'Sneha Shah', institution: 'Apex Institute of Technology', email: 'sneha.s@rpms.com' }
    ],
    status: 'Under Review',
    submittedBy: 'student@rpms.com',
    submissionDate: '2025-02-28',
    fileName: 'Blockchain_Academic_Certificates.pdf',
    fileSize: '4.1 MB',
    feedback: 'Please provide additional information about the gas consumption benchmark and comparative cost analysis against traditional PKI.',
    reviewedBy: 'Dr. Rahul Kulkarni',
    reviewedDate: '2025-03-03'
  },
  {
    id: 'paper_5',
    title: 'Network Intrusion Detection Using Machine Learning',
    abstract: 'Modern enterprise networks face sophisticated zero-day anomalies that evade conventional signature-based firewalls. In this research, we evaluate deep autoencoders and gradient boosted trees against the NSL-KDD and CICIDS2017 datasets, highlighting key vulnerability vectors and detection trade-offs.',
    keywords: 'Cyber Security, Intrusion Detection, Autoencoders, Anomaly Detection',
    category: 'Cyber Security',
    publicationYear: '2024',
    doi: '10.1016/j.cose.2024.103810',
    journalConference: 'Computers & Security',
    publicationType: 'Journal',
    methodology: 'Unsupervised representation learning using deep stacked autoencoders followed by hybrid thresholding.',
    technologiesUsed: 'Python, TensorFlow, Scapy, Snort, Wireshark',
    authors: [
      { name: 'Kunal More', institution: 'Apex Institute of Technology', email: 'kunal.more@rpms.com' }
    ],
    status: 'Rejected',
    submittedBy: 'student@rpms.com',
    submissionDate: '2024-10-05',
    fileName: 'Network_Intrusion_Detection_ML.pdf',
    fileSize: '2.1 MB',
    feedback: 'Evaluation relies heavily on older synthetic datasets (NSL-KDD) without modern zero-day attack traces. Consider revising with more recent real-world traffic captures and resubmitting.',
    reviewedBy: 'Dr. Rahul Kulkarni',
    reviewedDate: '2024-10-15'
  },
  {
    id: 'paper_6',
    title: 'Real-Time Autonomous Drone Navigation via Computer Vision',
    abstract: 'Vision-based UAV navigation in GPS-denied environments requires rapid spatial awareness. We present an optical flow and depth estimation pipeline using lightweight visual SLAM combined with YOLOv8-nano, running at 45 FPS on an onboard Jetson Orin Nano processor.',
    keywords: 'Computer Vision, Robotics, Visual SLAM, Object Detection, UAV',
    category: 'Computer Vision',
    publicationYear: '2025',
    doi: '10.1109/ROBOTICS.2025.882190',
    journalConference: 'IEEE International Conference on Robotics and Automation (ICRA)',
    publicationType: 'Conference',
    methodology: 'Monocular Visual Odometry coupled with real-time semantic obstacle bounding box projection in 3D coordinate space.',
    technologiesUsed: 'NVIDIA Jetson, ROS2, C++, OpenCV, YOLOv8',
    authors: [
      { name: 'Aarav Sharma', institution: 'Apex Institute of Technology', email: 'student@rpms.com' },
      { name: 'Aditya Kulkarni', institution: 'Apex Institute of Technology', email: 'aditya.k@rpms.com' }
    ],
    status: 'Approved',
    submittedBy: 'student@rpms.com',
    submissionDate: '2025-01-22',
    fileName: 'Autonomous_Drone_Vision_Nav.pdf',
    fileSize: '5.2 MB',
    feedback: 'Strong robotic testbed implementation with real flight demonstration recordings.',
    reviewedBy: 'Dr. Rahul Kulkarni',
    reviewedDate: '2025-01-29'
  }
];

const DEFAULT_REVIEWS = [
  {
    id: 'rev_1',
    paperId: 'paper_1',
    paperTitle: 'AI-Based Crop Disease Detection Using Deep Learning',
    reviewerName: 'Dr. Rahul Kulkarni',
    reviewerEmail: 'faculty@rpms.com',
    status: 'Approved',
    feedback: 'Excellent methodology and clear validation on edge hardware. Approved for publication in the digital library repository.',
    reviewedDate: '2025-02-20'
  },
  {
    id: 'rev_2',
    paperId: 'paper_4',
    paperTitle: 'Blockchain-Based Secure Academic Certificate Verification',
    reviewerName: 'Dr. Rahul Kulkarni',
    reviewerEmail: 'faculty@rpms.com',
    status: 'Under Review',
    feedback: 'Please provide additional information about the gas consumption benchmark and comparative cost analysis against traditional PKI.',
    reviewedDate: '2025-03-03'
  },
  {
    id: 'rev_3',
    paperId: 'paper_5',
    paperTitle: 'Network Intrusion Detection Using Machine Learning',
    reviewerName: 'Dr. Rahul Kulkarni',
    reviewerEmail: 'faculty@rpms.com',
    status: 'Rejected',
    feedback: 'Evaluation relies heavily on older synthetic datasets (NSL-KDD) without modern zero-day attack traces. Consider revising with more recent real-world traffic captures and resubmitting.',
    reviewedDate: '2024-10-15'
  }
];

const DEFAULT_ACTIVITIES = [
  { id: 'act_1', text: 'Dr. Rahul Kulkarni reviewed paper "Blockchain-Based Secure Academic Certificate Verification".', timestamp: '2025-03-03 14:20', type: 'review' },
  { id: 'act_2', text: 'Aarav Sharma submitted a new paper "Blockchain-Based Secure Academic Certificate Verification".', timestamp: '2025-02-28 11:05', type: 'paper' },
  { id: 'act_3', text: 'Dr. Rahul Kulkarni approved paper "AI-Based Crop Disease Detection Using Deep Learning".', timestamp: '2025-02-20 16:45', type: 'approval' },
  { id: 'act_4', text: 'Aarav Sharma submitted a new paper "AI-Based Crop Disease Detection Using Deep Learning".', timestamp: '2025-02-15 09:30', type: 'paper' },
  { id: 'act_5', text: 'System Administrator registered new research category "Quantum Computing".', timestamp: '2025-02-05 10:15', type: 'admin' },
  { id: 'act_6', text: 'Aarav Sharma updated researcher profile information.', timestamp: '2025-02-02 18:00', type: 'user' }
];

// ==========================================
// INITIALIZATION
// ==========================================

/**
 * Initializes the LocalStorage database if not already populated.
 */
function normalizeApiPaper(p) {
  const email = p.authorEmail || '';
  const authorName = email.includes('@') ? email.split('@')[0].replace(/[._-]/g, ' ') : 'Researcher';
  return {
    id: String(p.id), title: p.title || '', abstract: p.abstract || '', keywords: '',
    category: p.category || '', publicationYear: String(p.publicationYear || ''),
    doi: p.doi || '', journalConference: p.venue || '', publicationType: p.paperType || 'Research Paper',
    methodology: '', technologiesUsed: '',
    authors: [{ name: authorName, institution: '', email }],
    fileName: '', fileSize: '', status: p.status || 'Pending', submittedBy: email,
    submissionDate: new Date().toISOString().split('T')[0], feedback: '', reviewedBy: '', reviewedDate: ''
  };
}
async function hydrateApiCache() {
  const api = window.rpmsApi;
  if (!api) return;
  const safe = async (task, fallback) => { try { return await task(); } catch (error) { console.warn('RPMS data refresh:', error.message); return fallback; } };
  const results = await Promise.all([
    safe(() => api.listPapers(), { papers: [] }),
    safe(() => api.listCategories(), { categories: [] }),
    safe(() => api.listResearchers(), { researchers: [] })
  ]);
  localStorage.setItem(STORAGE_KEYS.PAPERS, JSON.stringify((results[0].papers || []).map(normalizeApiPaper)));
  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify((results[1].categories || []).map(name => ({ id: name, name, description: '' }))));
  let users = results[2].researchers || [];
  let session = null;
  try { session = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || 'null'); } catch (_) {}
  if (session && session.role === 'Admin' && localStorage.getItem('rpms_api_token')) {
    const adminUsers = await safe(() => api.listUsers(), { users });
    users = adminUsers.users || users;
  }
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  let reviews = [];
  if (session && ['Faculty', 'Admin'].includes(session.role) && localStorage.getItem('rpms_api_token')) {
    const reviewData = await safe(() => api.listReviews(), { reviews: [] });
    reviews = (reviewData.reviews || []).map(r => ({
      id: String(r.id), paperId: String(r.paperId), reviewerId: r.reviewerId,
      reviewerName: 'Reviewer ' + r.reviewerId, status: r.decision,
      feedback: r.comments || '', reviewedDate: r.createdAt || ''
    }));
  }
  localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(reviews));
  localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify([]));
}
function initDatabase() {
  if (window.rpmsApi) {
    [STORAGE_KEYS.USERS, STORAGE_KEYS.PAPERS, STORAGE_KEYS.CATEGORIES, STORAGE_KEYS.REVIEWS, STORAGE_KEYS.ACTIVITY]
      .forEach(key => localStorage.setItem(key, JSON.stringify([])));
    window.rpmsDataReady = hydrateApiCache().catch(error => console.error('Unable to hydrate RPMS data from the C++ API:', error));
    return;
  }
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_USERS));
  if (!localStorage.getItem(STORAGE_KEYS.CATEGORIES)) localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
  if (!localStorage.getItem(STORAGE_KEYS.PAPERS)) localStorage.setItem(STORAGE_KEYS.PAPERS, JSON.stringify(DEFAULT_PAPERS));
  if (!localStorage.getItem(STORAGE_KEYS.REVIEWS)) localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(DEFAULT_REVIEWS));
  if (!localStorage.getItem(STORAGE_KEYS.ACTIVITY)) localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(DEFAULT_ACTIVITIES));
  window.rpmsDataReady = Promise.resolve();
}
initDatabase();

async function refreshPapersFromApi() {
  if (!window.rpmsApi) return getPapers();
  const result = await rpmsApi.listPapers(), list = (result.papers || []).map(normalizeApiPaper);
  localStorage.setItem(STORAGE_KEYS.PAPERS, JSON.stringify(list)); return list;
}
async function refreshCategoriesFromApi() {
  if (!window.rpmsApi) return getCategories();
  const result = await rpmsApi.listCategories(), list = (result.categories || []).map(name => ({ id: name, name, description: '' }));
  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(list)); return list;
}
async function refreshUsersFromApi() {
  if (!window.rpmsApi) return getUsers();
  const current = getCurrentUser();
  const result = current && current.role === 'Admin' ? await rpmsApi.listUsers() : await rpmsApi.listResearchers();
  const list = result.users || result.researchers || [];
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(list)); return list;
}

// ==========================================
// USERS CRUD
// ==========================================

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || [];
  } catch (e) {
    console.error('Error fetching users:', e);
    return [];
  }
}

function saveUser(user) {
  const users = getUsers();
  users.push(user);
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  addActivity(`${user.name} registered as a ${user.role}.`, 'user');
  return user;
}

function findUserByEmail(email) {
  const users = getUsers();
  return users.find(u => u.email.toLowerCase() === email.toLowerCase());
}

function findUserById(id) {
  const users = getUsers();
  return users.find(u => String(u.id) === String(id));
}

async function updateUser(updatedUser) {
  const users = getUsers();
  const index = users.findIndex(u => String(u.id) === String(updatedUser.id));
  if (index === -1) return null;
  const previous = users[index];
  let savedUser = { ...previous, ...updatedUser };
  if (window.rpmsApi && previous.status !== updatedUser.status) {
    await rpmsApi.updateUserStatus(updatedUser.id, updatedUser.status);
    await refreshUsersFromApi();
  } else if (window.rpmsApi && ['name', 'institution', 'department', 'designation', 'bio', 'interests'].some(key => (previous[key] || '') !== (updatedUser[key] || ''))) {
    const response = await rpmsApi.updateProfile(updatedUser);
    savedUser = response.user;
    await refreshUsersFromApi();
  } else {
    users[index] = savedUser;
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }
  const currentUser = getCurrentUser();
  const current = getUsers().find(u => String(u.id) === String(updatedUser.id));
  if (currentUser && String(currentUser.id) === String(updatedUser.id) && current) setCurrentUser({ ...currentUser, ...current, ...savedUser });
  return current || savedUser;
}

async function deleteUser(id) {
  const user = getUsers().find(u => String(u.id) === String(id));
  if (window.rpmsApi) { await rpmsApi.deleteUser(id); await refreshUsersFromApi(); await refreshPapersFromApi(); return Boolean(user); }
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(getUsers().filter(u => String(u.id) !== String(id))));
  return Boolean(user);
}

// ==========================================
// PAPERS CRUD
// ==========================================

function getPapers() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.PAPERS)) || [];
  } catch (e) {
    console.error('Error fetching papers:', e);
    return [];
  }
}

function getPaperById(id) {
  const papers = getPapers();
  return papers.find(p => String(p.id) === String(id));
}

async function savePaper(paper) {
  if (window.rpmsApi) {
    const saved = await rpmsApi.submitPaper({ title: paper.title, abstract: paper.abstract || '', category: paper.category,
      doi: paper.doi || '', publicationYear: Number(paper.publicationYear) || 0,
      venue: paper.journalConference || '', paperType: paper.publicationType || 'Research Paper' });
    await refreshPapersFromApi();
    return getPaperById(String(saved.paper.id)) || normalizeApiPaper(saved.paper);
  }
  const papers = getPapers();
  if (!paper.id) paper.id = 'paper_' + Date.now();
  papers.unshift(paper);
  localStorage.setItem(STORAGE_KEYS.PAPERS, JSON.stringify(papers));
  return paper;
}

async function updatePaper(updatedPaper) {
  const papers = getPapers();
  const index = papers.findIndex(p => String(p.id) === String(updatedPaper.id));
  if (index === -1) return null;
  const previous = papers[index];
  if (window.rpmsApi) {
    if (previous.status !== updatedPaper.status && previous.title === updatedPaper.title && previous.category === updatedPaper.category) {
      await rpmsApi.updatePaperStatus(updatedPaper.id, updatedPaper.status);
    } else {
      await rpmsApi.updatePaper(updatedPaper.id, { title: updatedPaper.title, abstract: updatedPaper.abstract || '',
        category: updatedPaper.category, doi: updatedPaper.doi || '', publicationYear: Number(updatedPaper.publicationYear) || 0,
        venue: updatedPaper.journalConference || '', paperType: updatedPaper.publicationType || 'Research Paper' });
    }
    await refreshPapersFromApi();
    return getPaperById(String(updatedPaper.id));
  }
  papers[index] = { ...previous, ...updatedPaper };
  localStorage.setItem(STORAGE_KEYS.PAPERS, JSON.stringify(papers));
  return papers[index];
}

async function deletePaper(id) {
  const paper = getPaperById(String(id));
  if (window.rpmsApi) { await rpmsApi.deletePaper(id); await refreshPapersFromApi(); return Boolean(paper); }
  localStorage.setItem(STORAGE_KEYS.PAPERS, JSON.stringify(getPapers().filter(p => String(p.id) !== String(id))));
  return Boolean(paper);
}

// ==========================================
// CATEGORIES CRUD
// ==========================================

function getCategories() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.CATEGORIES)) || [];
  } catch (e) {
    console.error('Error fetching categories:', e);
    return [];
  }
}

async function saveCategory(cat) {
  if (window.rpmsApi) { await rpmsApi.addCategory(cat.name); await refreshCategoriesFromApi(); return getCategories().find(c => c.name === cat.name) || cat; }
  const categories = getCategories(); if (!cat.id) cat.id = 'cat_' + Date.now(); categories.push(cat);
  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories)); return cat;
}

async function updateCategory(updatedCat) {
  const categories = getCategories();
  const index = categories.findIndex(c => String(c.id) === String(updatedCat.id));
  if (index === -1) return null;
  if (window.rpmsApi) { await rpmsApi.renameCategory(categories[index].name, updatedCat.name); await refreshCategoriesFromApi(); return getCategories().find(c => c.name === updatedCat.name) || null; }
  categories[index] = { ...categories[index], ...updatedCat }; localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories)); return categories[index];
}

async function deleteCategory(id) {
  const categories = getCategories(), cat = categories.find(c => String(c.id) === String(id));
  if (window.rpmsApi) { if (!cat) return false; await rpmsApi.deleteCategory(cat.name); await refreshCategoriesFromApi(); return true; }
  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories.filter(c => String(c.id) !== String(id)))); return Boolean(cat);
}

// ==========================================
// REVIEWS CRUD
// ==========================================

function getReviews() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.REVIEWS)) || [];
  } catch (e) {
    console.error('Error fetching reviews:', e);
    return [];
  }
}

async function saveReview(review) {
  if (window.rpmsApi) {
    await rpmsApi.submitReview(review.paperId, review.status, review.feedback || '');
    await refreshPapersFromApi();
    const response = await rpmsApi.listReviews();
    const list = (response.reviews || []).map(r => ({ id: String(r.id), paperId: String(r.paperId), reviewerId: r.reviewerId,
      reviewerName: 'Reviewer ' + r.reviewerId, status: r.decision, feedback: r.comments || '', reviewedDate: r.createdAt || '' }));
    localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(list));
    return review;
  }
  const list = getReviews();
  if (!review.id) review.id = 'rev_' + Date.now();
  list.unshift(review);
  localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(list));
  const paper = getPaperById(review.paperId);
  if (paper) { paper.status = review.status; paper.feedback = review.feedback; paper.reviewedBy = review.reviewerName; paper.reviewedDate = review.reviewedDate; await updatePaper(paper); }
  return review;
}

// ==========================================
// ACTIVITY LOGS
// ==========================================

function getActivities() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITY)) || [];
  } catch (e) {
    console.error('Error fetching activities:', e);
    return [];
  }
}

function addActivity(text, type = 'info') {
  const activities = getActivities();
  const now = new Date();
  const dateStr = now.toISOString().replace('T', ' ').substring(0, 16);
  const newActivity = {
    id: 'act_' + Date.now(),
    text,
    type,
    timestamp: dateStr
  };
  activities.unshift(newActivity);
  // Keep only the most recent 40 items
  if (activities.length > 40) {
    activities.length = 40;
  }
  localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(activities));
  return newActivity;
}

// ==========================================
// RESEARCH INSIGHTS & STATS CALCULATOR
// ==========================================

/**
 * Calculates real-time system metrics dynamically from stored data.
 */
function getSystemStats() {
  const papers = getPapers();
  const users = getUsers();
  const categories = getCategories();

  const totalPapers = papers.length;
  const approvedPapers = papers.filter(p => p.status === 'Approved').length;
  const pendingPapers = papers.filter(p => p.status === 'Pending').length;
  const underReviewPapers = papers.filter(p => p.status === 'Under Review').length;
  const rejectedPapers = papers.filter(p => p.status === 'Rejected').length;

  const totalResearchers = users.filter(u => u.role !== 'Admin').length;
  const totalCategories = categories.length;

  const approvalRate = totalPapers > 0 
    ? Math.round((approvedPapers / totalPapers) * 100) 
    : 0;

  return {
    totalPapers,
    approvedPapers,
    pendingPapers,
    underReviewPapers,
    rejectedPapers,
    totalResearchers,
    totalCategories,
    approvalRate
  };
}

/**
 * Generates advanced analytical insights from research paper data.
 */
function getResearchInsights() {
  const papers = getPapers();
  const stats = getSystemStats();

  if (papers.length === 0) {
    return {
      topCategory: 'None',
      topCategoryCount: 0,
      topResearcher: 'None',
      topResearcherCount: 0,
      approvedCount: 0,
      pendingCount: 0,
      latestYear: 'N/A'
    };
  }

  // 1. Most Researched Category
  const categoryCounts = {};
  papers.forEach(p => {
    categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
  });
  let topCategory = 'General';
  let topCategoryCount = 0;
  Object.keys(categoryCounts).forEach(cat => {
    if (categoryCounts[cat] > topCategoryCount) {
      topCategoryCount = categoryCounts[cat];
      topCategory = cat;
    }
  });

  // 2. Most Active Researcher (by primary author or authors array)
  const authorCounts = {};
  papers.forEach(p => {
    if (Array.isArray(p.authors)) {
      p.authors.forEach(a => {
        if (a.name) {
          authorCounts[a.name] = (authorCounts[a.name] || 0) + 1;
        }
      });
    }
  });
  let topResearcher = 'N/A';
  let topResearcherCount = 0;
  Object.keys(authorCounts).forEach(author => {
    if (authorCounts[author] > topResearcherCount) {
      topResearcherCount = authorCounts[author];
      topResearcher = author;
    }
  });

  // 3. Most Recent Publication Year
  const years = papers.map(p => parseInt(p.publicationYear) || 0).filter(y => y > 0);
  const latestYear = years.length > 0 ? Math.max(...years) : new Date().getFullYear();

  return {
    topCategory,
    topCategoryCount,
    topResearcher,
    topResearcherCount,
    approvedCount: stats.approvedPapers,
    pendingCount: stats.pendingPapers + stats.underReviewPapers,
    latestYear
  };
}

/**
 * Restores sample seed data back to factory default.
 */
async function resetDatabaseToDefault() {
  if (window.rpmsApi) { await rpmsApi.resetRepository(); await hydrateApiCache(); return; }
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_USERS));
  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
  localStorage.setItem(STORAGE_KEYS.PAPERS, JSON.stringify(DEFAULT_PAPERS));
  localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(DEFAULT_REVIEWS));
  localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(DEFAULT_ACTIVITIES));
}
