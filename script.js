const filters = document.querySelectorAll('.filter');
const projectGrid = document.querySelector('.project-grid');

const adminPanel = document.querySelector('.admin-panel');
const adminStatus = document.querySelector('.admin-status');
const supabaseConfig = window.NEXA_SUPABASE || {};
const supabaseReady = Boolean(supabaseConfig.url && supabaseConfig.anonKey && window.supabase);
const supabaseClient = supabaseReady ? window.supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey) : null;

const defaultContent = {
  heroTitle: 'نحوّل الأفكار إلى أثر.',
  heroIntro: 'نبني تطبيقات وتجارب رقمية لها حضورها. من أول سطر في الفكرة، إلى اللحظة التي يستخدمها فيها الناس كل يوم.',
  aboutText: 'The Store مختبر صغير، فضولي، يعمل بين التصميم والتقنية. نساعد الفرق الطموحة على تحويل الرؤية المعقدة إلى منتجات واضحة، جميلة، ومفيدة.',
  contactEmail: 'fouadmohsen136@gmail.com'
};
const setStatus = (message, isError = false) => {
  adminStatus.textContent = message;
  adminStatus.classList.toggle('is-error', isError);
};
const applyFilter = (category) => {
  projectGrid.querySelectorAll('.project-card').forEach((project) => {
    project.classList.toggle('is-hidden', category !== 'all' && project.dataset.category !== category);
  });
};
const renderSavedProject = (savedProject, label = 'NEW') => {
  const project = document.createElement('article');
  project.className = 'project-card project-new reveal visible';
  project.dataset.category = savedProject.category;
  const image = document.createElement('div');
  image.className = 'project-image image-uploaded';
  if (savedProject.cover_url) image.style.backgroundImage = `url(${savedProject.cover_url})`;
  image.innerHTML = `<span class="image-index">${label}</span>`;
  const meta = document.createElement('div');
  meta.className = 'project-meta';
  const details = document.createElement('div');
  const title = document.createElement('h3');
  title.textContent = savedProject.title;
  const description = document.createElement('p');
  description.textContent = `${savedProject.description}${savedProject.file_name ? ` · ${savedProject.file_name}` : ''}`;
  details.append(title, description);
  const arrow = savedProject.file_url ? document.createElement('a') : document.createElement('span');
  arrow.className = 'project-arrow';
  arrow.textContent = '↗';
  if (savedProject.file_url) {
    arrow.href = savedProject.file_url;
    arrow.target = '_blank';
    arrow.rel = 'noopener';
  }
  meta.append(details, arrow);
  project.append(image, meta);
  projectGrid.prepend(project);
};
const updatePage = (content) => {
  const merged = { ...defaultContent, ...content };
  document.querySelector('h1').textContent = merged.heroTitle;
  document.querySelector('.hero-intro').textContent = merged.heroIntro;
  document.querySelector('.about-content p:not(.eyebrow)').textContent = merged.aboutText;
  document.querySelectorAll('.contact-email').forEach((email) => {
    email.textContent = `${merged.contactEmail} ↗`;
    email.href = `mailto:${merged.contactEmail}`;
  });
  const form = document.querySelector('.content-form');
  if (form) Object.entries(merged).forEach(([key, value]) => { if (form.elements[key]) form.elements[key].value = value; });
};
const loadPublicData = async () => {
  if (!supabaseReady) {
    try {
  const [contentResponse, projectsResponse] = await Promise.all([fetch('/api/content'), fetch('/api/projects')]);
  if (contentResponse.ok) updatePage(await contentResponse.json());
  if (projectsResponse.ok) (await projectsResponse.json()).forEach((project) => renderSavedProject(project, 'LOCAL'));
    } catch { }
    return;
  }
  const [{ data: contentRows }, { data: projects }] = await Promise.all([
    supabaseClient.from('site_content').select('content').eq('id', 1).maybeSingle(),
    supabaseClient.from('projects').select('*').order('created_at', { ascending: false })
  ]);
  updatePage(contentRows?.content || {});
  (projects || []).forEach((project) => renderSavedProject(project, 'NEW'));
};
const uploadFile = async (file) => {
  if (!file) return null;
  const filePath = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
  const { error } = await supabaseClient.storage.from(supabaseConfig.bucket || 'projects').upload(filePath, file);
  if (error) throw error;
  const { data } = supabaseClient.storage.from(supabaseConfig.bucket || 'projects').getPublicUrl(filePath);
  return { url: data.publicUrl, name: file.name };
};
filters.forEach((filter) => filter.addEventListener('click', () => {
  filters.forEach((item) => item.classList.remove('active'));
  filter.classList.add('active');
  applyFilter(filter.dataset.filter);
}));
const revealObserver = new IntersectionObserver((entries) => entries.forEach((entry) => {
  if (entry.isIntersecting) {
    entry.target.classList.add('visible');
    revealObserver.unobserve(entry.target);
  }
}), { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));

document.querySelector('.load-more').addEventListener('click', (event) => {
  event.currentTarget.innerHTML = 'هذه هي الحكاية كاملة <span>✦</span>';
  event.currentTarget.disabled = true;
});

const menuToggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.main-nav');
menuToggle.addEventListener('click', () => {
  nav.classList.toggle('mobile-open');
});
